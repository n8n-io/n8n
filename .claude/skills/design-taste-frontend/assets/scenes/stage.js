// tasteskill / scenes / stage.js — the shared stage every scroll scene runs on (references/scenes.md).
//
// A scene is a tall section whose stage sticks to the viewport while the page scrolls past it; a GSAP
// timeline is scrubbed by that scroll. The page always scrolls natively (no wheel capture), the
// scrollbar always tells the truth, and the finished composition is what reduced motion, no script and
// a failed CDN all show.
//
// Load at the end of <body>, in this order (versions pinned):
//   <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
//   <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js"></script>
//   <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/SplitText.min.js"></script>  (only if a scene splits text)
//   <script src="https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js"></script>     (optional smoothing)
//   <script src="assets/scenes/stage.js"></script>
//   <script src="assets/scenes/<scene>.js"></script>
// and keep the one-line <script>document.documentElement.classList.add('js')</script> in <head>.
//
//   Stage.smooth()                         weighted wheel scrolling (Lenis), off for touch and reduced motion
//   Stage.scene(root, { hold, scrub, build, phone, rest })
//   Stage.split(el, 'lines' | 'words' | 'chars')   masked split text, SplitText when loaded
//   Stage.ready()                          resolves when fonts and the scenes' pictures are ready
//   Stage.init()                           starts every <section class="scene" data-scene="<id>"> on the page
//
// A page:  Stage.smooth(); Stage.init();
(() => {
  const html = document.documentElement;
  const mq = (q) => window.matchMedia(q).matches;
  const live = !!(window.gsap && window.ScrollTrigger);
  if (live) gsap.registerPlugin(ScrollTrigger);
  if (live && window.SplitText) gsap.registerPlugin(SplitText);

  const Stage = {
    live,
    get reduced() { return mq('(prefers-reduced-motion: reduce)'); },
    get phone() { return mq('(max-width: 767px)'); },
    get touch() { return mq('(pointer: coarse)'); },
    lenis: null,
    scenes: [],
  };

  // Weighted wheel scrolling. lerp 0.1-0.14 feels heavy without lagging behind the hand; touch keeps the
  // phone's own scrolling, and reduced motion keeps the browser's.
  Stage.smooth = ({ lerp = 0.12 } = {}) => {
    if (!live || !window.Lenis || Stage.reduced || Stage.touch || Stage.lenis) return Stage.lenis;
    const lenis = new Lenis({ lerp, smoothWheel: true, anchors: true, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    html.classList.add('is-smooth');
    Stage.lenis = lenis;
    return lenis;
  };

  // One scroll scene.
  //   root   <section class="scene"> holding one <div class="scene-stage">
  //   hold   screens of scroll the stage is held for (1-4); the section is (hold + 1) screens tall
  //   scrub  true = locked to the scrollbar; a number = seconds of catch-up (0.3-0.8 reads as weight)
  //   build(tl, ctx)  add the tweens to tl; the timeline runs 0 → 1 over the hold. ctx: { root, stage, phone, q }
  //   phone  'same' (default) | 'rest' (the phone gets the finished composition) | { hold, build }
  //   rest(ctx)  optional: anything extra the finished composition needs (most scenes need nothing)
  // Sets --p (0-1) and data-beat on root, so CSS and captions can follow the scene too.
  Stage.scene = (root, opts = {}) => {
    if (!root) return null;
    const { hold = 2, scrub = true, build, phone = 'same', rest, beats = 0 } = opts;
    const stage = root.querySelector(':scope > .scene-stage') || root.firstElementChild;
    const q = (sel) => [...root.querySelectorAll(sel)];
    const toRest = (ctx) => { root.classList.remove('is-live'); root.classList.add('is-rest'); root.style.removeProperty('--hold'); if (rest) rest(ctx); };
    if (!live) { toRest({ root, stage, phone: Stage.phone, q }); return null; }
    const mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', phone: '(max-width: 767px)' }, (c) => {
      const isPhone = c.conditions.phone;
      const ctx = { root, stage, phone: isPhone, q };
      const plan = isPhone ? (phone === 'rest' ? null : phone === 'same' ? { hold, build } : { hold: phone.hold ?? hold, build: phone.build ?? build }) : { hold, build };
      if (!c.conditions.motion || !plan || !plan.build) { toRest(ctx); return () => root.classList.remove('is-rest'); }
      root.classList.remove('is-rest');
      root.classList.add('is-live');
      root.style.setProperty('--hold', plan.hold);
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root, start: 'top top', end: 'bottom bottom', scrub, invalidateOnRefresh: true,
          onUpdate: (self) => {
            root.style.setProperty('--p', self.progress.toFixed(4));
            if (beats) root.dataset.beat = String(Math.min(beats - 1, Math.floor(self.progress * beats)));
          },
        },
      });
      plan.build(tl, ctx);
      // pad the timeline to exactly 1 so positions in build() read as fractions of the hold
      if (tl.duration() < 1) tl.to({}, { duration: 1 - tl.duration() }, tl.duration());
      return () => { root.classList.remove('is-live'); root.style.removeProperty('--hold'); root.style.removeProperty('--p'); };
    });
    Stage.scenes.push(mm);
    return mm;
  };

  // Masked split text. Lines rise out of their own mask; words and characters are for short headings.
  Stage.split = (el, type = 'lines') => {
    if (!el) return [];
    if (window.SplitText && live) {
      const s = SplitText.create(el, { type: type === 'lines' ? 'lines' : type === 'words' ? 'lines,words' : 'lines,words,chars', mask: 'lines', aria: 'auto', autoSplit: false });
      return type === 'lines' ? s.lines : type === 'words' ? s.words : s.chars;
    }
    // fallback: words in inline-block spans, the full text kept for screen readers
    if (!el.dataset.split) {
      el.setAttribute('aria-label', el.textContent.trim());
      const words = el.textContent.trim().split(/\s+/).map((w) => { const span = document.createElement('span'); span.setAttribute('aria-hidden', 'true'); span.style.display = 'inline-block'; span.textContent = w; return span; });
      el.replaceChildren(...words.flatMap((span, i) => (i ? [' ', span] : [span])));
      el.dataset.split = 'words';
    }
    return [...el.children];
  };

  // Fonts and the scenes' pictures decide every height a trigger measures; refresh once they are in.
  Stage.ready = () => {
    const imgs = [...document.querySelectorAll('.scene img')].map((i) => (i.complete ? null : i.decode().catch(() => {}))).filter(Boolean);
    return Promise.all([document.fonts ? document.fonts.ready : null, ...imgs]).then(() => { if (live) ScrollTrigger.refresh(); });
  };

  // Every <section class="scene" data-scene="<id>" data-options='{"hold":3}'> on the page, started by
  // the scene file of that id (assets/scenes/<id>.js registers Scenes['<id>']).
  Stage.init = () => {
    for (const el of document.querySelectorAll('.scene[data-scene]')) {
      if (el.__scene) continue;
      const make = window.Scenes[el.dataset.scene];
      if (!make) { console.warn('No scene file loaded for data-scene="' + el.dataset.scene + '"'); continue; }
      let o = {}; try { o = JSON.parse(el.dataset.options || '{}'); } catch {}
      el.__scene = make(el, o) || true;
    }
  };

  window.Scenes = window.Scenes || {};
  window.Stage = Stage;
  if (live) { window.addEventListener('load', () => Stage.ready()); }
})();
