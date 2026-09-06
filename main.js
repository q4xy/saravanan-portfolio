(function(){
  "use strict";

  // Lock scroll immediately
  document.body.style.overflow = 'hidden';

  const state = {
    isTouch: window.matchMedia('(pointer: coarse)').matches,
    mouseX: window.innerWidth / 2, mouseY: window.innerHeight / 2,
    scrollProgress: 0,
    tabVisible: true
  };

  document.addEventListener('visibilitychange', () => { state.tabVisible = !document.hidden; });
  if(!state.isTouch) {
    window.addEventListener('mousemove', (e) => {
      state.mouseX = e.clientX; state.mouseY = e.clientY;
    });
  }

  let lastFpsTime = performance.now();
  let frameCount = 0;
  
  const mCanvas = document.getElementById('matrix-canvas');
  const mCtx = mCanvas.getContext('2d');
  let mw = window.innerWidth, mh = window.innerHeight;
  const mChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZQ4XY<>{}[]'.split('');
  const mFontSize = 14;
  let mCols = Math.floor(mw / mFontSize);
  let mDrops = Array(mCols).fill(1);
  let matrixLastUpdate = 0;
  
  const hpCanvas = document.getElementById('particle-canvas');
  const hpCtx = hpCanvas.getContext('2d');
  let hpw = hpCanvas.offsetWidth, hph = hpCanvas.offsetHeight;
  const hpCount = window.innerWidth < 768 ? 30 : 65;
  const hpParticles = Array.from({length: hpCount}, () => ({
    x: Math.random()*(hpw||1000), y: Math.random()*(hph||800), r: Math.random()*1.4+0.4, 
    vx: (Math.random()-0.5)*0.2, vy: (Math.random()-0.5)*0.2, alpha: Math.random()*0.4+0.1
  }));

  const core = document.getElementById('cursor-core');
  const ring = document.getElementById('cursor-ring');
  const trail = document.getElementById('cursor-trail');
  let ringX = state.mouseX, ringY = state.mouseY;
  let trailX = state.mouseX, trailY = state.mouseY;

  function resizeCanvases() {
    mw = mCanvas.width = window.innerWidth;
    mh = mCanvas.height = window.innerHeight;
    mCols = Math.floor(mw / mFontSize);
    mDrops = Array(mCols).fill(1);
    
    if(hpCanvas) {
      hpw = hpCanvas.width = document.getElementById('hero').offsetWidth;
      hph = hpCanvas.height = document.getElementById('hero').offsetHeight;
    }
  }
  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();

  function getActiveColor() {
    if (document.body.classList.contains('green-theme')) return '#00ff7b';
    if (document.body.classList.contains('cyan-theme')) return '#00f0ff';
    if (document.body.classList.contains('amber-theme')) return '#ffb300';
    return '#ff2d2d';
  }

  function getActiveRgb() {
    if (document.body.classList.contains('green-theme')) return '0,255,123';
    if (document.body.classList.contains('cyan-theme')) return '0,240,255';
    if (document.body.classList.contains('amber-theme')) return '255,179,0';
    return '255,45,45';
  }

  function masterRender(timestamp) {
    frameCount++;
    if (timestamp - lastFpsTime >= 1000) {
      const hudFps = document.getElementById('hud-fps');
      if (hudFps) hudFps.textContent = frameCount + ' FPS';
      frameCount = 0;
      lastFpsTime = timestamp;
      const hudTime = document.getElementById('hud-time');
      const now = new Date();
      if(hudTime) hudTime.textContent = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')+':'+String(now.getSeconds()).padStart(2,'0');
    }

    if (!state.isTouch) {
      // Core tracks the raw pointer 1:1 — zero latency for precise feedback
      core.style.transform = `translate(${state.mouseX}px, ${state.mouseY}px) translate(-50%, -50%)`;
      // Ring uses a snappier lerp so it reads as "smoothed", not "delayed"
      ringX += (state.mouseX - ringX) * 0.42;
      ringY += (state.mouseY - ringY) * 0.42;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      trailX += (state.mouseX - trailX) * 0.6;
      trailY += (state.mouseY - trailY) * 0.6;
      trail.style.transform = `translate(${trailX}px, ${trailY}px) translate(-50%, -50%)`;
    }

    if (state.tabVisible) {
      // Only the active background mode should actually compute each frame —
      // the other modes stay fully paused, not just hidden behind opacity:0.
      const matrixModeActive = !window.__q4xyBgMode || window.__q4xyBgMode.current === 'matrix';
      // Shared 0..1 focus factor — smoothly eased down while the 3D Tech
      // Stack section is in view (see bgFocusController), back to 1 elsewhere.
      const bgFocus = (window.__q4xyBgFocus && typeof window.__q4xyBgFocus.value === 'number') ? window.__q4xyBgFocus.value : 1;
      const matrixInterval = 40 / Math.max(0.35, bgFocus); // slower fall = lower movement intensity near Tech Stack
      if (matrixModeActive && timestamp - matrixLastUpdate > matrixInterval) {
        mCtx.fillStyle = 'rgba(5, 5, 5, 0.05)';
        mCtx.fillRect(0, 0, mw, mh);

        const activeColor = getActiveColor();
        const isDefaultTheme = !document.body.classList.contains('green-theme') && !document.body.classList.contains('cyan-theme') && !document.body.classList.contains('amber-theme');
        mCtx.font = mFontSize + 'px monospace';
        const thinOut = bgFocus < 0.5; // fewer active columns = lower density near Tech Stack
        for(let i = 0; i < mDrops.length; i++) {
          if(thinOut && (i % 2 === 1)) continue;
          const text = mChars[Math.floor(Math.random() * mChars.length)];
          // Roughly one in five columns drifts into purple for depth, default theme only
          mCtx.fillStyle = (isDefaultTheme && i % 5 === 0) ? '#9b30ff' : activeColor;
          mCtx.fillText(text, i * mFontSize, mDrops[i] * mFontSize);
          if(mDrops[i] * mFontSize > mh && Math.random() > 0.975) mDrops[i] = 0;
          mDrops[i]++;
        }
        matrixLastUpdate = timestamp;
      }

      if (hpw && hph) {
        hpCtx.clearRect(0,0, hpw, hph);
        const lineColor = getActiveRgb();
        const dotColor = getActiveRgb();
        
        for(let i = 0; i < hpParticles.length; i++){
          for(let j = i+1; j < hpParticles.length; j++){
            const dx = hpParticles[i].x - hpParticles[j].x, dy = hpParticles[i].y - hpParticles[j].y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist < 120){
              hpCtx.beginPath(); hpCtx.moveTo(hpParticles[i].x, hpParticles[i].y); hpCtx.lineTo(hpParticles[j].x, hpParticles[j].y);
              hpCtx.strokeStyle = 'rgba(' + lineColor + ',' + ((1-dist/120)*0.08) + ')'; hpCtx.lineWidth = 0.5; hpCtx.stroke();
            }
          }
        }
        hpParticles.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if(p.x < 0) p.x = hpw; if(p.x > hpw) p.x = 0;
          if(p.y < 0) p.y = hph; if(p.y > hph) p.y = 0;
          hpCtx.beginPath(); hpCtx.arc(p.x, p.y, p.r, 0, Math.PI*2);
          hpCtx.fillStyle = 'rgba(' + dotColor + ',' + p.alpha + ')'; hpCtx.fill();
        });
      }
    }

    requestAnimationFrame(masterRender);
  }
  requestAnimationFrame(masterRender);

  // THEME TOGGLE LOGIC & MENU
  const themeBtn = document.getElementById('theme-toggle-btn');
  const themeMenu = document.getElementById('theme-menu');
  
  themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    themeMenu.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!themeMenu.contains(e.target) && e.target !== themeBtn) {
      themeMenu.classList.remove('show');
    }
  });

  document.querySelectorAll('.theme-menu button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.classList.remove('green-theme', 'cyan-theme', 'amber-theme');
      const theme = btn.dataset.theme;
      if (theme !== 'red') {
        document.body.classList.add(theme + '-theme');
      }
      themeMenu.classList.remove('show');
    });
  });

  /* ===================================================================
     SCROLL DIRECTOR — cinematic reveals, staggers, section sync
     =================================================================== */
  (function scrollDirector(){
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function applyStagger(container, baseDelay, step){
      if(!container) return;
      const items = [...container.children].filter(el => !el.classList.contains('timeline-progress-line'));
      items.forEach((child, i) => {
        child.style.setProperty('--scroll-delay', (baseDelay + i * step) + 'ms');
      });
    }

    document.querySelectorAll('[data-scroll-delay]').forEach(el => {
      el.style.setProperty('--scroll-delay', el.dataset.scrollDelay + 'ms');
    });

    document.querySelectorAll('[data-scroll-stagger]').forEach(el => {
      applyStagger(
        el,
        parseInt(el.dataset.staggerBase || '80', 10),
        parseInt(el.dataset.staggerStep || '65', 10)
      );
    });

    const timelineEl = document.getElementById('timeline-container');
    if(timelineEl){
      applyStagger(timelineEl, 140, 95);
    }

    const revealOptions = { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 };
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, revealOptions);

    document.querySelectorAll('[data-scroll], [data-scroll-children], [data-scroll-stagger]').forEach(el => {
      if(reducedMotion){
        el.classList.add('in-view');
      } else {
        revealObserver.observe(el);
      }
    });

    const sections = document.querySelectorAll('[data-parallax-section]');
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('section-in-view');
          document.body.setAttribute('data-active-section', entry.target.id || '');
        }
      });
    }, { threshold: 0.22, rootMargin: '-5% 0px -5% 0px' });
    sections.forEach(s => sectionObserver.observe(s));

    // Throttled: recompute only on scroll/resize (at most once per animation
    // frame via rAF-debounce) instead of doing full work every single frame
    // regardless of whether the page has scrolled.
    const parallaxLayers = document.querySelectorAll('[data-parallax-layer]');
    let parallaxRaf = 0;
    function updateParallaxLayers(){
      parallaxRaf = 0;
      if(reducedMotion) return;
      parallaxLayers.forEach(layer => {
        const section = layer.closest('[data-parallax-section]');
        if(!section) return;
        const rect = section.getBoundingClientRect();
        const speed = parseFloat(layer.dataset.speed || '0.1');
        const centerOffset = rect.top + rect.height * 0.5 - window.innerHeight * 0.5;
        layer.style.transform = 'translate3d(0,' + (centerOffset * speed) + 'px,0)';
      });
    }
    function requestParallaxUpdate(){
      if(!parallaxRaf) parallaxRaf = requestAnimationFrame(updateParallaxLayers);
    }
    if(!reducedMotion && parallaxLayers.length){
      window.addEventListener('scroll', requestParallaxUpdate, { passive: true });
      window.addEventListener('resize', requestParallaxUpdate, { passive: true });
    }
    requestParallaxUpdate();
  })();

  /* ===================================================================
     CONTINUOUS Q4XY SECTION DEPTH
     A small scroll-linked director for the existing sections. It only
     writes transform/opacity custom properties and never captures scroll.
     =================================================================== */
  (function sectionDepthDirector(){
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hero = document.getElementById('hero');
    const about = document.getElementById('about');
    const tech = document.getElementById('tech');
    const projects = document.getElementById('projects');
    const contact = document.getElementById('contact');
    if(reducedMotion || !hero || !about || !tech || !projects || !contact) return;

    let targetY = window.scrollY;
    let currentY = targetY;
    let raf = 0;
    let running = false;
    let frameSkip = false;

    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const smooth = (value) => {
      const t = clamp(value);
      return t * t * (3 - 2 * t);
    };
    const sectionProgress = (section, start = 0.86, end = 0.18) => {
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight;
      return clamp((viewport * start - rect.top) / Math.max(1, rect.height - viewport * end));
    };
    const sectionFocus = (rect) => {
      const center = rect.top + rect.height * 0.5;
      const distance = Math.abs(center - window.innerHeight * 0.5);
      return smooth(1 - clamp(distance / Math.max(1, window.innerHeight * 1.05)));
    };
    const sectionLeave = (rect) =>
      smooth(clamp((-rect.bottom) / Math.max(1, window.innerHeight * 0.72)));

    function writeDepth(){
      const y = currentY;
      const viewport = window.innerHeight;
      const heroProgress = smooth(clamp(y / Math.max(1, hero.offsetHeight - viewport)));
      const aboutRect = about.getBoundingClientRect();
      const techRect = tech.getBoundingClientRect();
      const projectsRect = projects.getBoundingClientRect();
      const contactRect = contact.getBoundingClientRect();

      const aboutFocus = sectionFocus(aboutRect);
      const techFocus = sectionFocus(techRect);
      const projectsFocus = sectionFocus(projectsRect);
      const contactFocus = sectionFocus(contactRect);

      hero.style.setProperty('--hero-progress', heroProgress.toFixed(4));
      about.style.setProperty('--about-focus', aboutFocus.toFixed(4));
      about.style.setProperty('--about-leave', sectionLeave(aboutRect).toFixed(4));
      tech.style.setProperty('--tech-focus', techFocus.toFixed(4));
      tech.style.setProperty('--tech-leave', sectionLeave(techRect).toFixed(4));
      projects.style.setProperty('--projects-focus', projectsFocus.toFixed(4));
      projects.style.setProperty('--projects-leave', sectionLeave(projectsRect).toFixed(4));
      contact.style.setProperty('--contact-focus', contactFocus.toFixed(4));
      contact.style.setProperty('--contact-leave', sectionLeave(contactRect).toFixed(4));

      // Keep the background layers on a slightly different depth plane.
      document.documentElement.style.setProperty(
        '--q4xy-scroll-depth',
        (heroProgress * 0.5 + (1 - techFocus) * 0.25 + (1 - projectsFocus) * 0.25).toFixed(4)
      );

      const heroRect = hero.getBoundingClientRect();
      const nearViewport = [heroRect, aboutRect, techRect, projectsRect, contactRect]
        .some(rect => rect.bottom > -viewport * 0.35 && rect.top < viewport * 1.35);
      if(!nearViewport && Math.abs(targetY - currentY) < 0.5) {
        running = false;
        raf = 0;
        return;
      }
      raf = window.requestAnimationFrame(render);
    }

    function render(){
      raf = 0;
      currentY += (targetY - currentY) * 0.14;
      if(Math.abs(targetY - currentY) < 0.1) currentY = targetY;
      // Throttle: only do the full read (5x getBoundingClientRect) + write
      // (9x custom-property writes) every other frame — halves this
      // system's cost while staying smooth, since it's a slow-easing
      // depth effect where 30fps vs 60fps recalculation is imperceptible.
      frameSkip = !frameSkip;
      if(frameSkip){ raf = window.requestAnimationFrame(render); return; }
      writeDepth();
    }

    function onScroll(){
      targetY = window.scrollY;
      if(!running){
        running = true;
        if(!raf) raf = window.requestAnimationFrame(render);
      }
    }

    function onResize(){
      targetY = window.scrollY;
      currentY = targetY;
      writeDepth();
    }

    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onResize, {passive:true});
    onResize();
  })();

  const progressBar = document.getElementById('scroll-progress');
  const velocityBar = document.getElementById('velocity-bar');
  const velocityFill = document.getElementById('velocity-fill');
  const timelineProgress = document.getElementById('timeline-progress');
  const timelineContainer = document.getElementById('timeline-container');
  
  let lastScrollY = window.scrollY;
  let isScrolling;
  let smoothProgress = 0;

  window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    state.scrollProgress = height > 0 ? winScroll / height : 0;
    if(progressBar){
      smoothProgress += (scrolled - smoothProgress) * 0.18;
      progressBar.style.width = smoothProgress + '%';
    }

    if (!state.isTouch && velocityBar && velocityFill) {
      velocityBar.classList.add('visible');
      let currentScrollY = window.scrollY;
      let deltaY = Math.abs(currentScrollY - lastScrollY);
      let vPct = Math.min(100, deltaY * 2);
      velocityFill.style.height = vPct + '%';
      lastScrollY = currentScrollY;
      clearTimeout(isScrolling);
      isScrolling = setTimeout(() => { velocityBar.classList.remove('visible'); velocityFill.style.height = '0%'; }, 150);
    }

    if(timelineContainer && timelineProgress) {
      const rect = timelineContainer.getBoundingClientRect();
      const windowH = window.innerHeight;
      if(rect.top < windowH && rect.bottom > 0) {
        let progress = ((windowH / 2) - rect.top) / rect.height * 100;
        progress = Math.max(0, Math.min(100, progress));
        timelineProgress.style.height = progress + '%';
      }
    }
  });

  if (!state.isTouch) {
    document.querySelectorAll('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${relX * 0.2}px, ${relY * 0.3}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });

    document.querySelectorAll('[data-tilt]').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const multiplier = 10;
        const xRotate = multiplier * ((y - rect.height / 2) / rect.height);
        const yRotate = -multiplier * ((x - rect.width / 2) / rect.width);
        el.style.transform = `perspective(1000px) rotateX(${xRotate}deg) rotateY(${yRotate}deg)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)'; });
    });

    document.querySelectorAll('[data-cursor-light]').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        el.style.setProperty('--my', `${e.clientY - rect.top}px`);
      });
    });

    document.querySelectorAll('[data-ripple]').forEach(btn => {
      btn.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const circle = document.createElement('span');
        const diameter = Math.max(rect.width, rect.height);
        const radius = diameter / 2;
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - rect.left - radius}px`;
        circle.style.top = `${e.clientY - rect.top - radius}px`;
        circle.classList.add('ripple');
        this.appendChild(circle);
        setTimeout(() => circle.remove(), 600);
      });
    });

    document.addEventListener('mousedown', (e) => {
      document.body.classList.add('cursor-click');
      const ripple = document.createElement('div');
      ripple.className = 'cursor-ripple-ring';
      ripple.style.left = e.clientX + 'px';
      ripple.style.top = e.clientY + 'px';
      ripple.style.width = '20px';
      ripple.style.height = '20px';
      document.body.appendChild(ripple);
      requestAnimationFrame(() => ripple.classList.add('active'));
      setTimeout(() => ripple.remove(), 550);
    });
    document.addEventListener('mouseup', () => document.body.classList.remove('cursor-click'));

    document.querySelectorAll('a, button, [data-magnetic], input, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
  }

  const cyberLayer = document.getElementById('cyber-ambient-layer');
  const cyberWords = ['101101', 'ESP32', 'Arduino', 'PID', 'sudo', 'git', 'ping', 'ssh', 'Nmap', '0xA4F2', 'root', 'sys', 'kali'];
  if (cyberLayer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i = 0; i < 15; i++) {
      const span = document.createElement('span');
      span.className = 'cyber-word';
      span.innerText = cyberWords[Math.floor(Math.random() * cyberWords.length)];
      span.style.left = `${Math.random() * 100}%`;
      span.style.animationDuration = `${Math.random() * 20 + 20}s`;
      span.style.animationDelay = `${Math.random() * -30}s`;
      span.style.fontSize = `${Math.random() * 10 + 10}px`;
      cyberLayer.appendChild(span);
    }
  }

  const cmdOverlay = document.getElementById('q4xy-cmd-overlay');
  const cmdClose = document.getElementById('cmd-close');
  const cmdInput = document.getElementById('cmd-input');
  const cmdOutputWrap = document.getElementById('cmd-output-wrapper');
  const cmdBoot = document.getElementById('cmd-boot');
  const cmdBody = document.getElementById('cmd-body');
  const cmdBootBar = document.getElementById('cmd-boot-bar-fill');
  const cmdInputLine = document.querySelector('.cmd-input-line');

  let cmdHistory = [];
  let historyIndex = -1;
  let bootTimers = [];

  function clearBootTimers(){ bootTimers.forEach(t => clearTimeout(t)); bootTimers = []; }

  function playCmdBoot() {
    clearBootTimers();
    cmdBoot.classList.remove('hide');
    cmdBody.classList.remove('ready');
    if (cmdInputLine) cmdInputLine.classList.add('disabled');
    cmdBootBar.style.width = '0%';
    const lines = [0, 1, 2, 3].map(i => document.getElementById(`cmd-boot-line-${i}`));
    lines.forEach(l => l && l.classList.remove('show'));
    lines.forEach((line, i) => {
      bootTimers.push(setTimeout(() => { if (line) line.classList.add('show'); }, 160 + i * 260));
    });
    bootTimers.push(setTimeout(() => { cmdBootBar.style.width = '100%'; }, 260));
    bootTimers.push(setTimeout(() => {
      cmdBoot.classList.add('hide');
      cmdBody.classList.add('ready');
      if (cmdInputLine) cmdInputLine.classList.remove('disabled');
      cmdInput.focus();
    }, 160 + lines.length * 260 + 260));
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      const opening = !cmdOverlay.classList.contains('active');
      cmdOverlay.classList.toggle('active');
      if (opening) {
        playCmdBoot();
      } else {
        clearBootTimers();
      }
    }
    if (e.key === 'Escape' && cmdOverlay.classList.contains('active')) {
      cmdOverlay.classList.remove('active');
      clearBootTimers();
    }
  });

  if (cmdClose) {
    cmdClose.addEventListener('click', () => { cmdOverlay.classList.remove('active'); clearBootTimers(); });
  }

  if (cmdInput) {
    cmdInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        const val = this.value.trim();
        if (val) {
          cmdHistory.push(val);
          historyIndex = cmdHistory.length;
          printCmd(`<span class="prompt-prefix">q4xy@sys:~$</span> ${val}`, 'sys');
          processCommand(val.toLowerCase());
        }
        this.value = '';
        scrollToBottom();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) {
          historyIndex--;
          this.value = cmdHistory[historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < cmdHistory.length - 1) {
          historyIndex++;
          this.value = cmdHistory[historyIndex];
        } else {
          historyIndex = cmdHistory.length;
          this.value = '';
        }
      }
    });
  }

  function printCmd(text, type = '') {
    const div = document.createElement('div');
    div.className = `output ${type}`;
    div.innerHTML = text;
    cmdOutputWrap.appendChild(div);
    requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add('show')));
  }

  function scrollToBottom() {
    const body = document.getElementById('cmd-body');
    body.scrollTop = body.scrollHeight;
  }

  function processCommand(cmd) {
    const args = cmd.split(' ');
    const command = args[0];
    
    switch(command) {
      case 'help':
        printCmd("AVAILABLE COMMANDS:");
        printCmd("  whoami   - Display current user identity");
        printCmd("  projects - List current operations");
        printCmd("  skills   - Display technical arsenal");
        printCmd("  clear    - Clear terminal output");
        printCmd("  exit     - Terminate session");
        break;
      case 'whoami':
        printCmd("SARAVANAN [Alias: Q4XY]");
        printCmd("Grade 11 | IoT & Robotics | Game Mechanics");
        break;
      case 'projects':
        printCmd("Active Operations:");
        printCmd(" > IoT & Robotics");
        printCmd(" > Game Mechanics Frontend");
        printCmd(" > Learning & Experimentation (AI, Security, Embedded Systems)");
        break;
      case 'skills':
        printCmd("Stack: HTML, CSS, JS, Python, C++, Arduino, ESP32, Raspberry Pi, Unity, Unreal Engine");
        break;
      case 'clear':
        cmdOutputWrap.innerHTML = '';
        break;
      case 'exit':
        printCmd("Terminating connection...");
        setTimeout(() => {
          cmdOverlay.classList.remove('active');
          cmdOutputWrap.innerHTML = '<div class="output sys show">_ SECURE TUNNEL ESTABLISHED</div><div class="output success show">WELCOME SARAVANAN. ALL SYSTEMS NOMINAL.</div><div class="output show">Type \'help\' to see available commands.</div>';
        }, 500);
        break;
      case 'sudo':
        printCmd("Nice try. This incident will be reported.", "sys");
        break;
      default:
        printCmd(`q4xy: command not found: ${command}`);
    }
  }

  /* ===================================================================
     SOUND ENGINE — tiny WebAudio beep synth, no external files
     =================================================================== */
  const SoundEngine = (function(){
    let ctx = null;
    let enabled = localStorage.getItem('q4xy_sound') === 'on';
    function getCtx(){
      if(!ctx){
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch(e){ return null; }
      }
      return ctx;
    }
    function beep(freq, dur, type, vol){
      if(!enabled) return;
      const c = getCtx();
      if(!c) return;
      if(c.state === 'suspended') c.resume();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || 'square';
      osc.frequency.value = freq;
      gain.gain.value = (vol !== undefined ? vol : 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + dur);
    }
    function sweep(freqStart, freqEnd, dur, vol){
      if(!enabled) return;
      const c = getCtx();
      if(!c) return;
      if(c.state === 'suspended') c.resume();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqStart, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), c.currentTime + dur);
      gain.gain.value = (vol !== undefined ? vol : 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + dur);
    }
    return {
      isEnabled: () => enabled,
      setEnabled(v){ enabled = v; localStorage.setItem('q4xy_sound', v ? 'on' : 'off'); },
      key(){ beep(440 + Math.random()*80, 0.04, 'square', 0.03); },
      error(){ beep(140, 0.18, 'sawtooth', 0.05); },
      success(){ beep(660, 0.09, 'square', 0.05); setTimeout(() => beep(880, 0.12, 'square', 0.05), 90); },
      unlock(){ beep(520, 0.08, 'triangle', 0.06); setTimeout(() => beep(780, 0.08, 'triangle', 0.06), 80); setTimeout(() => beep(1040, 0.14, 'triangle', 0.06), 160); },
      click(){ beep(300, 0.05, 'sine', 0.04); },
      whoosh(){ sweep(1500 + Math.random()*300, 200, 0.22, 0.04); }
    };
  })();

  const soundBtn = document.getElementById('sound-toggle-btn');
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');
  function refreshSoundIcon(){
    const on = SoundEngine.isEnabled();
    soundBtn.classList.toggle('on', on);
    soundIconOn.style.display = on ? 'block' : 'none';
    soundIconOff.style.display = on ? 'none' : 'block';
  }
  refreshSoundIcon();
  soundBtn.addEventListener('click', () => {
    SoundEngine.setEnabled(!SoundEngine.isEnabled());
    refreshSoundIcon();
    if(SoundEngine.isEnabled()){
      SoundEngine.success();
      unlockAchievement('sound');
    }
  });

  /* ===================================================================
     ACHIEVEMENTS — persisted in localStorage, surfaced as toasts
     =================================================================== */
  const ACHIEVEMENTS = {
    breach:   { title: 'System Breached', desc: 'Made it past the intro and into the site' , icon:'⚡'},
    arsenal:  { title: 'Fully Armed', desc: 'Activated the entire tech arsenal', icon:'⚙' },
    explorer: { title: 'Deep Scan', desc: 'Explored every section of the site', icon:'◎' },
    konami:   { title: 'Old School', desc: 'Entered the Konami code', icon:'▲' },
    ghost:    { title: 'Ghost Protocol', desc: 'Found the hidden cinematic', icon:'☠' },
    sound:    { title: 'Ears On', desc: 'Enabled system audio', icon:'♪' }
  };
  const achStack = document.getElementById('achievement-stack');
  const hudAchCount = document.getElementById('hud-ach-count');

  function getUnlocked(){
    try { return JSON.parse(localStorage.getItem('q4xy_achievements') || '[]'); }
    catch(e){ return []; }
  }
  function updateAchHud(){
    if(hudAchCount) hudAchCount.textContent = getUnlocked().length;
  }
  function unlockAchievement(id){
    const def = ACHIEVEMENTS[id];
    if(!def) return;
    const unlocked = getUnlocked();
    if(unlocked.includes(id)) return;
    unlocked.push(id);
    localStorage.setItem('q4xy_achievements', JSON.stringify(unlocked));
    updateAchHud();
    SoundEngine.unlock();
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `<div class="ach-icon">${def.icon}</div><div class="ach-text"><span class="ach-label">ACHIEVEMENT UNLOCKED</span><span class="ach-title">${def.title}</span></div>`;
    achStack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 500);
    }, 4200);
  }
  updateAchHud();

  /* ===================================================================
     PORTFOLIO ENTRY — lightweight visual progress, then slide the loader
     away to reveal the already-rendered portfolio underneath.
     =================================================================== */
  (function portfolioLoader(){
    const loader = document.getElementById('portfolio-loader');
    const fill = document.getElementById('loader-progress-fill');
    const value = document.getElementById('loader-progress-value');
    const message = document.getElementById('loader-message');
    if(!loader || !fill || !value || !message) return;

    const messages = [
      [1, 'Initializing portfolio...'],
      [24, 'Loading projects...'],
      [46, 'Preparing experience...'],
      [68, 'Loading skills...'],
      [88, 'Almost ready...'],
      [100, 'Welcome.']
    ];
    const started = performance.now();
    const duration = 3600;
    let progress = 1;
    let lastMessage = '';

    function updateMessage(){
      for(let i = messages.length - 1; i >= 0; i--){
        if(progress >= messages[i][0]){
          if(lastMessage !== messages[i][1]){
            lastMessage = messages[i][1];
            message.textContent = lastMessage;
          }
          break;
        }
      }
    }

    function tick(now){
      const elapsed = Math.min(now - started, duration);
      const ratio = elapsed / duration;
      const eased = 1 - Math.pow(1 - ratio, 1.32);
      const target = Math.min(100, Math.floor(1 + eased * 99));
      if(target > progress) progress = target;
      if(progress >= 90 && ratio > .86 && Math.random() < .35) progress = Math.max(90, progress - 1);
      progress = Math.round(Math.min(100, progress));
      fill.style.width = progress + '%';
      value.textContent = progress + '%';
      updateMessage();

      if(elapsed < duration || progress < 100){
        requestAnimationFrame(tick);
        return;
      }

      progress = 100;
      fill.style.width = '100%';
      value.textContent = '100%';
      message.textContent = 'Welcome.';
      setTimeout(() => {
        startHeroEntrance();
        loader.classList.add('is-exiting');
        setTimeout(() => loader.remove(), 620);
      }, 300);
    }

    requestAnimationFrame(tick);
  })();

  /* ===================================================================
     ARSENAL SYNC — activating tech cards by hover/tap/focus
     =================================================================== */
  (function techGamification(){
    const cards = Array.from(document.querySelectorAll('.tech-card'));
    if(!cards.length) return;
    const fill = document.getElementById('arsenal-sync-fill');
    const pctLabel = document.getElementById('arsenal-sync-pct');
    const hudPct = document.getElementById('hud-arsenal-pct');
    const total = cards.length;
    const activated = new Set(JSON.parse(localStorage.getItem('q4xy_arsenal') || '[]'));

    function nameOf(card, i){ return card.querySelector('.tech-card-name')?.textContent || ('card'+i); }

    function paint(){
      const pct = Math.round((activated.size / total) * 100);
      if(fill) fill.style.width = pct + '%';
      if(pctLabel) pctLabel.textContent = pct + '%';
      if(hudPct) hudPct.textContent = pct + '%';
      if(pct >= 100) unlockAchievement('arsenal');
    }

    cards.forEach((card, i) => {
      const key = nameOf(card, i);
      if(activated.has(key)) card.classList.add('activated');
      function activate(){
        if(activated.has(key)) return;
        activated.add(key);
        localStorage.setItem('q4xy_arsenal', JSON.stringify(Array.from(activated)));
        card.classList.add('activated', 'pulse');
        SoundEngine.click();
        setTimeout(() => card.classList.remove('pulse'), 500);
        paint();
      }
      card.addEventListener('mouseenter', activate);
      card.addEventListener('focus', activate);
      card.addEventListener('touchstart', activate, { passive: true });
    });
    paint();
  })();

  /* ===================================================================
     DEEP SCAN — reward visiting every section
     =================================================================== */
  (function sectionExplorer(){
    const ids = ['about', 'tech', 'projects', 'contact'];
    const visited = new Set();
    const sections = ids.map(id => document.getElementById(id)).filter(Boolean);
    if(!sections.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          visited.add(entry.target.id);
          if(visited.size === sections.length){
            unlockAchievement('explorer');
            obs.disconnect();
          }
        }
      });
    }, { threshold: 0.4 });
    sections.forEach(s => obs.observe(s));
  })();

  /* ===================================================================
     CURSOR-REACTIVE AMBIENT LIGHT — soft red glow follows the cursor
     and subtly lights up nearby cards as it moves
     =================================================================== */
  (function cursorAmbientLight(){
    if(state.isTouch) return;
    const glow = document.getElementById('cursor-ambient-glow');
    if(!glow) return;
    let gx = state.mouseX, gy = state.mouseY;
    const proximityEls = Array.from(document.querySelectorAll('.tech-card, .link-card, .project-img, .about-terminal'));
    function frame(){
      gx += (state.mouseX - gx) * 0.14;
      gy += (state.mouseY - gy) * 0.14;
      glow.style.transform = `translate(${gx}px, ${gy}px)`;
      glow.classList.add('active');
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    let lastProx = 0;
    document.addEventListener('mousemove', () => {
      const now = performance.now();
      if(now - lastProx < 40) return; // throttle proximity scan
      lastProx = now;
      proximityEls.forEach(el => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dist = Math.hypot(state.mouseX - cx, state.mouseY - cy);
        const range = Math.max(r.width, r.height) * 1.1 + 160;
        const proximity = Math.max(0, 1 - dist / range);
        if(proximity > 0.02){
          el.style.setProperty('--mx', `${state.mouseX - r.left}px`);
          el.style.setProperty('--my', `${state.mouseY - r.top}px`);
        }
      });
    });
  })();

  /* ===================================================================
     SYSTEM TELEMETRY HUD — decorative, subtly animated fake stats
     =================================================================== */
  (function sysTelemetry(){
    const cpuEl = document.getElementById('tm-cpu'), cpuBar = document.getElementById('tm-cpu-bar');
    const netEl = document.getElementById('tm-net'), netBar = document.getElementById('tm-net-bar');
    const pingEl = document.getElementById('tm-ping');
    if(!cpuEl) return;
    let cpu = 22, net = 4.2;
    function tick(){
      if(state.tabVisible){
        cpu += (Math.random() - 0.5) * 9;
        cpu = Math.max(8, Math.min(72, cpu));
        net += (Math.random() - 0.5) * 1.4;
        net = Math.max(0.6, Math.min(9.8, net));
        const ping = Math.round(8 + Math.random() * 34);
        cpuEl.textContent = Math.round(cpu) + '%';
        cpuBar.style.width = Math.round(cpu) + '%';
        netEl.textContent = net.toFixed(1) + ' MB/s';
        netBar.style.width = Math.min(100, net * 10) + '%';
        pingEl.textContent = ping + ' ms';
      }
      setTimeout(tick, 1400 + Math.random() * 900);
    }
    tick();
  })();

  /* ===================================================================
     MISSION BRIEFING MODAL — project cards open a full detail panel
     =================================================================== */
  (function missionBriefing(){
    const overlay = document.getElementById('mission-modal-overlay');
    if(!overlay) return;
    const tagEl = document.getElementById('mission-tag');
    const titleEl = document.getElementById('mission-title');
    const shotLabel = document.getElementById('mission-shot-label');
    const descEl = document.getElementById('mission-desc');
    const stackEl = document.getElementById('mission-stack');
    const statusEl = document.getElementById('mission-status');
    const roleEl = document.getElementById('mission-role');
    const closeBtn = document.getElementById('mission-close');

    function openFrom(card){
      tagEl.textContent = card.dataset.tag || 'OP // 000';
      titleEl.textContent = card.dataset.title || 'Untitled Operation';
      shotLabel.textContent = (card.dataset.title || 'PROJECT') + ' — LIVE FEED UNAVAILABLE';
      descEl.innerHTML = (card.dataset.desc || '').split('|').map(p => `<p>${p}</p>`).join('');
      stackEl.innerHTML = (card.dataset.stack || '').split(',').filter(Boolean).map(s => `<span>${s.trim()}</span>`).join('');
      statusEl.textContent = card.dataset.status || '—';
      roleEl.textContent = card.dataset.role || '—';
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      SoundEngine.click();
    }
    function close(){
      overlay.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
    document.querySelectorAll('[data-mission]').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        // don't hijack real links inside the card
        if(e.target.closest('a')) return;
        openFrom(card);
      });
    });
    closeBtn && closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && overlay.classList.contains('active')) close(); });
  })();

  /* ===================================================================
     LIVE GITHUB STATS WIDGET
     =================================================================== */
  (function githubWidget(){
    const statusEl = document.getElementById('gh-widget-status');
    const chartImg = document.getElementById('gh-chart-img');
    const ghWidget = document.getElementById('gh-widget');
    if(!statusEl) return;
    const USERNAME = 'q4xy';
    let imgOk = null;  // null = pending, true/false once settled
    let apiOk = null;
    let settled = false;

    function evaluate(){
      if(settled) return;
      if(imgOk === null || apiOk === null) return; // wait for both signals
      settled = true;
      if(!imgOk && !apiOk){
        // Total failure — drop the broken image + dangling stat placeholders, show a clean static card
        if(ghWidget) ghWidget.classList.add('offline-full', 'offline-stats');
        statusEl.textContent = '_ live sync unavailable — showing static profile card';
      } else if(!apiOk){
        // Stats endpoint failed but the contribution graph loaded fine — just hide the placeholders
        if(ghWidget) ghWidget.classList.add('offline-stats');
        statusEl.textContent = '_ stat sync failed (rate-limited) — showing contribution graph only';
      } else if(!imgOk){
        // Contribution graph image failed but stats loaded — drop the broken image icon
        if(ghWidget) ghWidget.classList.add('offline-full');
        statusEl.textContent = `_ synced with github.com/${USERNAME} — contribution graph unavailable`;
      } else {
        statusEl.textContent = `_ synced with github.com/${USERNAME} — last updated ${new Date().toLocaleTimeString()}`;
      }
    }

    if(chartImg){
      chartImg.addEventListener('load', () => { imgOk = true; evaluate(); });
      chartImg.addEventListener('error', () => { imgOk = false; evaluate(); });
      chartImg.src = `https://ghchart.rshah.org/ff2d2d/${USERNAME}`;
    } else {
      imgOk = false;
    }

    fetch(`https://api.github.com/users/${USERNAME}`)
      .then(r => { if(!r.ok) throw new Error('not found'); return r.json(); })
      .then(data => {
        const repos = document.getElementById('gh-repos');
        const followers = document.getElementById('gh-followers');
        const following = document.getElementById('gh-following');
        if(repos) repos.textContent = data.public_repos ?? '—';
        if(followers) followers.textContent = data.followers ?? '—';
        if(following) following.textContent = data.following ?? '—';
        apiOk = true;
        evaluate();
      })
      .catch(() => {
        apiOk = false;
        evaluate();
      });

    // Safety net — if either signal never fires, don't leave the widget hanging on "connecting..."
    setTimeout(() => {
      if(imgOk === null) imgOk = false;
      if(apiOk === null) apiOk = false;
      evaluate();
    }, 8000);
  })();

  /* ===================================================================
     SCAN-LINE / FLICKER TRANSITION on in-page navigation
     =================================================================== */
  (function navScanTransition(){
    const flash = document.getElementById('nav-scan-flash');
    if(!flash) return;
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => {
        flash.classList.remove('active');
        void flash.offsetWidth;
        flash.classList.add('active');
        setTimeout(() => flash.classList.remove('active'), 550);
      });
    });
  })();

  const heroNameEl = document.getElementById('hero-name');
  const heroGlitchEl = document.getElementById('hero-name-glitch');
  const nameStr = 'Q4XY';

  function buildChars(container, text){
    const chars = [];
    text.split('').forEach(ch => {
      const s = document.createElement('span');
      s.textContent = ch;
      s.style.display = 'inline-block';
      container.appendChild(s);
      chars.push(s);
    });
    return chars;
  }

  const nameChars = buildChars(heroNameEl, nameStr);
  buildChars(heroGlitchEl.querySelector('.glitch-r'), nameStr);
  buildChars(heroGlitchEl.querySelector('.glitch-cyan'), nameStr);

  function startHeroEntrance(){
    unlockAchievement('breach');
    document.getElementById('hero-pulse').classList.add('fire');
    setTimeout(() => document.getElementById('hero-scan-line').classList.add('fire'), 200);

    nameChars.forEach((el, i) => {
      el.style.transition = `opacity .9s cubic-bezier(0.34,1.56,0.64,1) ${i * 100}ms, transform .9s cubic-bezier(0.34,1.56,0.64,1) ${i * 100}ms`;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) scale(1)';
    });

    setTimeout(() => document.getElementById('hero-name-reflection').classList.add('visible'), 400);
    setTimeout(() => document.querySelectorAll('.hero-shape').forEach(s => s.classList.add('visible')), 300);
    setTimeout(() => document.getElementById('hero-data-streams').classList.add('visible'), 600);
    setTimeout(() => document.querySelectorAll('.hero-hud-corner').forEach(h => h.classList.add('visible')), 200);

    const reveals = [
      {el: document.getElementById('status-pill'), delay: 400},
      {el: document.getElementById('hero-tagline'), delay: 700},
      {el: document.getElementById('hero-statement'), delay: 850},
      {el: document.getElementById('hero-bg-select'), delay: 1000},
      {el: document.getElementById('hero-terminal'), delay: 1200},
      {el: document.getElementById('scroll-indicator'), delay: 1400}
    ];
    
    let maxDelay = 0;
    reveals.forEach(r => {
      if(!r.el) return;
      maxDelay = Math.max(maxDelay, r.delay);
      setTimeout(() => {
        r.el.style.transition = 'opacity .8s var(--ease-out), transform .8s var(--ease-out)';
        r.el.style.opacity = '1';
        r.el.style.transform = 'translateY(0)';
      }, r.delay);
    });

    // Unlock scroll after hero is fully revealed
    setTimeout(() => {
      document.body.style.overflow = 'auto';
    }, maxDelay + 800);

    setInterval(fireGlitchBurst, 4000);
    setTimeout(fireGlitchBurst, 1500);
  }

  function fireGlitchBurst(){
    heroGlitchEl.classList.remove('burst');
    void heroGlitchEl.offsetWidth;
    heroGlitchEl.classList.add('burst');
    setTimeout(() => heroGlitchEl.classList.remove('burst'), 500);
  }

  const terminalText = document.getElementById('terminal-text');
  const statuses = ['SYSTEM ONLINE','BUILDING','EXPERIMENTING','LEARNING','DEPLOYING'];
  let statusIndex = 0;
  if(terminalText) {
    terminalText.style.transition = 'opacity .2s';
    setInterval(() => {
      statusIndex = (statusIndex+1) % statuses.length;
      terminalText.style.opacity = '0';
      setTimeout(() => { terminalText.textContent = statuses[statusIndex]; terminalText.style.opacity = '1'; }, 200);
    }, 2400);
  }

  /* Q4XY HIDDEN CINEMATIC EASTER EGG */
  (function q4xyEasterEgg(){
    const egg = document.getElementById('q4xy-egg');
    if (!egg) return;
    const canvas = document.getElementById('q4xy-egg-canvas');
    const ctx = canvas.getContext('2d');
    const barFill = document.getElementById('q4xy-egg-bar-fill');
    const grantedEl = document.getElementById('q4xy-egg-granted');
    const finalEl = document.getElementById('q4xy-egg-final');
    const lines = [];
    for (let i = 0; i < 8; i++) lines.push(document.getElementById('q4xy-line-' + i));

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let running = false;
    let rainCols = [], animFrame = null;

    function resizeCanvas(){
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const fontSize = 15;
      const colCount = Math.ceil(canvas.width / fontSize);
      rainCols = new Array(colCount).fill(0).map(() => Math.floor(Math.random() * -50));
    }

    function drawRain(){
      const fontSize = 15;
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = getActiveColor();
      
      ctx.font = fontSize + 'px monospace';
      const chars = '01アイウエオカキクケコサシスセソ';
      for (let i = 0; i < rainCols.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = rainCols[i] * fontSize;
        ctx.fillText(char, x, y);
        if (y > canvas.height && Math.random() > 0.975) rainCols[i] = 0;
        else rainCols[i]++;
      }
      if (running) animFrame = requestAnimationFrame(drawRain);
    }

    function resetSequenceUI(){
      lines.forEach(l => l.classList.remove('show'));
      barFill.style.transition = 'none';
      barFill.style.width = '0%';
      grantedEl.classList.remove('show');
      finalEl.classList.remove('show');
      egg.classList.remove('glitching');
    }

    function playSequence(){
      if (running) return;
      running = true;
      document.body.style.overflow = 'hidden';
      resetSequenceUI();
      resizeCanvas();
      egg.classList.add('active');

      requestAnimationFrame(() => egg.classList.add('glitching'));
      if (!reducedMotion) drawRain();

      const timers = [];
      const delays = [200, 600, 1050, 1500, 2000, 2500, 3000, 3450];
      lines.forEach((l, idx) => {
        timers.push(setTimeout(() => l.classList.add('show'), delays[idx] || (idx * 450)));
      });

      timers.push(setTimeout(() => {
        barFill.style.transition = 'width 1.6s linear';
        barFill.style.width = '100%';
      }, 200));

      timers.push(setTimeout(() => {
        grantedEl.classList.add('show');
      }, 4000));
      timers.push(setTimeout(() => {
        grantedEl.classList.remove('show');
      }, 4900));

      timers.push(setTimeout(() => {
        finalEl.classList.add('show');
      }, 5000));

      timers.push(setTimeout(() => {
        egg.classList.add('fading');
        egg.classList.remove('active');
      }, 6600));

      timers.push(setTimeout(() => {
        running = false;
        if (animFrame) cancelAnimationFrame(animFrame);
        egg.classList.remove('fading');
        document.body.style.overflow = 'auto';
        resetSequenceUI();
      }, 7200));
    }

    let typedBuffer = '';
    const targetSeq = 'q4xy';
    document.addEventListener('keydown', function(e){
      const target = e.target;
      const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
      const isEditable = tag === 'input' || tag === 'textarea' || (target && target.isContentEditable);
      if (isEditable || running) { typedBuffer = ''; return; }

      const key = e.key.toLowerCase();
      if (key.length !== 1) return;
      typedBuffer = (typedBuffer + key).slice(-targetSeq.length);
      if (typedBuffer === targetSeq) {
        typedBuffer = '';
        playSequence();
      }
    });

    window.addEventListener('resize', () => { if (running) resizeCanvas(); });
  })();

  /* KONAMI CODE SECRET (↑ ↑ ↓ ↓ ← → ← → B A) */
  (function konamiEasterEgg(){
    const konamiEgg = document.getElementById('konami-egg');
    if (!konamiEgg) return;
    const glitchFlash = document.getElementById('glitch-flash');
    const konamiSeq = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];
    let buffer = [];
    let showing = false;

    function fireGlitch(){
      if(!glitchFlash) return;
      glitchFlash.classList.remove('active');
      void glitchFlash.offsetWidth;
      glitchFlash.classList.add('active');
      setTimeout(() => glitchFlash.classList.remove('active'), 400);
    }

    function playKonami(){
      if (showing) return;
      showing = true;
      fireGlitch();
      konamiEgg.classList.add('show');
      setTimeout(() => {
        fireGlitch();
        konamiEgg.classList.remove('show');
        setTimeout(() => { showing = false; }, 400);
      }, 2600);
    }

    document.addEventListener('keydown', function(e){
      const target = e.target;
      const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
      const isEditable = tag === 'input' || tag === 'textarea' || (target && target.isContentEditable);
      if (isEditable || showing) { buffer = []; return; }

      const key = e.key.toLowerCase();
      buffer.push(key);
      buffer = buffer.slice(-konamiSeq.length);
      if (buffer.length === konamiSeq.length && buffer.every((k, i) => k === konamiSeq[i])) {
        buffer = [];
        playKonami();
      }
    });
  })();

  /* SCRAMBLE HOVER */
  const scrambleChars = '01<>{}[]#$%QXY';
  document.querySelectorAll('[data-scramble]').forEach(el => {
    const original = el.textContent;
    let interval, running = false;
    el.addEventListener('mouseenter', () => {
      if (running) return;
      running = true;
      let iter = 0;
      clearInterval(interval);
      interval = setInterval(() => {
        el.textContent = original.split('').map((c, i) => {
          if (c === ' ') return ' ';
          if (i < iter) return original[i];
          return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
        }).join('');
        iter += original.length / 12;
        if (iter >= original.length) { clearInterval(interval); el.textContent = original; running = false; }
      }, 30);
    });
  });

  /* CODE-GLYPH CURSOR TRAIL - KALI / REDTEAM HACKER STYLE */
  if (!state.isTouch && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const glyphStrings = ['ls', 'cd', 'ps', 'id', 'pwd', 'cat', 'su', 'top', 'env', 'git', 'ssh', 'sudo', 'nmap', 'curl', 'grep', 'kill', 'rm', 'cp', 'mv', 'dig', 'awk', 'vim', '0x', '1', '0'];
    let lastGlyph = 0;
    document.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastGlyph < 60) return;
      lastGlyph = now;
      const g = document.createElement('span');
      g.className = 'glyph-trail';
      g.textContent = glyphStrings[Math.floor(Math.random() * glyphStrings.length)];
      g.style.left = e.clientX + 'px';
      g.style.top = e.clientY + 'px';
      g.style.fontSize = (8 + Math.random() * 3).toFixed(1) + 'px';
      document.body.appendChild(g);
      requestAnimationFrame(() => {
        g.style.opacity = '0';
        g.style.transform = `translateY(-${20 + Math.random() * 20}px) translateX(${Math.random() * 10 - 5}px)`;
      });
      setTimeout(() => g.remove(), 800);
    });
  }

  /* ===================================================================
     TOAST NOTIFICATION SYSTEM
     =================================================================== */
  (function toastSystem(){
    const stack = document.getElementById('toast-stack');
    if(!stack) return;
    window.showToast = function(title, subtitle, duration){
      duration = duration || 2800;
      const item = document.createElement('div');
      item.className = 'toast-item';
      item.innerHTML = '<span class="toast-dot"></span><div class="toast-text">' + title + (subtitle ? '<small>' + subtitle + '</small>' : '') + '</div>';
      stack.appendChild(item);
      requestAnimationFrame(() => item.classList.add('show'));
      setTimeout(() => {
        item.classList.add('toast-out');
        setTimeout(() => item.remove(), 350);
      }, duration);
    };
  })();

  /* ===================================================================
     WELCOME POPUP
     =================================================================== */
  (function welcomePopup(){
    const overlay = document.getElementById('welcome-overlay');
    const closeBtn = document.getElementById('welcome-close');
    const soundToggle = document.getElementById('welcome-sound-toggle');
    if(!overlay) return;

    const seenKey = 'q4xy_welcome_seen';
    let autoCloseTimer = null;

    function open(){
      overlay.classList.add('active');
      SoundEngine.click();
      if(autoCloseTimer) clearTimeout(autoCloseTimer);
      autoCloseTimer = setTimeout(() => close(), 10000);
    }
    function close(){
      overlay.classList.remove('active');
      SoundEngine.click();
      if(autoCloseTimer) clearTimeout(autoCloseTimer);
      localStorage.setItem(seenKey, '1');
    }

    // Show when user scrolls down from hero section
    let welcomeShown = false;
    function onScrollWelcome(){
      if(welcomeShown) return;
      if(!localStorage.getItem(seenKey) && window.scrollY > 80){
        welcomeShown = true;
        window.removeEventListener('scroll', onScrollWelcome, { passive: true });
        setTimeout(open, 300);
      }
    }
    window.addEventListener('scroll', onScrollWelcome, { passive: true });

    closeBtn && closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });

    // Theme buttons in welcome popup
    document.querySelectorAll('.welcome-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.wtheme;
        document.body.classList.remove('green-theme', 'cyan-theme', 'amber-theme');
        document.querySelectorAll('.welcome-theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if(theme !== 'red') document.body.classList.add(theme + '-theme');
        SoundEngine.success();
        const names = {red:'Red', cyan:'Cyan', green:'Green', amber:'Amber'};
        showToast('Theme Changed', names[theme] + ' Enabled');
      });
    });

    // Sound toggle in welcome popup
    function syncSoundToggle(){
      const on = SoundEngine.isEnabled();
      soundToggle.classList.toggle('on', on);
    }
    soundToggle && soundToggle.addEventListener('click', () => {
      SoundEngine.setEnabled(!SoundEngine.isEnabled());
      syncSoundToggle();
      if(SoundEngine.isEnabled()){
        SoundEngine.success();
        showToast('Sound Enabled', 'UI audio active');
      } else {
        showToast('Sound Disabled', 'UI audio muted');
      }
    });
    syncSoundToggle();

    // Global ? key to reopen
    document.addEventListener('keydown', (e) => {
      if(e.key === '?' && !isTyping()){
        e.preventDefault();
        if(overlay.classList.contains('active')) close(); else open();
      }
      if(e.key === 'Escape' && overlay.classList.contains('active')){
        close();
      }
    });
    // Also allow clicking the theme toggle button to reopen help
    const themeBtn = document.getElementById('theme-toggle-btn');
    if(themeBtn){
      themeBtn.addEventListener('dblclick', () => {
        if(!overlay.classList.contains('active')) open();
      });
    }

    function isTyping(){
      const t = document.activeElement;
      return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    }
  })();

  /* ===================================================================
     KEYBOARD SHORTCUTS — R/B/G/Y for themes
     =================================================================== */
  (function keyboardShortcuts(){
    const themeMap = {
      'r': 'red',
      'b': 'cyan',
      'g': 'green',
      'y': 'amber'
    };
    const themeNames = {red:'Red', cyan:'Cyan', green:'Green', amber:'Amber'};
    document.addEventListener('keydown', (e) => {
      const t = document.activeElement;
      if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const key = e.key.toLowerCase();
      if(themeMap[key]){
        const theme = themeMap[key];
        document.body.classList.remove('green-theme', 'cyan-theme', 'amber-theme');
        if(theme !== 'red') document.body.classList.add(theme + '-theme');
        // Sync welcome popup buttons if open
        document.querySelectorAll('.welcome-theme-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.wtheme === theme);
        });
        SoundEngine.success();
        showToast('Theme Changed', themeNames[theme] + ' Enabled');
      }
    });
  })();

  /* ===================================================================
     SOUND ENHANCEMENTS — hook into existing UI events
     =================================================================== */
  (function soundHooks(){
    // Theme button clicks
    document.querySelectorAll('.theme-menu button').forEach(btn => {
      btn.addEventListener('click', () => {
        SoundEngine.success();
        const names = {red:'Red', green:'Green', cyan:'Cyan', amber:'Amber'};
        showToast('Theme Changed', (names[btn.dataset.theme] || 'Theme') + ' Enabled');
      });
    });
    // Cmd open/close
    const origCmdToggle = () => {
      if(cmdOverlay.classList.contains('active')){
        SoundEngine.click();
        showToast('Developer Console', 'Root access granted');
      } else {
        SoundEngine.click();
      }
    };
    // Hook into cmd toggle
    document.addEventListener('keydown', (e) => {
      if((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd'){
        setTimeout(() => {
          if(cmdOverlay.classList.contains('active')){
            SoundEngine.click();
            showToast('Developer Console', 'Root access granted');
          }
        }, 50);
      }
    });
    if(cmdClose){
      cmdClose.addEventListener('click', () => { SoundEngine.click(); });
    }
    // Link card clicks
    document.querySelectorAll('.link-card').forEach(card => {
      card.addEventListener('click', () => SoundEngine.click());
    });
    // Tech filter clicks
    document.querySelectorAll('.tech-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => SoundEngine.click());
    });
    // Explore button
  })();

  /* ===================================================================
     SMOOTH SCROLL POLISH — anchor links with offset
     =================================================================== */
  (function smoothScrollPolish(){
    function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
    function cinematicScrollTo(targetY, duration){
      duration = duration || 980;
      const startY = window.scrollY;
      const diff = targetY - startY;
      if(Math.abs(diff) < 2) return;
      const startTime = performance.now();
      function step(now){
        const elapsed = Math.min(1, (now - startTime) / duration);
        window.scrollTo(0, startY + diff * easeOutCubic(elapsed));
        if(elapsed < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', function(e){
        const target = document.querySelector(this.getAttribute('href'));
        if(target){
          e.preventDefault();
          const y = target.getBoundingClientRect().top + window.scrollY - 40;
          if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
            window.scrollTo({ top: y, behavior: 'auto' });
          } else {
            cinematicScrollTo(y);
          }
        }
      });
    });
  })();

  /* ===================================================================
     [NEW] INERTIA WHEEL SMOOTH SCROLL — each wheel tick nudges a target
     scroll position; the page eases toward it over a short burst and
     settles, instead of jumping straight there. Skipped on touch and
     for reduced-motion users, who keep native scrolling.
     =================================================================== */
  (function inertiaWheelScroll(){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if(window.matchMedia('(pointer: coarse)').matches) return;

    const EASE = 0.16;
    const SETTLE = 0.5;
    let target = window.scrollY;
    let current = target;
    let lastApplied = current;
    let raf = 0;

    // Cache max scroll instead of reading scrollHeight on every wheel tick;
    // only recompute on resize (layout-affecting) or when a burst starts.
    let cachedMaxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    function refreshMaxScroll(){
      cachedMaxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      return cachedMaxScroll;
    }

    function loop(){
      current += (target - current) * EASE;
      const settled = Math.abs(target - current) < SETTLE;
      if(settled) current = target;
      // Skip the scrollTo write (and the cascade of scroll listeners it
      // fires across the page) when the visible position hasn't actually
      // moved enough to matter this frame — minimizes per-frame work
      // while everything else (three.js scene, matrix/kinetic/dots,
      // hero parallax) is also running.
      if(Math.abs(current - lastApplied) >= 0.4 || settled){
        window.scrollTo(0, current);
        lastApplied = current;
      }
      if(settled){ raf = 0; return; }
      raf = requestAnimationFrame(loop);
    }

    window.addEventListener('wheel', function(e){
      if(e.ctrlKey) return; // let pinch-zoom through untouched
      e.preventDefault();
      if(!raf){
        // starting a fresh burst — anchor to wherever the page actually is
        current = window.scrollY;
        target = current;
        lastApplied = current;
        refreshMaxScroll();
      }
      let delta = e.deltaY;
      if(e.deltaMode === 1) delta *= 18;      // line mode
      else if(e.deltaMode === 2) delta *= window.innerHeight; // page mode
      target = Math.min(cachedMaxScroll, Math.max(0, target + delta));
      if(!raf) raf = requestAnimationFrame(loop);
    }, { passive: false });

    window.addEventListener('resize', function(){
      refreshMaxScroll();
      target = Math.min(cachedMaxScroll, target);
    }, { passive: true });
  })();

  /* ===================================================================
     VELOCITY BAR SMOOTHING
     =================================================================== */
  (function velocityBarSmooth(){
    if(state.isTouch) return;
    let targetH = 0, currentH = 0;
    function tick(){
      currentH += (targetH - currentH) * 0.15;
      if(velocityFill) velocityFill.style.height = currentH + '%';
      requestAnimationFrame(tick);
    }
    const origScroll = window.onscroll;
    window.addEventListener('scroll', () => {
      const delta = Math.abs(window.scrollY - lastScrollY);
      targetH = Math.min(100, delta * 1.8);
      clearTimeout(isScrolling);
      isScrolling = setTimeout(() => { targetH = 0; velocityBar && velocityBar.classList.remove('visible'); }, 150);
      velocityBar && velocityBar.classList.add('visible');
    }, { passive: true });
    tick();
  })();

  /* ===================================================================
     GTA V HACKER SCROLL DEPTH SYSTEM
     Like descending through Los Santos into the deep net
     =================================================================== */
  (function gtaScrollDepth(){
    const sunsetCanvas = document.getElementById('gta-sunset-layer');
    const cityCanvas = document.getElementById('gta-city-canvas');
    const tunnelCanvas = document.getElementById('gta-tunnel-canvas');
    const bedrockCanvas = document.getElementById('gta-bedrock-canvas');
    const vignette = document.getElementById('depth-vignette');
    const scanlines = document.getElementById('depth-scanlines');
    if(!sunsetCanvas || !cityCanvas || !tunnelCanvas || !bedrockCanvas) return;

    const sCtx = sunsetCanvas.getContext('2d');
    const cCtx = cityCanvas.getContext('2d');
    const tCtx = tunnelCanvas.getContext('2d');
    const bCtx = bedrockCanvas.getContext('2d');
    let w, h;

    // Scroll depth tracking
    let scrollDepth = 0; // 0 = surface, 1 = deep bedrock
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    // City buildings
    const buildings = [];
    const BUILDING_COUNT = 60;

    // Tunnel particles
    const tunnelParticles = [];
    const TUNNEL_COUNT = 80;

    // Bedrock grid
    let bedrockOffset = 0;

    function resize(){
      w = sunsetCanvas.width = cityCanvas.width = tunnelCanvas.width = bedrockCanvas.width = window.innerWidth;
      h = sunsetCanvas.height = cityCanvas.height = tunnelCanvas.height = bedrockCanvas.height = window.innerHeight;

      // Regenerate buildings
      buildings.length = 0;
      for(let i = 0; i < BUILDING_COUNT; i++){
        buildings.push({
          x: Math.random() * w,
          baseY: h,
          width: 20 + Math.random() * 80,
          height: 60 + Math.random() * 250,
          windows: [],
          parallax: 0.1 + Math.random() * 0.3
        });
        // Generate windows
        const b = buildings[i];
        const rows = Math.floor(b.height / 18);
        const cols = Math.floor(b.width / 14);
        for(let r = 0; r < rows; r++){
          for(let c = 0; c < cols; c++){
            if(Math.random() > 0.4){
              b.windows.push({rx: c * 14 + 4, ry: r * 18 + 6});
            }
          }
        }
      }

      // Regenerate tunnel particles
      tunnelParticles.length = 0;
      for(let i = 0; i < TUNNEL_COUNT; i++){
        tunnelParticles.push({
          x: (Math.random() - 0.5) * w * 2,
          y: (Math.random() - 0.5) * h * 2,
          z: Math.random() * 2000,
          speed: 8 + Math.random() * 12,
          size: 1 + Math.random() * 2
        });
      }
    }
    resize();
    window.addEventListener('resize', resize);

    // Scroll listener
    window.addEventListener('scroll', () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      scrollDepth = maxScroll > 0 ? Math.min(1, window.scrollY / maxScroll) : 0;
    }, { passive: true });

    // ===== SUNSET LAYER (top of page) =====
    // GTA V Los Santos sunset gradient
    function drawSunset(){
      if(scrollDepth > 0.35) return;
      const opacity = Math.max(0, 1 - scrollDepth * 3.5);
      sCtx.globalAlpha = opacity * 0.15;

      // Sunset gradient
      const grad = sCtx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1a0a2e');
      grad.addColorStop(0.3, '#4a1a3e');
      grad.addColorStop(0.5, '#8a2a3e');
      grad.addColorStop(0.7, '#d44a2e');
      grad.addColorStop(1, '#2a0a1e');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, w, h);

      // Sun disc
      const sunY = h * 0.55 + scrollDepth * 100;
      const sunGrad = sCtx.createRadialGradient(w * 0.7, sunY, 0, w * 0.7, sunY, 120);
      sunGrad.addColorStop(0, 'rgba(255, 200, 80, 0.4)');
      sunGrad.addColorStop(0.4, 'rgba(255, 100, 40, 0.2)');
      sunGrad.addColorStop(1, 'rgba(255, 60, 20, 0)');
      sCtx.fillStyle = sunGrad;
      sCtx.beginPath();
      sCtx.arc(w * 0.7, sunY, 120, 0, Math.PI * 2);
      sCtx.fill();

      // Palm tree silhouettes
      sCtx.strokeStyle = 'rgba(10, 5, 15, 0.6)';
      sCtx.lineWidth = 2;
      [[0.15, 0.85], [0.35, 0.9], [0.82, 0.88], [0.92, 0.82]].forEach(([px, py]) => {
        const bx = w * px, by = h * py;
        // Trunk
        sCtx.beginPath();
        sCtx.moveTo(bx, by);
        sCtx.quadraticCurveTo(bx + 8, by - 40, bx + 15, by - 80);
        sCtx.stroke();
        // Fronds
        for(let a = -0.6; a <= 0.6; a += 0.3){
          sCtx.beginPath();
          sCtx.moveTo(bx + 15, by - 80);
          sCtx.quadraticCurveTo(bx + 15 + Math.cos(a) * 40, by - 110 + Math.sin(a) * 20, bx + 15 + Math.cos(a) * 60, by - 90);
          sCtx.stroke();
        }
      });

      sCtx.globalAlpha = 1;
    }

    // ===== CITY LAYER (scroll down) =====
    // Wireframe Los Santos skyline
    function drawCity(){
      if(scrollDepth < 0.1 || scrollDepth > 0.6) return;
      const opacity = Math.min(1, (scrollDepth - 0.1) * 4) * Math.max(0, 1 - (scrollDepth - 0.4) * 4) * 0.2;
      cCtx.globalAlpha = opacity;

      const rgb = getActiveRgb();
      cCtx.strokeStyle = `rgba(${rgb}, 0.15)`;
      cCtx.lineWidth = 0.8;

      buildings.forEach(b => {
        const parallaxY = b.baseY - b.height + scrollDepth * 200 * b.parallax;
        // Building outline
        cCtx.strokeRect(b.x, parallaxY, b.width, b.height);
        // Windows
        cCtx.fillStyle = `rgba(${rgb}, 0.08)`;
        b.windows.forEach(win => {
          if(Math.random() > 0.98) return; // flicker
          cCtx.fillRect(b.x + win.rx, parallaxY + win.ry, 6, 8);
        });
        // Neon edge glow
        cCtx.strokeStyle = `rgba(${rgb}, 0.06)`;
        cCtx.strokeRect(b.x - 1, parallaxY - 1, b.width + 2, b.height + 2);
      });

      // Street grid lines
      cCtx.strokeStyle = `rgba(${rgb}, 0.04)`;
      cCtx.lineWidth = 0.5;
      const perspective = 0.3 + scrollDepth * 0.4;
      for(let i = 0; i < 8; i++){
        const y = h * 0.7 + i * 30;
        cCtx.beginPath();
        cCtx.moveTo(0, y);
        cCtx.lineTo(w, y);
        cCtx.stroke();
      }
      // Vanishing point lines
      const vpX = w * 0.5;
      const vpY = h * 0.5;
      for(let i = -5; i <= 5; i++){
        cCtx.beginPath();
        cCtx.moveTo(vpX + i * 80, h);
        cCtx.lineTo(vpX + i * 5, vpY);
        cCtx.stroke();
      }

      cCtx.globalAlpha = 1;
    }

    // ===== TUNNEL LAYER (deep scroll) =====
    // Matrix tunnel / data stream descent
    function drawTunnel(){
      if(scrollDepth < 0.35 || scrollDepth > 0.85) return;
      const opacity = Math.min(1, (scrollDepth - 0.35) * 3) * Math.max(0, 1 - (scrollDepth - 0.7) * 5) * 0.18;
      tCtx.globalAlpha = opacity;

      const rgb = getActiveRgb();
      const cx = w / 2, cy = h / 2;

      // Tunnel walls
      tCtx.strokeStyle = `rgba(${rgb}, 0.1)`;
      tCtx.lineWidth = 1;
      const tunnelDepth = (scrollDepth - 0.35) * 3;
      for(let i = 0; i < 12; i++){
        const size = 50 + i * 60 + tunnelDepth * 200;
        const rotation = tunnelDepth * i * 0.1;
        tCtx.save();
        tCtx.translate(cx, cy);
        tCtx.rotate(rotation);
        tCtx.strokeRect(-size/2, -size/2, size, size);
        tCtx.restore();
      }

      // Particles rushing toward viewer
      tunnelParticles.forEach(p => {
        p.z -= p.speed;
        if(p.z < 10){
          p.z = 2000;
          p.x = (Math.random() - 0.5) * w * 2;
          p.y = (Math.random() - 0.5) * h * 2;
        }
        const scale = 2000 / p.z;
        const px = cx + p.x * scale;
        const py = cy + p.y * scale;
        const pSize = p.size * scale;

        if(px > -50 && px < w + 50 && py > -50 && py < h + 50){
          tCtx.fillStyle = `rgba(${rgb}, ${0.3 * scale})`;
          tCtx.beginPath();
          tCtx.arc(px, py, pSize, 0, Math.PI * 2);
          tCtx.fill();

          // Streak
          tCtx.strokeStyle = `rgba(${rgb}, ${0.1 * scale})`;
          tCtx.lineWidth = pSize * 0.5;
          tCtx.beginPath();
          tCtx.moveTo(px, py);
          tCtx.lineTo(px - p.x * scale * 0.1, py - p.y * scale * 0.1);
          tCtx.stroke();
        }
      });

      tCtx.globalAlpha = 1;
    }

    // ===== BEDROCK LAYER (deepest) =====
    // The bottom - crystalline data core
    function drawBedrock(){
      if(scrollDepth < 0.6) return;
      const opacity = Math.min(1, (scrollDepth - 0.6) * 3) * 0.15;
      bCtx.globalAlpha = opacity;

      const rgb = getActiveRgb();
      bedrockOffset += 0.3;

      // Crystalline grid
      bCtx.strokeStyle = `rgba(${rgb}, 0.12)`;
      bCtx.lineWidth = 0.6;
      const gridSize = 40;
      const skew = scrollDepth * 0.3;

      for(let x = -gridSize; x < w + gridSize; x += gridSize){
        bCtx.beginPath();
        bCtx.moveTo(x + bedrockOffset % gridSize, 0);
        for(let y = 0; y < h; y += 10){
          bCtx.lineTo(x + bedrockOffset % gridSize + Math.sin(y * 0.02 + bedrockOffset * 0.01) * 10, y);
        }
        bCtx.stroke();
      }

      for(let y = -gridSize; y < h + gridSize; y += gridSize){
        bCtx.beginPath();
        bCtx.moveTo(0, y + bedrockOffset % gridSize);
        for(let x = 0; x < w; x += 10){
          bCtx.lineTo(x, y + bedrockOffset % gridSize + Math.cos(x * 0.02 + bedrockOffset * 0.01) * 10);
        }
        bCtx.stroke();
      }

      // Floating crystalline shards
      bCtx.fillStyle = `rgba(${rgb}, 0.06)`;
      for(let i = 0; i < 15; i++){
        const sx = (w * 0.2 + i * w * 0.05 + bedrockOffset * 0.5) % (w + 100) - 50;
        const sy = (h * 0.3 + Math.sin(i + bedrockOffset * 0.01) * h * 0.3);
        bCtx.save();
        bCtx.translate(sx, sy);
        bCtx.rotate(bedrockOffset * 0.005 + i);
        bCtx.beginPath();
        bCtx.moveTo(0, -15);
        bCtx.lineTo(12, 5);
        bCtx.lineTo(-8, 10);
        bCtx.closePath();
        bCtx.fill();
        bCtx.restore();
      }

      // Core pulse at center
      const pulse = Math.sin(bedrockOffset * 0.02) * 0.5 + 0.5;
      const coreGrad = bCtx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 200);
      coreGrad.addColorStop(0, `rgba(${rgb}, ${0.08 * pulse})`);
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
      bCtx.fillStyle = coreGrad;
      bCtx.fillRect(0, 0, w, h);

      bCtx.globalAlpha = 1;
    }

    // Layer visibility control
    function updateLayers(){
      sunsetCanvas.classList.toggle('active', scrollDepth < 0.35);
      cityCanvas.classList.toggle('active', scrollDepth > 0.1 && scrollDepth < 0.6);
      tunnelCanvas.classList.toggle('active', scrollDepth > 0.35 && scrollDepth < 0.85);
      bedrockCanvas.classList.toggle('active', scrollDepth > 0.6);
      vignette.classList.toggle('active', scrollDepth > 0.2);
      scanlines.classList.toggle('active', scrollDepth > 0.15);
    }

    // Master render loop
    function tick(){
      sCtx.clearRect(0, 0, w, h);
      cCtx.clearRect(0, 0, w, h);
      tCtx.clearRect(0, 0, w, h);
      bCtx.clearRect(0, 0, w, h);

      drawSunset();
      drawCity();
      drawTunnel();
      drawBedrock();
      updateLayers();

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // ===== GTA-STYLE DATA PACKETS =====
    // Floating mission-style text on scroll
    const packetTexts = [
      'WANTED LEVEL: 5','ROOT@LOS_SANTOS','BYPASSING FIREWALL','0xDEADBEEF',
      'PAYLOAD INJECTED','TRACE ROUTE...','DEEP WEB ACCESS','ENCRYPTING PACKET',
      'SYSTEM BREACH','BACKDOOR OPEN','PROXY CHAIN: ON','VPN: ACTIVE',
      'NMAP SCANNING...','METASPLOIT READY','WIRESHARK CAPTURING'
    ];
    const activePackets = [];

    function spawnPacket(){
      if(activePackets.length > 6) return;
      const el = document.createElement('div');
      el.className = 'gta-packet';
      el.textContent = packetTexts[Math.floor(Math.random() * packetTexts.length)];
      const side = Math.random() > 0.5 ? 'left' : 'right';
      el.style[side] = (5 + Math.random() * 15) + '%';
      el.style.top = (window.scrollY + Math.random() * window.innerHeight * 0.7) + 'px';
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('active'));
      activePackets.push({el, born: performance.now()});
    }

    let lastScroll = window.scrollY;
    window.addEventListener('scroll', () => {
      const v = Math.abs(window.scrollY - lastScroll);
      lastScroll = window.scrollY;
      if(v > 5 && Math.random() > 0.75) spawnPacket();
    }, { passive: true });

    setInterval(() => {
      const now = performance.now();
      for(let i = activePackets.length - 1; i >= 0; i--){
        const p = activePackets[i];
        if(now - p.born > 3000){
          p.el.classList.remove('active');
          setTimeout(() => p.el.remove(), 500);
          activePackets.splice(i, 1);
        }
      }
    }, 200);
  })();

})();

(function(){
  const container = document.getElementById('tech-canvas-container');
  const tooltip = document.getElementById('tech-tooltip');
  if(!container) return;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CATEGORY_COLOR = {
    frontend: 0xff2d2d,
    programming: 0x9b30ff,
    robotics: 0xd946ef,
    tools: 0xf2f2f2,
    cybersecurity: 0xff5050
  };
  const CATEGORY_LABEL = {
    frontend: 'Frontend', programming: 'Programming', robotics: 'Robotics',
    tools: 'Tools', cybersecurity: 'Cybersecurity'
  };
  const TECHS = [
    ['HTML','frontend'], ['CSS','frontend'], ['JavaScript','frontend'],
    ['Python','programming'], ['C','programming'], ['C++','programming'],
    ['Arduino','robotics'], ['Arduino Nano','robotics'], ['Arduino Uno','robotics'], ['ESP32','robotics'],
    ['Git','tools'], ['GitHub','tools'], ['VS Code','tools'], ['Figma','tools'],
    ['Linux','cybersecurity'], ['Kali Linux','cybersecurity'], ['Nmap','cybersecurity']
  ];

  let renderer, scene, camera, controls, composer;
  let coreWord, corePulseLight;
  let starfield;
  const nodes = [];
  let isVisible = true;
  let rafId = null;

  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2(-999, -999);
  const targetMouseNDC = new THREE.Vector2(-999, -999);
  const planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const mouseWorld = new THREE.Vector3(-999, -999, 0);
  let hovered = null;
  let pointerActive = false;
  let magnetized = false;
  let magnetProgress = 0; // 0 = normal orbit, 1 = fully collapsed into the core

  const P = {
    coreRadius: 1.7,
    nodeRadius: 0.44,
    orbitBand: 4.1,
    damping: 0.93,
    attraction: 0.0026,
    repulsionForce: 0.09,
    repulsionRadius: 2.6,
    collisionForce: 0.22,
    ambientDrift: 0.0016
  };

  function makeLabelTexture(text){
    const c = document.createElement('canvas');
    c.width = 512; c.height = 160;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.font = '600 54px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#f5f5f7';
    ctx.fillText(text, c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  const TECH_MARKS = {
    'HTML': 'HTML', 'CSS': 'CSS', 'JavaScript': 'JS', 'Python': 'Py',
    'C': 'C', 'C++': 'C++', 'Arduino': '∞', 'Arduino Nano': 'NANO',
    'Arduino Uno': 'UNO', 'ESP32': 'ESP32', 'Git': 'Git', 'GitHub': 'GH',
    'VS Code': '</>', 'Figma': 'F', 'Linux': 'LINUX', 'Kali Linux': 'KALI',
    'Nmap': 'NMAP'
  };

  function makeTechLogoTexture(name, color){
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const mark = TECH_MARKS[name] || name;
    const isSymbol = mark === '∞' || mark === '</>';
    const longMark = mark.length > 4;
    ctx.clearRect(0, 0, 256, 256);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 10;
    ctx.font = `800 ${isSymbol ? 126 : longMark ? 52 : 88}px "Space Grotesk", sans-serif`;
    ctx.fillText(mark, 128, 132);
    const texture = new THREE.CanvasTexture(c);
    texture.needsUpdate = true;
    return texture;
  }

  function init(){
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch(e){
      document.body.classList.add('no-webgl');
      return false;
    }
    if(!renderer){ document.body.classList.add('no-webgl'); return false; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.insertBefore(renderer.domElement, container.firstChild);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.028);

    camera = new THREE.PerspectiveCamera(46, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0.6, 11.5);

    // ---- lighting (Neon Purple/Blue Theme) ----
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(4, 6, 8);
    scene.add(dir);
    const blueGlow = new THREE.PointLight(0x00f0ff, 2.5, 22);
    blueGlow.position.set(-5, -3, 3);
    scene.add(blueGlow);
    const purpleGlow = new THREE.PointLight(0x9b30ff, 2.2, 22);
    purpleGlow.position.set(5, 4, -3);
    scene.add(purpleGlow);
    corePulseLight = new THREE.PointLight(0x00f0ff, 3.0, 10);
    corePulseLight.position.set(0, 0, 0);
    scene.add(corePulseLight);

    // ---- Q4XY centerpiece: actual extruded letter geometry, with no backing shape ----
    const polygon = (points) => {
      const shape = new THREE.Shape();
      shape.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
      shape.closePath();
      return shape;
    };
    const q = new THREE.Shape();
    q.absellipse(-1.18, 0, 0.38, 0.48, 0, Math.PI * 2, false, 0);
    const qHole = new THREE.Path();
    qHole.absellipse(-1.18, 0, 0.20, 0.29, 0, Math.PI * 2, true, 0);
    q.holes.push(qHole);
    const letters = [
      q,
      polygon([[-1.08, -0.10], [-0.90, -0.22], [-0.66, -0.56], [-0.84, -0.56]]),
      polygon([[-0.52, 0.48], [-0.14, 0.48], [-0.14, -0.56], [-0.35, -0.56], [-0.35, -0.14], [-0.72, -0.14], [-0.72, 0.04]]),
      polygon([[-0.72, 0.04], [-0.35, 0.04], [-0.35, -0.14], [-0.72, -0.14]]),
      polygon([[-0.02, 0.48], [0.20, 0.48], [0.43, 0.14], [0.66, 0.48], [0.88, 0.48], [0.55, -0.04], [0.90, -0.56], [0.67, -0.56], [0.43, -0.20], [0.19, -0.56], [-0.04, -0.56], [0.31, -0.04]]),
      polygon([[0.96, 0.48], [1.19, 0.48], [1.41, 0.13], [1.63, 0.48], [1.86, 0.48], [1.52, -0.08], [1.52, -0.56], [1.30, -0.56], [1.30, -0.08]])
    ];
    const wordGeo = new THREE.ExtrudeGeometry(letters, {
      depth: 0.18, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.018, bevelSegments: 2
    });
    wordGeo.center();
    coreWord = new THREE.Mesh(wordGeo, new THREE.MeshStandardMaterial({
      color: 0xdce8ff, metalness: 0.72, roughness: 0.24, emissive: 0x102040, emissiveIntensity: 0.22
    }));
    coreWord.scale.setScalar(0.92);
    scene.add(coreWord);

    // ---- tech nodes ----
    const glassGeo = new THREE.SphereGeometry(P.nodeRadius, 24, 24);

    TECHS.forEach(([name, cat]) => {
      const group = new THREE.Group();
      const color = CATEGORY_COLOR[cat] || 0xffffff;

      const glass = new THREE.Mesh(glassGeo, new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0.05, roughness: 0.08, transparent: true,
        opacity: 0.22, clearcoat: 1.0, clearcoatRoughness: 0.1
      }));
      group.add(glass);

      const logo = new THREE.Mesh(new THREE.PlaneGeometry(P.nodeRadius * 1.45, P.nodeRadius * 1.45), new THREE.MeshBasicMaterial({
        map: makeTechLogoTexture(name, color), transparent: true, depthWrite: false, side: THREE.DoubleSide
      }));
      logo.position.z = P.nodeRadius + 0.012;
      group.add(logo);

      const label = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeLabelTexture(name), transparent: true, depthWrite: false
      }));
      const aspect = 512 / 160;
      const labelH = 0.62;
      label.scale.set(labelH * aspect, labelH, 1);
      label.position.set(0, P.nodeRadius + 0.42, 0);
      group.add(label);

      const angle = Math.random() * Math.PI * 2;
      const polar = Math.acos((Math.random() * 2) - 1);
      const radius = P.coreRadius + 1.8 + Math.random() * 2.2;
      group.position.set(
        radius * Math.sin(polar) * Math.cos(angle),
        radius * Math.sin(polar) * Math.sin(angle) * 0.72,
        radius * Math.cos(polar)
      );

      group.userData = {
        name, cat, glass, logo,
        baseScale: 1,
        velocity: new THREE.Vector3((Math.random()-0.5)*0.01, (Math.random()-0.5)*0.01, (Math.random()-0.5)*0.01),
        mass: 0.85 + Math.random() * 0.4
      };
      scene.add(group);
      nodes.push(group);
    });

    // ---- starfield backdrop for depth ----
    const starCount = 260;
    const starPos = new Float32Array(starCount * 3);
    for(let i = 0; i < starCount; i++){
      const r = 14 + Math.random() * 16;
      const a = Math.random() * Math.PI * 2;
      const p = Math.acos((Math.random() * 2) - 1);
      starPos[i*3]     = r * Math.sin(p) * Math.cos(a);
      starPos[i*3 + 1] = r * Math.sin(p) * Math.sin(a);
      starPos[i*3 + 2] = r * Math.cos(p);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starfield = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.045, transparent: true, opacity: 0.5, sizeAttenuation: true
    }));
    scene.add(starfield);

    // ---- orbit controls: drag to rotate, gentle idle auto-rotation ----
    if(THREE.OrbitControls){
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.autoRotate = !reducedMotion;
      controls.autoRotateSpeed = 0.55;
      controls.minPolarAngle = Math.PI * 0.28;
      controls.maxPolarAngle = Math.PI * 0.72;
      controls.target.set(0, 0, 0);
    }

    // ---- bloom for the real glow ----
    try {
      if(THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass){
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene, camera));
        const bloom = new THREE.UnrealBloomPass(
          new THREE.Vector2(container.clientWidth, container.clientHeight), 1.0, 0.6, 0.15
        );
        composer.addPass(bloom);
      }
    } catch(e){ composer = null; }

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);
    container.addEventListener('pointerdown', () => { pointerActive = true; });
    window.addEventListener('pointerup', () => { pointerActive = false; });
    window.addEventListener('resize', onResize);

    const magnetBtn = document.getElementById('tech-magnet-btn');
    if(magnetBtn){
      magnetBtn.addEventListener('click', () => {
        magnetized = !magnetized;
        magnetBtn.classList.toggle('active', magnetized);
        magnetBtn.setAttribute('aria-pressed', String(magnetized));
        magnetBtn.querySelector('.tmb-label').textContent = magnetized ? 'Demagnetize' : 'Magnetize';
      });
    }
    new IntersectionObserver((entries) => {
      isVisible = entries[0].isIntersecting;
      if(isVisible && !rafId) animate();
    }, { threshold: 0.08 }).observe(container);

    return true;
  }

  function onResize(){
    if(!camera || !renderer) return;
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if(composer) composer.setSize(w, h);
  }

  function onPointerMove(e){
    const rect = container.getBoundingClientRect();
    targetMouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    targetMouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }
  function onPointerLeave(){
    targetMouseNDC.set(-999, -999);
    setHovered(null);
  }

  function setHovered(node){
    if(hovered === node) return;
    if(hovered){
      hovered.userData.baseScale = 1;
    }
    hovered = node;
    if(hovered){
      hovered.userData.baseScale = 1.35;
      const cat = hovered.userData.cat;
      tooltip.innerHTML = hovered.userData.name + '<span class="cat">' + (CATEGORY_LABEL[cat] || '') + '</span>';
      tooltip.classList.add('visible');
      container.style.cursor = 'pointer';
      markActivated(hovered.userData.name);
    } else {
      tooltip.classList.remove('visible');
      container.style.cursor = 'grab';
    }
  }

  // lightweight "arsenal sync" tie-in with the site's HUD/achievement counters
  let activated;
  try { activated = new Set(JSON.parse(localStorage.getItem('q4xy_arsenal') || '[]')); }
  catch(e){ activated = new Set(); }
  function markActivated(name){
    if(activated.has(name)) return;
    activated.add(name);
    try { localStorage.setItem('q4xy_arsenal', JSON.stringify(Array.from(activated))); } catch(e){}
    const pct = Math.round((activated.size / TECHS.length) * 100);
    const hud = document.getElementById('hud-arsenal-pct');
    if(hud) hud.textContent = pct + '%';
  }

  function updateHoverRaycast(){
    if(targetMouseNDC.x === -999){ setHovered(null); return; }
    raycaster.setFromCamera(mouseNDC, camera);
    const meshes = nodes.map(n => n.userData.glass);
    const hits = raycaster.intersectObjects(meshes, false);
    if(hits.length){
      const idx = meshes.indexOf(hits[0].object);
      setHovered(nodes[idx]);
      const proj = nodes[idx].position.clone().project(camera);
      const x = (proj.x * 0.5 + 0.5) * container.clientWidth;
      const y = (1 - (proj.y * 0.5 + 0.5)) * container.clientHeight;
      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
    } else {
      setHovered(null);
    }
  }

  let t = 0;
  function animate(){
    rafId = requestAnimationFrame(animate);
    if(!isVisible || !renderer) return;
    t += 0.016;

    mouseNDC.lerp(targetMouseNDC, 0.25);
    if(targetMouseNDC.x !== -999){
      raycaster.setFromCamera(mouseNDC, camera);
      raycaster.ray.intersectPlane(planeZ0, mouseWorld);
    }
    updateHoverRaycast();

    // The Q4XY letters are the center object: slow 3D rotation and a gentle float.
    if(coreWord){
      coreWord.rotation.y += 0.004;
      coreWord.rotation.x = Math.sin(t * 0.45) * 0.10;
      coreWord.position.y = Math.sin(t * 0.85) * 0.12;
    }
    corePulseLight.intensity = 1.8 + Math.sin(t * 1.8) * 0.45;

    const isMouseActive = targetMouseNDC.x !== -999;

    // smoothly ease toward the magnetized (collapsed) or normal orbit state
    magnetProgress += ((magnetized ? 1 : 0) - magnetProgress) * 0.045;
    const orbitTarget = THREE.MathUtils.lerp(P.coreRadius + P.orbitBand, P.coreRadius + P.nodeRadius + 0.3, magnetProgress);
    const attractionStrength = THREE.MathUtils.lerp(P.attraction, P.attraction * 11, magnetProgress);
    if(corePulseLight) corePulseLight.intensity += magnetProgress * 1.6;

    for(let i = 0; i < nodes.length; i++){
      const node = nodes[i];
      const ud = node.userData;
      const v = ud.velocity;
      const dist = node.position.length();
      const toCenter = node.position.clone().normalize().negate();

      v.add(toCenter.multiplyScalar((dist - orbitTarget) * attractionStrength));

      if(isMouseActive){
        const dm = node.position.distanceTo(mouseWorld);
        if(dm < P.repulsionRadius){
          const away = node.position.clone().sub(mouseWorld).normalize();
          v.add(away.multiplyScalar(((1 - dm / P.repulsionRadius) * P.repulsionForce) / ud.mass));
        }
      }

      for(let j = i + 1; j < nodes.length; j++){
        const other = nodes[j];
        const d = node.position.distanceTo(other.position);
        const minD = P.nodeRadius * 2.3;
        if(d < minD && d > 0.01){
          const push = node.position.clone().sub(other.position).normalize();
          const force = (minD - d) * P.collisionForce;
          v.add(push.clone().multiplyScalar(force / ud.mass));
          other.userData.velocity.sub(push.clone().multiplyScalar(force / other.userData.mass));
        }
      }

      if(dist < P.coreRadius + P.nodeRadius + 0.3){
        v.add(toCenter.clone().negate().multiplyScalar(((P.coreRadius + P.nodeRadius + 0.3) - dist) * 0.12));
      }

      if(!reducedMotion){
        v.x += (Math.random() - 0.5) * P.ambientDrift;
        v.y += (Math.random() - 0.5) * P.ambientDrift;
        v.z += (Math.random() - 0.5) * P.ambientDrift;
      }

      v.multiplyScalar(P.damping);
      node.position.add(v);

      const targetScale = ud.baseScale;
      const s = THREE.MathUtils.lerp(node.scale.x, targetScale, 0.15);
      node.scale.set(s, s, s);
    }

    if(starfield && !reducedMotion) starfield.rotation.y += 0.0002;

    if(controls) controls.update();
    if(composer) composer.render(); else renderer.render(scene, camera);
  }

  if(init()){
    animate();
  }
})();

    (() => {
      "use strict";

      const bridge = document.getElementById("cyber-tech-bridge");
      if (!bridge) return;

      const target = document.querySelector(
        "#tech-stack-canvas-container, #tech-canvas-container"
      );
      const status = bridge.querySelector("[data-ct-status]");
      const energyLabel = bridge.querySelector("[data-ct-energy]");
      const depthLabel = bridge.querySelector("[data-ct-depth]");
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );

      if (target) {
        target.classList.add("cyber-bridge-target");
        target.setAttribute("aria-hidden", "true");
      }

      const clamp = (value, min = 0, max = 1) =>
        Math.min(max, Math.max(min, value));

      const smoothstep = (value) => {
        const t = clamp(value);
        return t * t * (3 - 2 * t);
      };

      let targetProgress = 0;
      let currentProgress = 0;
      let rafId = 0;
      let sceneActive = false;

      function measureProgress() {
        const rect = bridge.getBoundingClientRect();
        const runway = Math.max(1, bridge.offsetHeight - window.innerHeight);
        targetProgress = clamp(-rect.top / runway);
      }

      function updateTransition(progress) {
        const p = clamp(progress);

        // Approach, ignition, and pass-camera phases.
        const approach = smoothstep(p / 0.78);
        const passCamera = smoothstep((p - 0.74) / 0.26);
        const energy = clamp(approach * 0.72 + passCamera * 0.28);
        const z = -1050 + approach * 1220 + passCamera * 900;
        const scale = 0.22 + approach * 0.68 + passCamera * 0.28;
        const opacity = clamp(1 - passCamera * 1.45);
        const beamOpacity = 0.04 + energy * 0.8;

        bridge.style.setProperty("--ct-progress", p.toFixed(4));
        bridge.style.setProperty("--ct-energy", energy.toFixed(4));
        bridge.style.setProperty("--ct-z", `${z.toFixed(1)}px`);
        bridge.style.setProperty("--ct-scale", scale.toFixed(4));
        bridge.style.setProperty("--ct-opacity", opacity.toFixed(4));
        bridge.style.setProperty("--ct-beam-opacity", beamOpacity.toFixed(4));

        if (energyLabel) {
          energyLabel.textContent = `${String(Math.round(energy * 100)).padStart(2, "0")}%`;
        }
        if (depthLabel) depthLabel.textContent = `${Math.round(z)}`;

        if (status) {
          status.textContent =
            p < 0.2
              ? "approaching core"
              : p < 0.74
                ? "system alignment"
                : p < 0.9
                  ? "core ignition"
                  : "stack online";
        }

        /*
          Crossfade before the vehicle fully exits. The Three.js renderer,
          animation loop, and OrbitControls are not created or modified here.
        */
        if (target) {
          const ready = p >= 0.82;
          target.classList.toggle("cyber-bridge-ready", ready);
          target.setAttribute("aria-hidden", ready ? "false" : "true");
        }
      }

      function render() {
        rafId = 0;
        currentProgress += (targetProgress - currentProgress) * 0.12;

        if (Math.abs(targetProgress - currentProgress) < 0.0005) {
          currentProgress = targetProgress;
        }

        updateTransition(currentProgress);

        if (
          sceneActive &&
          Math.abs(targetProgress - currentProgress) > 0.0005
        ) {
          rafId = window.requestAnimationFrame(render);
        }
      }

      function requestUpdate() {
        measureProgress();
        if (!rafId) rafId = window.requestAnimationFrame(render);
      }

      function onScroll() {
        const rect = bridge.getBoundingClientRect();
        sceneActive = rect.bottom > 0 && rect.top < window.innerHeight;
        if (sceneActive) requestUpdate();
      }

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", requestUpdate, { passive: true });

      if (reducedMotion.matches) {
        bridge.style.setProperty("--ct-progress", "1");
        bridge.style.setProperty("--ct-opacity", "0");
        if (target) {
          target.classList.add("cyber-bridge-ready");
          target.setAttribute("aria-hidden", "false");
        }
      } else {
        sceneActive = true;
        requestUpdate();
      }

      /*
        Supports pages where the existing Three.js target is mounted later.
        This observer stops immediately after the target is found.
      */
      if (!target) {
        const observer = new MutationObserver(() => {
          const lateTarget = document.querySelector(
            "#tech-stack-canvas-container, #tech-canvas-container"
          );
          if (!lateTarget) return;

          lateTarget.classList.add("cyber-bridge-target");
          lateTarget.setAttribute("aria-hidden", "true");
          observer.disconnect();
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }

      window.CyberTechTransition = {
        update: requestUpdate,
        get progress() {
          return currentProgress;
        }
      };
    })();

  (function fxModule(){
    const S = (typeof SoundEngine !== 'undefined') ? SoundEngine : null;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;

    /* ---------- 1. Global sci-fi click + hover audio ---------- */
    let lastHover = 0;
    const HOVERABLE = 'a,button,[data-tilt],[data-magnetic],.fx-proj-pill,.wf-card,.link-card,.project-zigzag';
    document.addEventListener('pointerover', (e) => {
      if(!S || !S.isEnabled()) return;
      const t = e.target.closest && e.target.closest(HOVERABLE);
      if(!t) return;
      const now = performance.now();
      if(now - lastHover < 90) return;
      lastHover = now;
      S.key();
    }, { passive: true });
    document.addEventListener('pointerdown', (e) => {
      if(!S || !S.isEnabled()) return;
      if(e.target.closest && e.target.closest('a,button,[data-ripple],.fx-proj-pill')) S.click();
    }, { passive: true });

    /* ---------- 3. Velocity-reactive particle grid ---------- */
    const canvas = document.getElementById('fx-grid-canvas');
    if(canvas && !reduced){
      const ctx = canvas.getContext('2d');
      let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
      const dots = [];
      function accent(){
        return getComputedStyle(document.body).getPropertyValue('--accent-red').trim() || '#ff2d2d';
      }
      function build(){
        w = canvas.width = Math.floor(innerWidth * dpr);
        h = canvas.height = Math.floor(innerHeight * dpr);
        canvas.style.width = innerWidth + 'px';
        canvas.style.height = innerHeight + 'px';
        dots.length = 0;
        const gap = 74 * dpr;
        for(let x = gap/2; x < w; x += gap){
          for(let y = gap/2; y < h; y += gap){
            dots.push({ x, y, ox: x, oy: y, p: Math.random() * Math.PI * 2 });
          }
        }
      }
      build();
      addEventListener('resize', build, { passive: true });

      let vel = 0, lastY = scrollY;
      addEventListener('scroll', () => {
        vel += Math.min(Math.abs(scrollY - lastY), 90);
        lastY = scrollY;
      }, { passive: true });
      window.__fxVelocity = () => vel;

      let t = 0;
      (function draw(){
        t += 0.016;
        vel *= 0.92;
        ctx.clearRect(0, 0, w, h);
        const col = accent();
        const boost = Math.min(vel / 40, 1);
        for(const d of dots){
          const wob = Math.sin(t * 1.2 + d.p) * (1.5 + boost * 9) * dpr;
          const px = d.ox + wob;
          const py = d.oy - boost * 16 * dpr * Math.cos(t + d.p);
          const r = (0.9 + boost * 1.5) * dpr;
          ctx.globalAlpha = 0.10 + boost * 0.32;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
        if(boost > 0.12){
          ctx.globalAlpha = boost * 0.09;
          ctx.strokeStyle = col;
          ctx.lineWidth = 1 * dpr;
          for(let y = 0; y < h; y += 74 * dpr){
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        requestAnimationFrame(draw);
      })();
    }

    /* ---------- 4. FPS monitor easter egg (press F) ---------- */
    const fpsBox = document.getElementById('fx-fps');
    if(fpsBox){
      const valEl = document.getElementById('fx-fps-val');
      const msEl = document.getElementById('fx-fps-ms');
      const velEl = document.getElementById('fx-fps-vel');
      const graph = document.getElementById('fx-fps-graph');
      const bars = [];
      for(let i = 0; i < 22; i++){ const b = document.createElement('i'); graph.appendChild(b); bars.push(b); }
      let frames = 0, last = performance.now(), hist = [];
      (function tick(){
        frames++;
        const now = performance.now();
        if(now - last >= 500){
          const fps = Math.round(frames * 1000 / (now - last));
          frames = 0; last = now;
          if(fpsBox.classList.contains('on')){
            valEl.textContent = fps;
            msEl.textContent = (1000 / Math.max(fps, 1)).toFixed(1);
            velEl.textContent = Math.round(window.__fxVelocity ? window.__fxVelocity() : 0);
            hist.push(fps); if(hist.length > bars.length) hist.shift();
            bars.forEach((b, i) => {
              const v = hist[i] || 0;
              b.style.height = Math.max(1, Math.min(v / 70, 1) * 20) + 'px';
            });
          }
        }
        requestAnimationFrame(tick);
      })();
      document.addEventListener('keydown', (e) => {
        if(e.target.matches('input,textarea')) return;
        if(e.key === 'f' || e.key === 'F'){
          fpsBox.classList.toggle('on');
          if(S) S.click();
        }
      });
    }

    /* ---------- 5. Project filter pills with FLIP shuffle ---------- */
    const list = document.querySelector('#projects .projects-list');
    if(list){
      const cards = Array.from(list.querySelectorAll('.project-zigzag'));
      const CATS = [
        { id: 'all', label: 'ALL' },
        { id: 'hardwar3', label: 'HARDWAR3' },
        { id: 'softwar3', label: 'SOFTWAR3' },
        { id: 'Cyb3rS3curity', label: 'Cyb3rS3curity' }
      ];
      cards.forEach(c => {
        const blob = ((c.dataset.tag || '') + ' ' + (c.dataset.stack || '')).toLowerCase();
        let cat = 'softwar3';
        if(/hardware|arduino|esp32|iot|robot/.test(blob)) cat = 'hardwar3';
        if(/redteam|pentest|security|deauth|wireshark/.test(blob)) cat = 'Cyb3rS3curity';
        c.dataset.cat = cat;
      });

      const bar = document.createElement('div');
      bar.className = 'fx-proj-filters';
      CATS.forEach((c, i) => {
        const b = document.createElement('button');
        b.className = 'fx-proj-pill' + (i === 0 ? ' active' : '');
        b.textContent = c.label;
        b.dataset.filter = c.id;
        bar.appendChild(b);
      });
      list.parentNode.insertBefore(bar, list);

      bar.addEventListener('click', (e) => {
        const btn = e.target.closest('.fx-proj-pill');
        if(!btn) return;
        bar.querySelectorAll('.fx-proj-pill').forEach(p => p.classList.toggle('active', p === btn));
        const f = btn.dataset.filter;
        if(S) S.whoosh();

        const first = new Map();
        cards.forEach(c => first.set(c, c.getBoundingClientRect()));
        cards.forEach(c => {
          const show = f === 'all' || c.dataset.cat === f;
          c.classList.toggle('fx-hidden', !show);
        });
        cards.forEach(c => {
          if(c.classList.contains('fx-hidden')) return;
          const a = c.getBoundingClientRect();
          const b = first.get(c);
          const dy = b.top - a.top;
          if(!dy || reduced) { c.classList.add('fx-flip'); return; }
          c.classList.remove('fx-flip');
          c.style.transform = `translateY(${dy}px)`;
          requestAnimationFrame(() => {
            c.classList.add('fx-flip');
            c.style.transform = '';
          });
        });
      });
    }

    /* ---------- 6. Collapsible live CLI ---------- */
    const cli = document.getElementById('fx-cli');
    if(cli){
      const toggle = document.getElementById('fx-cli-toggle');
      const out = document.getElementById('fx-cli-out');
      const form = document.getElementById('fx-cli-form');
      const input = document.getElementById('fx-cli-input');
      const hist = []; let hi = 0;

      function line(text, cls){
        const d = document.createElement('div');
        d.className = 'l ' + (cls || '');
        d.innerHTML = text;
        out.appendChild(d);
        out.scrollTop = out.scrollHeight;
      }
      line('q4xy live shell v1.0 — type <b>help</b> for commands.', 'dim');

      function setOpen(open){
        cli.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if(open) setTimeout(() => input.focus(), 220);
        if(S) S.click();
      }
      toggle.addEventListener('click', () => setOpen(!cli.classList.contains('open')));
      document.addEventListener('keydown', (e) => {
        if(e.key === '~' || (e.key === '`' && !e.ctrlKey && !e.metaKey)){
          if(e.target.matches('input,textarea')) return;
          e.preventDefault();
          setOpen(!cli.classList.contains('open'));
        }
        if(e.key === 'Escape' && cli.classList.contains('open')) setOpen(false);
      });

      const CMDS = {
        help(){
          line('AVAILABLE COMMANDS', 'acc');
          line('  help      — this list');
          line('  skills    — technical arsenal');
          line('  projects  — current operations');
          line('  contact   — reach me');
          line('  theme     — cycle accent theme');
          line('  fps       — toggle perf monitor');
          line('  clear     — wipe output');
        },
        skills(){
          line('ARSENAL', 'acc');
          line('  Web      HTML · CSS · JavaScript · Three.js');
          line('  Code     Python · C++ · Java');
          line('  Hardware Arduino · ESP32 · Sensor Fusion · IoT');
          line('  Ops      Git · Linux · Kali · Server Ops');
        },
        projects(){
          line('OPERATIONS', 'acc');
          document.querySelectorAll('#projects .project-zigzag').forEach(c => {
            line('  > ' + (c.dataset.title || '') + '  [' + (c.dataset.cat || '').toUpperCase() + ']');
          });
          line('  tip: use the filter pills in PROJECTS.', 'dim');
        },
        contact(){
          line('CHANNELS', 'acc');
          line('  email   saravanan1980robot@gmail.com');
          line('  github  github.com/q4xy');
          line('  links   guns.lol/q4xy');
        },
        theme(){
          const order = ['red','cyan','green','amber'];
          const cur = order.find(t => document.body.classList.contains(t + '-theme')) || 'red';
          const next = order[(order.indexOf(cur) + 1) % order.length];
          order.forEach(t => document.body.classList.remove(t + '-theme'));
          if(next !== 'red') document.body.classList.add(next + '-theme');
          line('theme → ' + next.toUpperCase(), 'acc');
        },
        fps(){
          if(fpsBox){ fpsBox.classList.toggle('on'); line('perf monitor toggled (shortcut: F)', 'acc'); }
        },
        clear(){ out.innerHTML = ''; }
      };

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const raw = input.value.trim();
        input.value = '';
        if(!raw) return;
        hist.push(raw); hi = hist.length;
        line('<span style="color:var(--accent-red)">&gt;</span> ' + raw.replace(/</g,'&lt;'));
        const fn = CMDS[raw.toLowerCase().split(' ')[0]];
        if(fn){ fn(); if(S) S.success(); }
        else { line("command not found: " + raw.replace(/</g,'&lt;') + " — try 'help'", 'dim'); if(S) S.error(); }
      });
      input.addEventListener('keydown', (e) => {
        if(e.key === 'ArrowUp'){ e.preventDefault(); if(hi > 0){ hi--; input.value = hist[hi]; } }
        else if(e.key === 'ArrowDown'){ e.preventDefault(); if(hi < hist.length - 1){ hi++; input.value = hist[hi]; } else { hi = hist.length; input.value = ''; } }
      });
    }
  })();

  (function kineticGridBackground(){
    const canvas = document.getElementById('fx-kinetic-canvas');
    if(!canvas) return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){ canvas.style.display = 'none'; return; }
    const ctx = canvas.getContext('2d', { alpha: true });
    if(!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = window.innerWidth, h = window.innerHeight;

    const CELL_SIZE = 62;
    const INFLUENCE_RADIUS = 240;
    const MAX_WARP = 20;
    const DOT_SPACING = 30;
    const LERP_SPEED = 0.08;
    const LINE_BASE = { r: 255, g: 255, b: 255, a: 0.1 };

    function getBgFocus(){
      const f = window.__q4xyBgFocus;
      return (f && typeof f.value === 'number') ? f.value : 1;
    }

    function lerpN(a, b, t){ return a + (b - a) * t; }
    function lerpColor(base, ar, ag, ab, aAlpha, t){
      const r = Math.round(lerpN(base.r, ar, t));
      const g = Math.round(lerpN(base.g, ag, t));
      const bch = Math.round(lerpN(base.b, ab, t));
      const a = lerpN(base.a, aAlpha, t);
      return 'rgba(' + r + ',' + g + ',' + bch + ',' + a.toFixed(3) + ')';
    }

    function resize(){
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(resize, 160); }, { passive:true });

    const mouse = { x: -9999, y: -9999 };
    const targetMouse = { x: -9999, y: -9999 };
    const ripples = [];

    window.addEventListener('pointermove', (e) => { targetMouse.x = e.clientX; targetMouse.y = e.clientY; }, { passive:true });
    window.addEventListener('pointerdown', (e) => {
      ripples.push({ x: e.clientX, y: e.clientY, radius: 0, opacity: 1, born: performance.now() });
    }, { passive:true });

    let visible = true;
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; scheduleIfNeeded(); });

    // Only the active background mode should actually compute each frame —
    // the other modes stay fully paused, not just hidden behind opacity:0.
    let active = !window.__q4xyBgMode || window.__q4xyBgMode.current === 'kinetic';
    let raf = null;
    function scheduleIfNeeded(){
      if(active && visible && raf === null) raf = requestAnimationFrame(frame);
    }
    if(window.__q4xyBgMode){
      window.__q4xyBgMode.subscribe((m) => { active = (m === 'kinetic'); scheduleIfNeeded(); });
    }

    function getWarpedPoint(gx, gy, col, row, cols, rows, focus){
      const edgeMargin = 1.5;
      const colPin = Math.min(col / edgeMargin, (cols - 1 - col) / edgeMargin, 1);
      const rowPin = Math.min(row / edgeMargin, (rows - 1 - row) / edgeMargin, 1);
      const pinFactor = colPin * colPin * rowPin * rowPin;

      const dx = gx - mouse.x, dy = gy - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pinFactor;

      let rx = 0, ry = 0;
      for(let i = 0; i < ripples.length; i++){
        const r = ripples[i];
        const rdx = gx - r.x, rdy = gy - r.y;
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
        const waveWidth = 55;
        const diff = rdist - r.radius;
        if(Math.abs(diff) < waveWidth){
          const strength = (1 - Math.abs(diff) / waveWidth) * r.opacity * 16 * pinFactor * focus;
          const angle = Math.atan2(rdy, rdx);
          const sign = diff < 0 ? -1 : 1;
          rx += Math.cos(angle) * strength * sign * -1;
          ry += Math.sin(angle) * strength * sign * -1;
        }
      }

      if(dist < INFLUENCE_RADIUS && dist > 0 && pinFactor > 0){
        const t = dist / INFLUENCE_RADIUS;
        const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
        const warpAmt = eased * MAX_WARP * pinFactor * focus;
        const angle = Math.atan2(dy, dx);
        return { x: gx - Math.cos(angle) * warpAmt + rx, y: gy - Math.sin(angle) * warpAmt + ry, proximity };
      }
      return { x: gx + rx, y: gy + ry, proximity };
    }

    let last = performance.now();
    function frame(now){
      raf = null;
      if(!active || !visible) { last = now; return; }
      scheduleIfNeeded();
      let dt = (now - last) / 1000;
      last = now;
      if(dt > 0.05) dt = 0.05;

      mouse.x = lerpN(mouse.x, targetMouse.x, LERP_SPEED);
      mouse.y = lerpN(mouse.y, targetMouse.y, LERP_SPEED);

      const focus = getBgFocus();
      // Fixed black-and-white palette — brighter white near the cursor,
      // not tinted by the site's active accent theme (that stays reserved
      // for Matrix).
      const lineActive = { r: 255, g: 255, b: 255, a: 0.9 };
      const nodeActive = { r: 255, g: 255, b: 255, a: 1 };
      const glow = '255,255,255';
      const rippleColor = '255,255,255';

      ctx.clearRect(0, 0, w, h);

      // faint static dot texture — subtle, always present
      ctx.fillStyle = 'rgba(255,255,255,' + (0.045 * (0.5 + 0.5 * focus)) + ')';
      for(let x = DOT_SPACING / 2; x < w; x += DOT_SPACING){
        for(let y = DOT_SPACING / 2; y < h; y += DOT_SPACING){
          ctx.beginPath();
          ctx.arc(x, y, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // update ripples
      for(let i = ripples.length - 1; i >= 0; i--){
        const r = ripples[i];
        const age = (now - r.born) / 1000;
        r.radius = Math.max(0, age * 380);
        r.opacity = Math.max(0, 1 - age * 1.2);
        if(r.opacity <= 0) ripples.splice(i, 1);
      }

      const cols = Math.max(2, Math.ceil(w / CELL_SIZE)) + 1;
      const rows = Math.max(2, Math.ceil(h / CELL_SIZE)) + 1;
      const cellW = w / (cols - 1);
      const cellH = h / (rows - 1);

      const pts = [];
      const prox = [];
      for(let row = 0; row < rows; row++){
        pts[row] = []; prox[row] = [];
        for(let col = 0; col < cols; col++){
          const p = getWarpedPoint(col * cellW, row * cellH, col, row, cols, rows, focus);
          pts[row][col] = p; prox[row][col] = p.proximity;
        }
      }

      function drawSeg(p1, p2, pr1, pr2){
        const avg = ((pr1 + pr2) / 2) * focus;
        const t = avg * avg * (3 - 2 * avg);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = lerpColor(LINE_BASE, lineActive.r, lineActive.g, lineActive.b, lineActive.a, t);
        ctx.lineWidth = lerpN(0.7, 1.4, t);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      for(let row = 0; row < rows; row++)
        for(let col = 0; col < cols - 1; col++)
          drawSeg(pts[row][col], pts[row][col+1], prox[row][col], prox[row][col+1]);
      for(let col = 0; col < cols; col++)
        for(let row = 0; row < rows - 1; row++)
          drawSeg(pts[row][col], pts[row+1][col], prox[row][col], prox[row+1][col]);

      for(let row = 0; row < rows; row++){
        for(let col = 0; col < cols; col++){
          const p = pts[row][col];
          const pr = prox[row][col] * focus;
          const t = pr * pr * (3 - 2 * pr);
          const r = lerpN(1.6, 2.9, t);
          if(t > 0.3){
            const glowR = r + lerpN(0, 5, (t - 0.3) / 0.7);
            const grd = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, glowR);
            grd.addColorStop(0, 'rgba(' + glow + ',' + (t * 0.28).toFixed(3) + ')');
            grd.addColorStop(1, 'rgba(' + glow + ',0)');
            ctx.beginPath();
            ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = lerpColor({ r:255, g:255, b:255, a:0.16 }, nodeActive.r, nodeActive.g, nodeActive.b, nodeActive.a, t);
          ctx.fill();
        }
      }

      for(let i = 0; i < ripples.length; i++){
        const r = ripples[i];
        const safeRadius = Math.max(0, r.radius);
        ctx.beginPath();
        ctx.arc(r.x, r.y, safeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + rippleColor + ',' + (r.opacity * 0.26 * focus).toFixed(3) + ')';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
    scheduleIfNeeded();
  })();

  (function contactConsole(){
    const box = document.getElementById('contact-console');
    const btn = document.getElementById('cc-copy-btn');
    const EMAIL = 'saravanan1980robot@gmail.com';
    if(box){
      const setH = () => box.style.setProperty('--cc-h', box.offsetHeight + 'px');
      setH(); window.addEventListener('resize', setH, { passive:true });
    }
    if(!btn) return;
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(EMAIL); }
      catch(e){
        const ta = document.createElement('textarea');
        ta.value = EMAIL; ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch(_){}
        ta.remove();
      }
      const old = btn.textContent;
      btn.textContent = 'COPIED \u2713';
      btn.classList.add('done');
      if(window.showToast) window.showToast('EMAIL COPIED', EMAIL);
      setTimeout(() => { btn.textContent = old; btn.classList.remove('done'); }, 1800);
    });
  })();

  (function dotFieldBackground(){
    const canvas = document.getElementById('fx-dots-canvas');
    if(!canvas) return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){ canvas.style.display = 'none'; return; }
    const ctx = canvas.getContext('2d', { alpha: true });
    if(!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = window.innerWidth, h = window.innerHeight;

    const SPACING = 30;          // grid spacing in CSS px
    const BASE_R = 1.1;          // resting dot radius
    const MAX_R = 4.6;           // dot radius right at the cursor
    const INFLUENCE = 170;       // px radius of cursor influence
    const BASE_A = 0.16;         // resting dot alpha (fixed white/black-and-white palette)
    const MAX_A = 0.95;          // alpha right at the cursor
    const LERP_SPEED = 0.12;     // how quickly the tracked pointer eases toward the real one

    function resize(){
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(resize, 160); }, { passive:true });

    const mouse = { x: -9999, y: -9999 };
    const targetMouse = { x: -9999, y: -9999 };
    window.addEventListener('pointermove', (e) => { targetMouse.x = e.clientX; targetMouse.y = e.clientY; }, { passive:true });
    window.addEventListener('pointerleave', () => { targetMouse.x = -9999; targetMouse.y = -9999; }, { passive:true });

    let visible = true;
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; scheduleIfNeeded(); });

    // Only the active background mode should actually compute each frame —
    // the other modes stay fully paused, not just hidden behind opacity:0.
    let active = !window.__q4xyBgMode || window.__q4xyBgMode.current === 'dots';
    let raf = null;
    function scheduleIfNeeded(){
      if(active && visible && raf === null) raf = requestAnimationFrame(frame);
    }
    if(window.__q4xyBgMode){
      window.__q4xyBgMode.subscribe((m) => { active = (m === 'dots'); scheduleIfNeeded(); });
    }

    function lerpN(a, b, t){ return a + (b - a) * t; }

    function frame(){
      raf = null;
      if(!active || !visible){ return; }
      scheduleIfNeeded();

      mouse.x = lerpN(mouse.x, targetMouse.x, LERP_SPEED);
      mouse.y = lerpN(mouse.y, targetMouse.y, LERP_SPEED);

      ctx.clearRect(0, 0, w, h);

      // Fixed black-and-white palette — brighter/larger near the cursor,
      // never tinted by the site's active accent theme (that stays
      // reserved for Matrix).
      for(let x = SPACING / 2; x < w; x += SPACING){
        for(let y = SPACING / 2; y < h; y += SPACING){
          const dx = x - mouse.x, dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let t = Math.max(0, 1 - dist / INFLUENCE);
          t = t * t * (3 - 2 * t); // smoothstep, matches the site's other bg modes

          const r = lerpN(BASE_R, MAX_R, t);
          const a = lerpN(BASE_A, MAX_A, t);

          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
          ctx.fill();

          if(t > 0.35){
            const glowR = r + lerpN(0, 7, (t - 0.35) / 0.65);
            const grd = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowR);
            grd.addColorStop(0, 'rgba(255,255,255,' + (t * 0.22).toFixed(3) + ')');
            grd.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.beginPath();
            ctx.arc(x, y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
          }
        }
      }
    }
    scheduleIfNeeded();
  })();

  (function backgroundModeSwitcher(){
    const buttons = document.querySelectorAll('.bg-terminal-item');
    const trigger = document.getElementById('bg-terminal-trigger');
    const menu = document.getElementById('bg-terminal-menu');
    const STORE_KEY = 'q4xy_bg_mode';

    function applyMode(mode){
      document.body.setAttribute('data-bg-mode', mode);
      if(window.__q4xyBgMode) window.__q4xyBgMode.set(mode);
      try { localStorage.setItem(STORE_KEY, mode); } catch(e){}
      buttons.forEach(b => {
        const active = b.dataset.bg === mode;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    }

    let mode = 'matrix';
    try { mode = localStorage.getItem(STORE_KEY) || 'matrix'; } catch(e){}
    applyMode(mode);

    if(trigger && menu){
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = menu.classList.toggle('show');
        trigger.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', (e) => {
        if(!menu.contains(e.target) && e.target !== trigger){
          menu.classList.remove('show');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        applyMode(btn.dataset.bg);
        if(menu){ menu.classList.remove('show'); }
        if(trigger){ trigger.setAttribute('aria-expanded', 'false'); }
      });
    });

    // suppress the active wallpaper background while hovering/interacting with the 3D tech sphere
    // (in addition to the section-based dimming below — a nice extra while actively playing with orbs)
    const techCard = document.getElementById('tech-canvas-container');
    if(techCard){
      techCard.addEventListener('pointerenter', () => document.body.classList.add('bg-hover-suppress'));
      techCard.addEventListener('pointerleave', () => document.body.classList.remove('bg-hover-suppress'));
    }
  })();

  (function bgFocusController(){
    const state = { target: 1, value: 1 };
    window.__q4xyBgFocus = state;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;

    const techEl = document.getElementById('tech');
    if(techEl && 'IntersectionObserver' in window){
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          state.target = entry.isIntersecting ? 0.16 : 1;
        });
      }, { threshold: 0.12, rootMargin: '-6% 0px -6% 0px' });
      obs.observe(techEl);
    }

    if(reducedMotion){
      // still dim near Tech Stack for reduced-motion users, just without an animated ease
      state.value = state.target;
      root.style.setProperty('--bg-focus', String(state.target));
      const obs2 = techEl && 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          state.value = state.target = entry.isIntersecting ? 0.16 : 1;
          root.style.setProperty('--bg-focus', String(state.value));
        });
      }, { threshold: 0.12 }) : null;
      if(obs2 && techEl) obs2.observe(techEl);
      return;
    }

    let visible = true;
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

    let last = performance.now();
    function tick(now){
      requestAnimationFrame(tick);
      if(!visible) { last = now; return; }
      let dt = (now - last) / 1000;
      last = now;
      if(dt > 0.1) dt = 0.1;
      state.value += (state.target - state.value) * Math.min(1, dt * 2.4);
      if(Math.abs(state.value - state.target) < 0.001) state.value = state.target;
      root.style.setProperty('--bg-focus', state.value.toFixed(3));
    }
    requestAnimationFrame(tick);
  })();