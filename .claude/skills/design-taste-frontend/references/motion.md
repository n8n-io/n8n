# Motion

Read this before adding any animation. The static page must already be finished and passing
`inspect.mjs`; motion is the last pass, never a way to rescue a weak layout.

## Contents

1. The budget
2. What strong pages do with motion
3. Four questions before any animation
4. Tokens
5. Scroll behaviours, ranked
6. Recipes (copy, then adapt)
7. Signature moves
8. Reduced motion and performance
9. What gives generated motion away
10. Rules for motion

## 1. The budget

A page that does not move reads as a mock-up; the inspector counts what moves while the page loads and
scrolls, and fails it under eight elements. The motion layer has five parts:

- **Two or three scroll scenes:** the big, scroll-driven moments award sites are remembered for (a
  camera flying through a field of pictures, a picture that grows from a window to the whole screen,
  type that crosses a held stage, cards that deal out and stack). The direction sheet deals them from
  `library/scenes.json` when the library has scenes for the brief; `references/scenes.md` says how to
  fill and fit them. They are where the page is bold; everything else stays quiet so they land.

- **One signature moment:** the thing a visitor would describe an hour later: the headline that rises
  out of a mask, the image that opens like a shutter, the wordmark that scales with the scroll. The
  direction sheet from `draw.mjs` names one. Build that one well; it is the only move allowed to be
  loud.
- **Section entrances, choreographed per section:** the parts of each section arrive in reading order
  (heading, text, picture, details), staggered 60–90ms, rising 16–32px with opacity, once. Vary the
  manner with the content instead of stamping one preset everywhere: a list arrives row by row, a
  picture opens from a mask or settles from a slight scale, a figure counts up once, a statement rises
  line by line.
- **Feedback under the hand:** buttons that give on press, links that answer the pointer, cards and
  pictures that respond on hover, a menu that opens from where it was clicked.
- **One moving picture:** a found clip as a muted loop with a poster frame, a slow drift or scale on
  a large photograph, or a scroll-linked move on the hero picture.

What is still banned: the same fade-and-slide-up with the same timing on every block, which is the most
cited motion tell of generated pages; motion that hides content until a script runs, with no fallback;
bounce and elastic easing; anything that animates layout properties. Uniform motion says nobody decided
anything; choreographed motion with one protected moment says somebody did.

## 2. What strong pages do with motion

Measured on the latest 99 Awwwards Sites of the Day (July to October 2026), at 1440 and 390, with
the transitions, tweens and scroll triggers recorded while each page loaded and was scrolled. Where
the gallery does something the house rules ban, the house version follows.

- **The stack.** Two in three use a smooth-scroll library and three in five ship Three.js; GSAP is
  named on 56. The quiet layer below (reveals, line rises, the ink fill) needs none of it: CSS scroll
  timelines and view transitions do that work, though only 3 and 6 of the sites use them. The big
  scroll scenes are built on GSAP ScrollTrigger, as on the award sites, through the shared stage in
  `assets/scenes/` (`references/scenes.md`).
- **Curves.** The curves that really ran are strong ease-outs: expo out (`.16,1,.3,1` and
  `.19,1,.22,1`) ran on 14 sites, cubic out on 13, quint out on 7, and by number of transitions the
  quint and expo outs lead every chosen curve. In-out curves are kept for wipes and things that
  travel (cubic and quart in-out, about 15 sites each). Ease-in appears only for exits, short, before
  a slow arrival. Colour changes use plain `ease` (46 sites). Overshoot sits in 19 stylesheets and
  ran on 2.
- **Durations.** Hover colour 200-300 ms; small interface moves 300-450 ms; reveals and line rises
  600-1,000 ms; picture openings and wipes 1,100-1,600 ms. The median of everything that ran on a
  site is 420 ms.
- **Staggers.** 20-40 ms between characters, 75-120 ms between lines, 50-100 ms between list items.
- **Scroll-linked motion is locked to the scrollbar.** Of the sites that scrub, 14 of 18 lock it with
  no smoothing; the other four smooth it by 0.1-3 s. Reveals fire when the element's top is 80-95% of the way
  down the viewport, once.
- **How much moves.** A median of 130 elements are moved by script on a page, but they come from a
  few gestures: one split heading is 20-60 elements. The inspector's floor (8, warning under 16) is a
  floor, not a target.
- **Waiting is the most common cost.** 60 of 99 open on a loading screen, 26 of them with a counter.
  Half the usable pages were still unreadable 2.5 s after the browser said the page had loaded, a
  third at 4.5 s. The preloaders were not covering slow pages (their documents loaded faster than the
  rest) and the readers' design marks were the same whatever the wait; only usability fell. House
  version: no preloader, the message readable on the first frame, the load sequence over by 1.2 s.
- **Pins cost length.** Two in three scrolling pages hold something sticky or pinned. Those pages
  are twice as long (a median 16.6 screens against 7.5) for fewer words per screen (27 against 46).
  House version: at most two held stages, about one screen per step, three screens per stage.
- **Reduced motion is mostly missing.** 35 of 99 have any `prefers-reduced-motion` rule, 16 have
  three or more; 5 of 26 scroll-scrubbed scenes have one. Every recipe here keeps the finished state
  as the reduced state.

## 3. Four questions before any animation

1. **How often will someone see it?** Once per visit (hero load, a section reveal): it can take its
   time. Many times per visit (hover, menu, accordion): fast and small. Hundreds of times (keyboard
   actions, typing): no animation.
2. **What is it for?** Valid answers: it shows where something came from, it confirms an action, it
   keeps a change from being jarring, it explains how the product works, it is the signature moment.
   "It looks nice" is only valid for the signature moment.
3. **Which easing?** Entering or leaving: ease-out, so movement starts the instant the eye arrives.
   Moving between two places on screen: ease-in-out. Colour and opacity on hover: `ease`. Constant
   travel (marquee, progress): `linear`. `ease-in` makes interfaces feel slow because the first frames
   barely move; do not use it. The CSS keyword curves are weak, so use the tokens below.
4. **How long?** Press feedback 100–160ms. Hover 150–200ms. Menus and popovers 150–250ms. Dialogs and
   drawers 250–450ms. Section and hero reveals 500–900ms. Leaving is quicker than arriving (about 70%).

## 4. Tokens

```css
:root {
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);        /* entrances, moving hovers, UI under 600ms */
  --ease-expo: cubic-bezier(0.16, 1, 0.3, 1);        /* new: reveals of 800ms and longer, line rises, openings */
  --ease-in-out: cubic-bezier(0.76, 0, 0.24, 1);     /* wipes, panels, things that travel while visible */
  --ease-soft: cubic-bezier(0.33, 1, 0.68, 1);       /* slow scale and drift on photographs */
  --ease-exit: cubic-bezier(0.55, 0.055, 0.675, 0.19); /* new: something leaving for good, short */
  --t-press: 140ms;
  --t-hover: 180ms;
  --t-ui: 240ms;
  --t-reveal: 800ms;
  --t-open: 1200ms;                                  /* new: picture openings and clip wipes */
  --stagger-line: 90ms;                              /* new */
  --stagger-item: 70ms;                              /* new */
}
```

How the study bears on each:

- `--ease-out` (quint out) is in 28 stylesheets with its near twin and is the single most frequent
  chosen curve among transitions that ran. Keep it.
- `--ease-expo` is new. Expo out (`.16,1,.3,1` and `.19,1,.22,1`) is in 28 stylesheets and ran on 14
  sites, more than any other chosen family, and it is the curve the long reveals use: line rises,
  picture openings, card entrances of 0.9-1.6 s. Use it for anything at `--t-reveal` or longer; it
  replaces `--ease-out` in the masked headline and the reveal-on-scroll recipes.
- `--ease-in-out` (quart in-out) matches its family (14 stylesheets, 7 ran). Keep it for wipes,
  shutters, menus and page transitions.
- `--ease-soft` (cubic out) matches the cubic-out family (21 stylesheets, 13 ran), but the study uses it
  for interface moves of 0.3-0.8 s, where `--ease-out` already serves. Narrow it to slow scale and
  drift on photographs.
- `--ease-exit` is new. Ease-in is right for exactly one job: something that leaves for good (an
  outgoing caption, a replaced slide, a closing panel), short, at about 60-70% of the matching
  entrance. Never for anything the visitor is waiting to see.
- Not adopted: `.4,0,.2,1` (38 stylesheets) is a framework default, and overshoot curves (19) stay
  banned on interface elements.
- `--t-hover` stays at 180ms. The study's colour hovers run 200-300ms; a little quicker reads as
  more exact. A hover that moves something (a label roll, an arrow) takes `--t-ui` to 400ms.

## 5. Scroll behaviours, ranked

| Behaviour | Pages of 99 | What it serves | House version |
| --- | --- | --- | --- |
| Smooth-scroll library | 67 | A feeling of weight; makes scrubbed scenes easier to build | Optional, through `Stage.smooth()`: Lenis at lerp 0.1-0.14, off for touch and reduced motion |
| Held (sticky or pinned) stage | 44 | One picture or object carries several claims; chapters | Yes: the scroll scenes (`references/scenes.md`), two or three per page, one to four screens each; other sticky stages three screens at most |
| Split text | 40 | Lines and words arriving as they are read; hover rolls | Lines for headings and statements; words only for the ink fill; characters only for a heading of one to three words |
| Colour by chapter | 34 | Tells chapters apart without padding bands | Yes, as hard cuts at section edges; the header ink follows in 300ms |
| Scroll-scrubbed scene (camera, object, image sequence) | 26 | Explains a product by moving it | Yes, from the scene library, built on the shared stage with a finished composition for reduced motion |
| Parallax depth | 24 | Depth in collages; pictures drifting inside oversized frames | Travel under 8% of the element, pictures held at 106-110% in their frames |
| Marquee | 21 | Life on a static band | Existing "Edge-to-edge marquee": one per page, pausable |
| Masked line or word rise | 18 | Headings that arrive like set type | Yes: "Masked line reveal" on load, "Lines that rise on scroll" below the fold |
| Wheel drives a scene, no page scroll | 16 | Browsing one object | Not used (see 2.6) |
| Blur-in | 15 | Soft arrival | At most 8px of blur, 600ms, gone once settled; never on body text |
| Picture from inset frame to full-bleed | 14 | The hand-over from a type screen to the big picture | Yes: "Opening window", about one screen of scroll |
| Grey-to-ink text fill | 14 | Paces one statement | Yes, once per page, starting at 45% ink: "Ink fill" |
| Sheet slides over a held layer | 11 | Page-turn rhythm between chapters | Yes: new move "Sheet over a held picture" |
| Scramble or decode | 11 | A "code" voice | Not used (see 2.6) |
| Header ink by chapter | 10 | The fixed header stays legible | Yes, with colour by chapter |
| Horizontal track pinned to vertical scroll | 8 | Walking through rooms or a collection | Native drag row first; pinned only when the row is under three screens long, with keyboard support: "Sideways gallery" |
| Curtain footer | 8 | The page ends as a scene | Existing move |
| Rolling digits | 6 | Figures that arrive | Yes, for pages whose case is a handful of numbers: "Rolling figures" |
| Index with hover preview | 5 | Navigating work by name | Existing move, upgraded recipe |

Text, split by unit: characters on about 20 pages, lines on about 14, words on about 11. Character
splits serve short headings and button rolls; on long statements they leave fragments mid-scroll.

## 6. Recipes

All recipes keep the content visible when JavaScript is off, put every hidden state inside
`prefers-reduced-motion: no-preference`, and use the tokens above. Two notes that apply to several:

- **Scroll timelines need a scroller to watch.** `animation-timeline: view()` takes the nearest scroll
  container, and `overflow: hidden` makes one. A picture inside an `overflow: hidden` frame therefore
  never animates. Use `overflow: clip` on frames, or name the timeline on the section
  (`view-timeline-name: --hero`) and point the children at that name. This also applies to the
  existing "Scroll-linked progress" recipe.
- **Scroll-linked means linear.** The scroll is the easing. 14 of the 18 scrubbing sites in the study
  lock motion to the scrollbar, which is what CSS scroll timelines do.

All recipes keep content visible when JavaScript is off or slow: the hidden state only applies under
`html.js`, which a one-line inline script sets.

```html
<script>document.documentElement.classList.add('js')</script>
```

### Load sequence in 1.2 seconds

Everything is in the HTML and painted on the first frame; the sequence only adds arrival. Nothing
waits for the load event, and nothing in the navigation animates.

```html
<header class="hero">
  <h1 class="display lines">
    <span class="line"><span data-line style="--i:0">Stools for</span></span>
    <span class="line"><span data-line style="--i:1">small kitchens</span></span>
  </h1>
  <p class="lead" data-load style="--d:420ms">…</p>
  <a class="button" data-load style="--d:480ms" href="#stools">See the stools</a>
  <figure class="hero__picture" data-open><img src="stool.jpg" alt="…" fetchpriority="high"></figure>
</header>
```

```css
.hero__picture { overflow: clip; margin: 0; }
@media (prefers-reduced-motion: no-preference) {
  .js .hero [data-line] { transform: translateY(105%); animation: load-line 800ms var(--ease-expo) forwards; animation-delay: calc(100ms + var(--i) * var(--stagger-line)); }
  .js .hero [data-load] { opacity: 0; transform: translateY(12px); animation: load-rise 500ms var(--ease-out) forwards; animation-delay: var(--d); }
  .js .hero [data-open] { clip-path: inset(0 0 100% 0); animation: load-open 1000ms var(--ease-in-out) 150ms forwards; }
  .js .hero [data-open] img { transform: scale(1.08); animation: load-settle 1100ms var(--ease-expo) 100ms forwards; }
}
@keyframes load-line { to { transform: none; } }
@keyframes load-rise { to { opacity: 1; transform: none; } }
@keyframes load-open { to { clip-path: inset(0); } }
@keyframes load-settle { to { transform: none; } }
```

The timeline: the headline's lines rise from 100 to 990 ms, the picture opens from 150 to 1,150 ms,
the sentence and the button arrive from 420 to 980 ms. All settled by 1.2 s, four things at most.
Preload the display font (`<link rel="preload" as="font" type="font/woff2" crossorigin>`) so the lines
rise in the real face, and give the picture `fetchpriority="high"` and a ground colour sampled from it,
so a slow image opens onto its own colour rather than a blank box. Study: 22 of 91 pages were readable
at the first intro frame and 11 more by 1.2 s; the intros the readers called respectful finished in
about 1-1.2 s; a third of the pages were still unreadable at 4.5 s.

### Masked line reveal (the classic gallery headline)

Each line slides up from behind its own baseline. Because headlines are capped at two lines, you set
the line breaks yourself and wrap each line.

```html
<h1 class="lines">
  <span class="line"><span data-line style="--i:0">Stools for</span></span>
  <span class="line"><span data-line style="--i:1">small kitchens</span></span>
</h1>
```

```css
.lines .line { display: block; overflow: hidden; padding-bottom: 0.08em; margin-bottom: -0.08em; }
.lines [data-line] { display: block; }
@media (prefers-reduced-motion: no-preference) {
  .js .lines [data-line] {
    transform: translateY(105%);
    animation: line-up 900ms var(--ease-out) forwards;
    animation-delay: calc(var(--i) * 110ms + 150ms);
  }
}
@keyframes line-up { to { transform: none; } }
```

The `padding-bottom` / negative margin pair stops descenders (g, y, p) being clipped by the mask.
On a narrow phone the two authored lines may each wrap; check the mobile screenshot, and if they do,
author a shorter mobile break with a `<br class="only-wide">` pattern or reduce the size.

### Reveal on scroll (once)

For the two or three sections that deserve it, not for every block.

```css
@media (prefers-reduced-motion: no-preference) {
  .js [data-reveal] { opacity: 0; transform: translateY(24px); transition: opacity 700ms var(--ease-out), transform 900ms var(--ease-out); }
  .js [data-reveal].is-in { opacity: 1; transform: none; }
}
```

```js
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
```

Never attach reveals with a scroll listener, never replay them when the element re-enters, and never
leave anything at `opacity: 0` if the observer fails to fire (the `html.js` gate handles no-JS; the
`unobserve` handles replays).

### Image shutter

An image opens from one edge while scaling down slightly inside its frame. Gallery staple; use it for
the one hero or showcase image.

```css
.shutter { overflow: hidden; }
@media (prefers-reduced-motion: no-preference) {
  .js .shutter { clip-path: inset(0 0 100% 0); transition: clip-path 1100ms var(--ease-in-out); }
  .js .shutter img { transform: scale(1.12); transition: transform 1500ms var(--ease-soft); }
  .js .shutter.is-in { clip-path: inset(0); }
  .js .shutter.is-in img { transform: none; }
}
```

### Press and hover

```css
.button { transition: transform var(--t-press) var(--ease-out), background-color var(--t-hover) ease, color var(--t-hover) ease; }
.button:active { transform: scale(0.97); }
.link { text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 0.2em; text-decoration-thickness: 0.07em; transition: text-decoration-color var(--t-hover) ease; }
@media (hover: hover) and (pointer: fine) {
  .button:hover { background-color: var(--accent-strong); }
  .link:hover { text-decoration-color: currentColor; }
}
```

Hover styles go behind `(hover: hover)` because touch devices fire hover on tap and leave it stuck.
Hover should raise contrast, never lower it. Do not change font weight on hover (the text reflows).
Do not lift or scale every card on hover; one consistent, small response is enough.

### Scroll-linked progress without JavaScript

For a wordmark that scales as the hero leaves, an image that drifts a few percent, or a progress bar.
Wrap in `@supports` so browsers without scroll timelines get the static state.

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .drift { animation: drift linear both; animation-timeline: view(); animation-range: entry 0% exit 100%; }
    @keyframes drift { from { transform: translateY(-4%); } to { transform: translateY(4%); } }
  }
}
```

Keep the travel small (under 8% of the element). Large parallax makes text hard to read and looks
dated.

### Pinned story

A section whose heading stays put while items pass. Use `position: sticky`; do not hijack scrolling.

```css
.story { display: grid; grid-template-columns: 5fr 7fr; gap: var(--gutter); align-items: start; }
.story__title { position: sticky; top: 18vh; }
@media (max-width: 800px) { .story { grid-template-columns: 1fr; } .story__title { position: static; } }
```

### Index with preview, anchored to the row

Rows of names; pointing at a row or tabbing to it opens one frame level with that row. The frame
follows the row, never the pointer.

```html
<section class="index">
  <ul class="index__list">
    <li><a class="index__row" href="/work/harbour-house" data-preview="/img/harbour-house.jpg">
      <span class="index__name">Harbour House</span><span class="index__year">2025</span>
      <img class="index__thumb" src="/img/harbour-house-small.jpg" alt="" loading="lazy" width="640" height="400">
    </a></li>
    <!-- … -->
  </ul>
  <div class="index__frame" aria-hidden="true"><img alt=""></div>
</section>
```

```css
.index { position: relative; }
.index__list { list-style: none; margin: 0; padding: 0; }
.index__row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 0 var(--gutter); padding-block: 0.3em; font-size: var(--step-head); color: inherit; text-decoration: none; transition: opacity var(--t-hover) ease; }
.index__thumb { order: -1; flex-basis: 100%; width: 100%; height: auto; margin-bottom: 0.4rem; }
.index__frame { display: none; }
@media (hover: hover) and (pointer: fine) {
  .index__list { max-width: 62%; }
  .index__thumb { display: none; }
  .index__list:has(.index__row:hover, .index__row:focus-visible) .index__row:not(:hover, :focus-visible) { opacity: 0.4; }
  .index__frame { display: block; position: absolute; top: 0; right: var(--margin); width: 30%; aspect-ratio: 4 / 3; z-index: 1; pointer-events: none; clip-path: inset(100% 0 0 0); transition: clip-path 320ms var(--ease-out), transform 360ms var(--ease-out); }
  .index__frame.is-open { clip-path: inset(0); }
  .index__frame img { width: 100%; height: 100%; object-fit: cover; }
}
@media (prefers-reduced-motion: reduce) { .index__frame { transition: none; } }
```

```js
(() => {
  const root = document.querySelector('.index');
  if (!root) return;
  const frame = root.querySelector('.index__frame');
  const picture = frame.querySelector('img');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let warmed = false;
  const show = (row) => {
    if (!fine.matches) return;
    if (!warmed) { warmed = true; root.querySelectorAll('[data-preview]').forEach((a) => { new Image().src = a.dataset.preview; }); }
    picture.src = row.dataset.preview;
    const y = row.offsetTop + row.offsetHeight / 2 - frame.offsetHeight / 2;
    const max = root.offsetHeight - frame.offsetHeight;
    const opening = !frame.classList.contains('is-open');
    if (opening) frame.style.transitionProperty = 'clip-path';   // open in place, do not slide in from the top
    frame.style.transform = `translateY(${Math.min(max, Math.max(0, y))}px)`;
    if (opening) { frame.getBoundingClientRect(); frame.style.transitionProperty = ''; }
    frame.classList.add('is-open');
  };
  const hide = () => frame.classList.remove('is-open');
  root.querySelectorAll('.index__row').forEach((row) => {
    row.addEventListener('pointerenter', () => show(row));
    row.addEventListener('focus', () => show(row));
  });
  root.addEventListener('pointerleave', hide);
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) hide(); });
})();
```

On touch screens each row shows its own picture above the name. Study: 5 pages navigate work this way;
frames from about 470x270 to large plates behind the list; the other rows dimmed to about 0.3 (0.4 here, the floor for dimmed text). The
image trails and cursor-borne previews seen elsewhere in the study are the gimmick version.

### Lines that rise on scroll

For a section heading or a statement whose line breaks you do not control. Splits after the fonts
load, reveals once, then gives the plain text back so it rewraps normally. Plain text only (no links or
emphasis inside).

```html
<h2 class="head" data-lines>Turned by hand in one small workshop</h2>
```

```css
[data-lines] .line { display: block; overflow: clip; padding-bottom: 0.12em; margin-bottom: -0.12em; }
[data-lines] .line > span { display: block; }
@media (prefers-reduced-motion: no-preference) {
  .is-split .line > span { transform: translateY(110%); }
  .is-split.is-in .line > span { transform: none; transition: transform 900ms var(--ease-expo) calc(var(--i) * var(--stagger-line)); }
}
```

```js
(() => {
  const els = [...document.querySelectorAll('[data-lines]')];
  if (!els.length || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const restore = (el) => { el.textContent = el.dataset.text; el.classList.remove('is-split', 'is-in'); };
  const split = (el) => {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.dataset.text = text;
    el.textContent = '';
    const words = text.split(' ').map((word) => {
      const s = document.createElement('span');
      s.style.display = 'inline-block';
      s.textContent = word;
      el.append(s, ' ');
      return s;
    });
    const lines = [];                                   // group the words by the line they landed on
    for (const w of words) {
      const last = lines.at(-1);
      if (last && Math.abs(last.top - w.offsetTop) < 4) last.words.push(w.textContent);
      else lines.push({ top: w.offsetTop, words: [w.textContent] });
    }
    el.textContent = '';
    lines.forEach((line, i) => {
      const mask = document.createElement('span');
      const inner = document.createElement('span');
      mask.className = 'line';
      inner.style.setProperty('--i', i);
      inner.textContent = line.words.join(' ');
      mask.append(inner);
      el.append(mask, ' ');
    });
    el.classList.add('is-split');
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      e.target.classList.add('is-in');
      e.target.querySelector('.line:last-of-type > span')
        .addEventListener('transitionend', () => restore(e.target), { once: true });
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  document.fonts.ready.then(() => els.forEach((el) => { split(el); io.observe(el); }));
  let width = innerWidth;                               // a width change before the reveal: give the text back
  addEventListener('resize', () => {
    if (innerWidth === width) return;
    width = innerWidth;
    els.filter((el) => el.matches('.is-split:not(.is-in)')).forEach((el) => { io.unobserve(el); restore(el); });
  });
})();
```

Study: masked rises from 100-120% below the line, 0.6-1.2 s, 75-120 ms between lines, triggered when
the block's top is 80-95% down the viewport. Reduced motion: the script does not run; the text is plain.

### Opening window

The hand-over from a type screen to the one big picture: the picture first shows as a window in the
middle of a held stage and opens to full-bleed over about one screen of scroll.

```html
<section class="opening">
  <div class="opening__stage">
    <img src="workshop-wide.jpg" alt="The workshop at first light, benches cleared" width="2400" height="1500">
  </div>
</section>
```

```css
.opening__stage { height: 100svh; overflow: clip; }
.opening__stage img { display: block; width: 100%; height: 100%; object-fit: cover; }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .opening { height: 200svh; view-timeline-name: --opening; --inset-y: 20%; --inset-x: 28%; }
    .opening__stage { position: sticky; top: 0; animation: opening-window linear both; animation-timeline: --opening; animation-range: contain 0% contain 75%; }
    .opening__stage img { animation: opening-settle linear both; animation-timeline: --opening; animation-range: contain 0% contain 75%; }
  }
}
@media (max-width: 700px) { .opening { --inset-y: 18%; --inset-x: 8%; } }
@keyframes opening-window { from { clip-path: inset(var(--inset-y) var(--inset-x)); } to { clip-path: inset(0); } }
@keyframes opening-settle { from { transform: scale(1.15); } to { transform: none; } }
```

The section is two screens tall; the stage is held for one, and the window is fully open after three
quarters of it, so the full-bleed picture rests for a moment before the page moves on. Study: 14 pages;
start windows 38-60% of the width; runways 600-1,800 px, and the readers asked for one to two screens.
Without scroll timelines, and under reduced motion, the picture is a full-bleed screen.

### Held picture, passing captions

The pinned story built for photographs: the picture holds on one side while short captions pass on
the other; the caption at the middle of the screen is lit and its picture is shown.

```html
<section class="steps">
  <figure class="steps__media">
    <div class="steps__pictures">
      <img src="seasoning.jpg" alt="Ash boards stacked to season" class="is-on">
      <img src="turning.jpg" alt="A leg being turned on the lathe">
      <img src="finish.jpg" alt="Oil rubbed into a finished seat">
    </div>
    <figcaption class="steps__count" aria-hidden="true"></figcaption>
  </figure>
  <ol class="steps__list">
    <li class="steps__item"><h3>Seasoned for a year</h3><p>…</p></li>
    <li class="steps__item"><h3>Turned by hand</h3><p>…</p></li>
    <li class="steps__item"><h3>Finished with oil</h3><p>…</p></li>
  </ol>
</section>
```

```css
.steps { display: grid; grid-template-columns: 7fr 5fr; column-gap: var(--gutter); }
.steps__media { margin: 0; align-self: start; }           /* a stretched grid item cannot stick */
.steps__pictures img { display: block; width: 100%; height: auto; }
.steps__list { list-style: none; margin: 0; padding: 0; }
.steps__item { min-height: 80svh; display: flex; flex-direction: column; justify-content: center; }
.js .steps__media { position: sticky; top: 0; height: 100svh; display: flex; flex-direction: column; justify-content: center; gap: 0.75rem; }
.js .steps__pictures { position: relative; aspect-ratio: 4 / 5; max-height: 80svh; }
.js .steps__pictures img { position: absolute; inset: 0; height: 100%; object-fit: cover; opacity: 0; transition: opacity 500ms ease; }
.js .steps__pictures img.is-on { opacity: 1; }
.js .steps__item { opacity: 0.4; transition: opacity var(--t-ui) ease; }
.js .steps__item.is-active { opacity: 1; }
@media (max-width: 800px) {
  .steps { display: block; }                               /* the section, not a grid area, contains the sticky picture */
  .js .steps__media { height: auto; z-index: 1; background: var(--bg); padding-block: 0.5rem; }
  .js .steps__pictures { aspect-ratio: 3 / 2; max-height: 42svh; }
  .steps__item { min-height: 60svh; }
}
@media (prefers-reduced-motion: reduce) { .js .steps__pictures img, .js .steps__item { transition: none; } }
```

```js
(() => {
  const root = document.querySelector('.steps');
  if (!root || !('IntersectionObserver' in window)) return;
  const items = [...root.querySelectorAll('.steps__item')];
  const pictures = [...root.querySelectorAll('.steps__pictures img')];
  const count = root.querySelector('.steps__count');
  const show = (i) => {
    items.forEach((el, k) => el.classList.toggle('is-active', k === i));
    pictures.forEach((el, k) => el.classList.toggle('is-on', k === i));
    if (count) count.textContent = `${i + 1} of ${items.length}`;
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) show(items.indexOf(e.target));
  }, { rootMargin: '-45% 0px -45% 0px' });                 // a band across the middle of the screen
  items.forEach((el) => io.observe(el));
  show(0);
})();
```

Without JavaScript the pictures and captions are two plain columns. Study: inactive items at 20-40%
(dims of 10-15% read as missing text, so the floor here is 40%), crossfades of 400-600 ms, about one
screen per step; the readers asked for a visible count on any held sequence of more than two steps.
The count is a plain sentence in the body face, not a zero-padded numeral.

### Sideways gallery

A row of pictures that the vertical scroll moves sideways while the stage is held, for a short
collection (eight items or fewer). The native drag row is the base; the pinned version is added only
on wide screens with motion allowed, and only when the row is under three screens long.

```html
<section class="gallery">
  <div class="gallery__stage">
    <h2 class="head">Eight kitchens, one stool</h2>
    <ul class="gallery__track">
      <li class="gallery__item"><a href="/kitchens/leith"><img src="leith.jpg" alt="A narrow galley kitchen in Leith" width="1200" height="1500"><span>Leith</span></a></li>
      <!-- … -->
    </ul>
  </div>
</section>
```

```css
.gallery__track { display: flex; gap: var(--gutter); list-style: none; margin: 0; padding: 0 var(--margin); overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-inline: var(--margin); }
.gallery__item { flex: 0 0 min(72vw, 28rem); scroll-snap-align: start; }
.gallery__item img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 5; object-fit: cover; }
.gallery.is-pinned .gallery__stage { position: sticky; top: 0; height: 100svh; display: flex; flex-direction: column; justify-content: center; gap: 2rem; overflow: clip; }
.gallery.is-pinned .gallery__track { overflow: visible; scroll-snap-type: none; }
.gallery.is-pinned .gallery__item { flex-basis: calc(62svh * 0.8); }
```

```js
(() => {
  const root = document.querySelector('.gallery');
  if (!root) return;
  const track = root.querySelector('.gallery__track');
  const wide = matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
  let dx = 0, queued = false;
  const place = () => {
    queued = false;
    if (!root.classList.contains('is-pinned')) return;
    const p = Math.min(1, Math.max(0, -root.getBoundingClientRect().top / dx));
    track.style.transform = `translate3d(${(-p * dx).toFixed(1)}px, 0, 0)`;
  };
  const measure = () => {
    root.classList.add('is-pinned');                     // measure the row as it would be when pinned
    track.style.transform = '';
    dx = track.scrollWidth - track.clientWidth;
    const pin = wide.matches && dx > 0 && dx < innerHeight * 3;
    root.classList.toggle('is-pinned', pin);
    root.style.height = pin ? `${innerHeight + dx}px` : ''; // one pixel of scroll moves the row one pixel
    place();
  };
  track.addEventListener('focusin', (e) => {             // keyboard: bring the focused item into view
    if (!root.classList.contains('is-pinned')) return;
    const item = e.target.closest('.gallery__item');
    const x = Math.min(dx, Math.max(0, item.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft)));
    scrollTo({ top: root.getBoundingClientRect().top + scrollY + x, behavior: 'instant' });
  });
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(place); } }, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  wide.addEventListener('change', measure);
  measure();
})();
```

Study: 8 pages pinned a horizontal track; their pages ran a median 25 screens, and the readers' worst
cases spent 9 screens on three cards and 10,000-23,000 px of wheel on one track. Here the speed is 1:1
and the hold ends when the last picture reaches the margin. Phones, narrow windows, reduced motion and
long rows all get the native row with snapping, which also works with touch, trackpads and the
keyboard. Never put the only copy of a call to action inside the moving row.

### Receding hero

As the first screen leaves, its picture sinks a little and darkens while the words lift away a little
faster, so the hero recedes instead of simply scrolling off.

```html
<header class="hero">
  <img class="hero__picture" src="kitchen.jpg" alt="…" width="2400" height="1600" fetchpriority="high">
  <div class="hero__copy"><h1 class="display">…</h1><p class="lead">…</p></div>
</header>
```

```css
.hero { position: relative; min-height: 100svh; overflow: clip; display: grid; align-items: end; view-timeline-name: --hero; }
.hero__picture { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hero::after { content: ''; position: absolute; inset: 0; background: var(--ink); opacity: 0; pointer-events: none; }
.hero__copy { position: relative; z-index: 1; padding: var(--margin); }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .hero__picture { animation: hero-sink linear both; animation-timeline: --hero; animation-range: exit 0% exit 100%; }
    .hero::after { animation: hero-dim linear both; animation-timeline: --hero; animation-range: exit 0% exit 100%; }
    .hero__copy { animation: hero-lift linear both; animation-timeline: --hero; animation-range: exit 0% exit 70%; }
  }
}
@keyframes hero-sink { to { transform: translateY(8%) scale(1.06); } }
@keyframes hero-dim { to { opacity: 0.35; } }
@keyframes hero-lift { to { transform: translateY(-6%); opacity: 0; } }
```

The `exit` range runs from the moment the hero's top meets the top of the screen until its bottom
does, which for a first screen is the first screen of scroll. Study: hero pictures that sink and dim as
they leave, a heading scrubbed from 140 to 60 px, a title card that scales down on the phone; the
readers called it quiet and the page "one sheet". Travel stays under 8%; the overlay is a flat ink at
up to 35%, not a gradient. Static where unsupported or reduced.





### Page to page

Navigation between pages of the site with the browser's own view transitions: the old page fades
quickly, the new one rises in, and the picture the visitor clicked travels into place as the new
page's hero. No library, no full-screen curtain.

```css
/* on every page */
@view-transition { navigation: auto; }
@media (prefers-reduced-motion: reduce) { @view-transition { navigation: none; } }
::view-transition-old(root) { animation: vt-leave 200ms var(--ease-exit) both; }
::view-transition-new(root) { animation: vt-arrive 380ms var(--ease-out) 60ms both; }
::view-transition-group(*) { animation-duration: 480ms; animation-timing-function: var(--ease-in-out); }
::view-transition-image-pair(*.picture) { overflow: clip; }
::view-transition-old(*.picture), ::view-transition-new(*.picture) { height: 100%; object-fit: cover; }
@keyframes vt-leave { to { opacity: 0; } }
@keyframes vt-arrive { from { opacity: 0; transform: translateY(16px); } }
```

```html
<!-- on the index: the card picture of one project -->
<img src="/img/leith.jpg" alt="…" style="view-transition-name: kitchen-leith; view-transition-class: picture">
<!-- on that project's page: its hero picture -->
<img src="/img/leith-wide.jpg" alt="…" style="view-transition-name: kitchen-leith; view-transition-class: picture">
```

Each name may appear once per page. Browsers without cross-document view transitions simply navigate.
Study: 16 pages load a page-transition library and run full-screen curtains of 0.7-2.4 s; 6 use view
transitions. The new page should be readable within half a second.

### Ink fill

One statement that fills from part-ink to full ink as it rises through the screen, line by line. It is
readable before it fills; the fill only sets the pace.

```html
<p class="statement head" data-fill>Nine people, one workshop, no catalogue: every stool is made for the kitchen it goes to.</p>
```

```css
[data-fill] { --fill: var(--ink); color: var(--fill); }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .is-filling > span { display: inline-block; color: color-mix(in oklab, var(--fill) 45%, transparent); animation: ink-fill linear both; animation-timeline: view(); animation-range: cover 20% cover 45%; }
  }
}
@keyframes ink-fill { to { color: var(--fill); } }
```

```js
(() => {
  if (!CSS.supports('animation-timeline: view()') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('[data-fill]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((word, i) => {
      const s = document.createElement('span');
      s.textContent = word;
      el.append(s, i < words.length - 1 ? ' ' : '');
    });
    el.classList.add('is-filling');
  });
})();
```

Each word watches its own position, so the words of a line fill together as the line moves from three
quarters of the way down the screen to just past half way. Set `--fill` on a dark chapter to its ink.
Study: 14 pages scrub a statement from grey to ink; unread words started at about 25-30% and settled
frames still caught statements half pale, which reads as disabled text. Here: one statement per page,
three to five lines, 32px or larger, starting at 45% (about 3:1 against the ground, enough for large
text). Full ink without scroll timelines or under reduced motion.

### Rolling figures

For pages whose case is a handful of numbers: each digit rolls up to its value once, the columns a
beat apart. The real number stays in the text for screen readers and search.

```html
<p class="figure"><span class="display" data-roll>1987</span> the year the first stool was sold</p>
```

```css
.roll__digits { display: inline-flex; font-variant-numeric: tabular-nums; line-height: 1; }
.roll__col { display: inline-block; height: 1em; overflow: clip; }
.roll__strip { display: flex; flex-direction: column; transform: translateY(calc(var(--d) * -1em)); }
.roll__strip > span { height: 1em; }
@media (prefers-reduced-motion: no-preference) {
  .roll:not(.is-in) .roll__strip { transform: none; }
  .roll.is-in .roll__strip { transition: transform 1100ms var(--ease-expo) calc(var(--i) * var(--stagger-item)); }
}
```

```js
(() => {
  const els = [...document.querySelectorAll('[data-roll]')];
  if (!els.length) return;
  els.forEach((el) => {
    const value = el.textContent.trim();
    const said = Object.assign(document.createElement('span'), { className: 'sr-only', textContent: value });
    const shown = Object.assign(document.createElement('span'), { className: 'roll__digits' });
    shown.setAttribute('aria-hidden', 'true');
    let i = 0;
    for (const ch of value) {
      if (!/\d/.test(ch)) { shown.append(ch); continue; }
      const col = Object.assign(document.createElement('span'), { className: 'roll__col' });
      const strip = Object.assign(document.createElement('span'), { className: 'roll__strip' });
      strip.style.setProperty('--d', ch);
      strip.style.setProperty('--i', i++);
      for (let n = 0; n < 10; n++) strip.append(Object.assign(document.createElement('span'), { textContent: n }));
      col.append(strip);
      shown.append(col);
    }
    el.classList.add('roll');
    el.replaceChildren(said, shown);
  });
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -15% 0px' });
  els.forEach((el) => io.observe(el));
})();
```

Study: 6 pages roll digit columns (stats, a year, coordinates), about 0.9-1.1 s per column on an
expo-out, staggered by column. Use it for three or four figures at display size, never in running text
and never for a value that changes after load. Reduced motion: the figure is set at its value.

### Accordion

```css
.acc__panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 320ms var(--ease-out); }
.acc__panel > div { overflow: hidden; }
.acc[open] .acc__panel, .acc__item.is-open .acc__panel { grid-template-rows: 1fr; }
```

Animating `grid-template-rows` from `0fr` to `1fr` opens to the content's real height without measuring
it in JavaScript.

### Menu or dialog

```css
.menu { transform-origin: top right; transition: opacity var(--t-ui) var(--ease-out), transform var(--t-ui) var(--ease-out); }
.menu[hidden], .menu.is-closed { opacity: 0; transform: scale(0.97) translateY(-6px); pointer-events: none; }
```

Things open from where they were triggered (`transform-origin` at the trigger). Nothing enters from
`scale(0)`; start at 0.95–0.98. A centred dialog is the one case that scales from its centre.

## 7. Signature moves

The direction sheet names one. Each of these was seen repeatedly on the studied gallery sites.

| Move | What happens | Build with |
| --- | --- | --- |
| Masked headline | Lines rise from behind their baselines on load | Masked line reveal recipe |
| Shutter image | Hero or showcase image opens from an edge, settling from 1.12 scale | Image shutter recipe |
| Scaling wordmark | A giant wordmark shrinks or grows a few percent as the hero scrolls out | Scroll-linked recipe on `scale` |
| Pinned story | A heading holds while its items scroll past | Sticky recipe |
| Index with preview | Text rows; the hovered row shows its image | Index with preview, anchored to the row |
| Curtain footer | The last section is revealed from under the page as you reach the end | `position: sticky; bottom: 0` footer under a main with a background and `z-index` |
| Slow crossfade | Hero image crossfades through 3–4 photographs, 5–6s each | Stacked images, opacity keyframes, pause when the tab is hidden |
| Edge-to-edge marquee | One line of very large type travels sideways, slowly | Duplicate the content, `translateX(-50%)` linear loop, pause on hover and under reduced motion |
| Drag row | A horizontally scrollable row of large images with scroll snapping | `overflow-x: auto; scroll-snap-type: x mandatory`, no library |
| Colour by chapter | Each chapter is its own full-bleed colour field, so the ground changes at section edges; a fixed header takes the ink of the chapter beneath | Section backgrounds in CSS; `base.js` sets `--header-ink` from `data-ink`. Never recolour the whole page from an observer |
| Opening window | A type screen hands over to the big picture: a window in the middle of a held stage opens to full-bleed over about one screen | Opening window recipe |
| Ink-fill statement | One statement fills from 45% to full ink as it rises through the screen | Ink fill recipe |
| Sheet over a held picture | A full-bleed photograph holds for one screen; the next chapter slides up over it as an opaque sheet | A 100svh `position: sticky; top: 0` figure followed by a section with its own background and a higher `z-index`; no script |
| Sideways gallery | A short row of pictures moves sideways while the vertical scroll holds the stage | Sideways gallery recipe |
| Pushed line | One line of very large type is pushed sideways by the scroll, reading whole at the middle of its run | `animation-timeline: view()` on the line, `translateX` from 12% to -12%, linear; static where unsupported |
| Rolling figures | The few figures that make the case roll up to their values once | Rolling figures recipe |
| Carried picture | The picture clicked in a list travels into place as the next page's hero | Page to page recipe |

Pick by subject. A portfolio wants the index with preview; a restaurant wants the slow crossfade; a
product wants the shutter on its hero object. If the move says nothing about the subject, it is
decoration and the page is better without it.

Pick by subject, as before: the opening window for a product or a place with one great photograph; the
sheet for chapters that each own a picture; the sideways gallery for a short set of rooms, kitchens or
pieces; the pushed line for a brand whose claim is a word; rolling figures for a report, a fund or a
practice that leads with numbers; the carried picture for a portfolio whose index and case pages are
both built.

## 8. Reduced motion and performance

- `prefers-reduced-motion: reduce` means fewer and gentler, not none: keep opacity and colour changes,
  drop travel, scale, parallax and autoplay. All recipes above are written inside
  `no-preference` blocks so the reduced state is simply the finished state.
- Animate `transform`, `opacity` and `clip-path`. Animating `width`, `height`, `top`, `left`, `margin`
  or `padding` forces layout on every frame. `grid-template-rows` for accordions is the accepted
  exception because it is short and rare.
- Do not drive many children from one changing CSS variable on a parent; set the transform on the
  element that moves.
- `will-change` only on an element that is about to animate, removed afterwards.
- Pause loops when off screen or when the tab is hidden.
- No scroll hijacking and no custom cursor. They cost usability, which is 30% of an Awwwards score and
  the line most winners score lowest on. Smoothing only through `Stage.smooth()`, which stays off for
  touch and reduced motion.

## 9. What gives generated motion away

- The same fade-up on every block.
- A dozen staggered entrances in the hero.
- Hover lift or zoom on every card and image.
- Bounce or elastic easing on interface elements.
- Infinite loops that mean nothing: pulsing dots, floating shapes, shimmering text, rotating badges.
- A reveal that never fires and leaves a blank band in the page. Run `inspect.mjs` after the motion
  pass and look at every screenshot for missing content.

### Seen in the latest Sites of the Day

Seen in the study, with how often, and what the house does instead.

- **Preloaders and counters (60 of 99; 26 with a counter).** Half the usable pages were unreadable
  2.5 s after load, a third at 4.5 s; the preloaders sat mostly on pages that had already loaded, and
  25 of the 29 that loaded in under 3 s still showed nothing readable at 4.5 s. Counters stalled,
  outlasted the load or were tweens with nothing behind them. House: no preloader. If a scene must
  load, the HTML first screen (headline, picture, action) is there at once and the scene fades in
  behind it when ready.
- **Gates (10 of 99): enter, sound, age or gesture before any content.** House: none. Sound is a
  control on the page, off by default.
- **Scroll hijacking (16 wheel-driven scenes, 9 of them endless, plus 14 single screens where the wheel
  does nothing).** The visitor cannot tell where they are, how much is left or how to get out, and the
  keyboard and screen readers get nothing. Usability 6.01 against 6.50 for pages that scroll. House:
  native scroll; any scene is driven by scroll position on a sticky stage that ends, with a count.
- **Smooth-scroll libraries (67 of 99).** They make the scrubbed scenes feel weighted, and they also
  put a delay between the hand and the page; with a long ease the page keeps sliding after the wheel
  stops.
- **Custom cursors (28 of 99).** Followers, image trails, a lens that smears the headline it sits on,
  labels that only exist on hover; 10 of the 28 have any reduced-motion rule. House: the system cursor;
  labels are on the page.
- **Scramble and typewriter text (11 and 5).** The headline unreadable for four seconds, body copy
  garbled mid-scroll, actions held back until the typing ends. House: not used. Real words arrive whole.
- **Long held runways.** Pages with pins average twice the length for fewer words per screen; 17 pages
  are 20 screens or longer, some with whole screens that hold only a slow rotation. House: about one
  screen per step, three per stage, every held screen carries a line of text.
- **Content held at zero opacity.** Reveals that keep text invisible until the scroll settles, inactive
  items dimmed to 10-15%, statements left half pale. House: reveals only below the fold, once, never
  longer than 900 ms in view; dims no lower than 40%; fills start at 45%.
- **Motion over words.** Marquees and drifting objects that cross statements, a sliding line that crops
  its own words, blur left on text mid-move. House: nothing moves across text the visitor is reading;
  a moving line must read whole at some point of its run.
- **Overshoot and bounce (19 stylesheets).** House: still banned on interface elements.
- **Endless loops with no off switch.** Grain, pulsing dots, equalisers, spinning badges, running with no
  reduced-motion rule on most pages. House: loops pause off screen and stop under reduced motion.

Where the study's work does something the house bans, the house version: hairline progress bars and
tick rails on held stages become a plain count in the body face ("2 of 4"); zero-padded counters
("01/08") become a plain count or nothing; crossfading gradient grounds become flat chapter colours with
hard cuts; monospace HUD labels become small text in the text face.

## 10. Rules for motion

1. **First frame.** The headline, the sentence and the picture are in the HTML and painted on the first
   frame. The load sequence starts without waiting for the load event and is settled by 1.2 s, with
   four elements at most.
2. **No preloader, no counter, no gate, no custom cursor, no wheel capture.** Smoothing only through
   `Stage.smooth()` (Lenis at lerp 0.1-0.14, off for touch and reduced motion): weight, never a page
   that keeps sliding after the hand stops.
3. **Curves.** `--ease-out` for anything under 600ms; `--ease-expo` for reveals of 800ms or more;
   `--ease-in-out` for wipes and things that travel; `--ease-exit` only for things leaving for good;
   `linear` for scroll-linked motion and loops; plain `ease` for colour. No overshoot.
4. **Durations.** Press 140ms; hover colour 180-200ms; hover that moves 300-400ms; menus 240ms; reveals
   700-900ms; picture openings 1,100-1,300ms; exits 60-70% of the matching entrance.
5. **Staggers.** Lines 80-110ms; list items 50-90ms; characters 20-40ms and only in a heading of one to
   three words; four steps at most in any one sequence.
6. **Reveals.** Fire once, when the element's top is 85-90% of the way down the viewport; rise 12-32px
   or from a line mask; nothing in view stays hidden for more than 900ms; nothing above the fold waits
   for scroll.
7. **Scroll scenes are where the page is bold.** The big moves come from the scene library
   (`references/scenes.md`): the direction sheet deals two or three per page, each built on
   `assets/scenes/stage.js`, each held for one to four screens, each with a phone version and a
   finished composition. Inside a scene the scene's own numbers apply (a picture may grow from a
   window to the whole screen, type may cross the stage, a camera may fly through a field of
   pictures); rules 8 and 10 still hold for the text a visitor is reading.
8. **Outside the scenes, scroll-linked travel stays quiet.** Linear and locked to the scrollbar;
   parallax under 8% of the element; scale between 0.94 and 1.15; built with scroll timelines inside
   `@supports`, static without them. Other held stages: sticky, about one screen per step, three
   screens at most, a line of text on every held screen.
9. **One of each.** One signature move (a dealt scene can be it); one moving picture; one marquee at
   most. A quiet section between two scenes, so each one lands.
10. **Text stays readable.** Fills start at 45% ink; dims no lower than 40%; blur at most 8px and gone
    once settled; nothing moves across text being read.
11. **Colour by chapter** as hard cuts at section edges; the fixed header's ink follows in 300ms.
12. **Horizontal motion.** The native drag row first; the pinned sideways gallery only for rows under
    three screens long, with keyboard support.
13. **Page to page.** View transitions, 480ms at most, off under reduced motion.
14. **Reduced motion.** Every hidden state lives inside `prefers-reduced-motion: no-preference`; the
    reduced page is the finished page; loops stop. Two in three award pages skip this, which is a
    reason to do it, not a licence to skip it.
