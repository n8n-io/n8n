---
name: cinematic-scroll-storytelling
description: Create cinematic scroll-driven landing pages with Lenis smooth scrolling, GSAP ScrollTrigger, scroll-linked progression, staggered text reveals, sticky card stacks, parallax backgrounds, scroll-scrubbed transitions, footer reveals, and immersive preloaders. Use when analyzing or building premium editorial scroll experiences, sticky project stacks, kinetic typography, or section-by-section storytelling.
---

# Cinematic Scroll Storytelling

## Use When
- A page should feel like a premium editorial story that unfolds as the user scrolls.
- The user mentions scroll-driven storytelling, scroll-linked animation, sticky card stacks, parallax, split text, preloader, or cinematic progression.
- A portfolio, studio, product, or landing page needs section-by-section reveals with layered depth.
- The implementation can use GSAP, ScrollTrigger, and Lenis.

## Effect Vocabulary
- Scroll-driven storytelling: sections reveal as a sequence while scrolling.
- Scroll-linked animation: progress is tied directly to scroll with `scrub`.
- Scroll-triggered motion: animation starts when a section enters the viewport.
- Staggered reveal: words, lines, cards, or elements enter with small delays.
- Progressive reveal: opacity, scale, blur, clip, or position changes over scroll progress.
- Sticky card stack: sticky cards layer, scale, and recede as the next card arrives.
- Parallax scrolling: background and foreground layers move at different speeds.
- Scroll scrubbing: animation follows the scrollbar through `scrub: true` or `scrub: 1`.
- Kinetic typography: masked split-text movement, usually word-by-word or line-by-line.
- Preloader: opening loading screen, progress bar, and intro transition.

## Target Feel
- Luxury editorial website.
- High-end creative studio portfolio.
- Apple-level motion polish.
- Modern Awwwards interaction language.
- Immersive cinematic landing page.

Avoid:
- Bounce, elastic, or springy motion.
- Aggressive scale jumps.
- Flashy gaming-style effects.
- Too many simultaneous scroll effects.
- Scroll hijacking that makes the page hard to read.

## Core Stack

```bash
npm i gsap lenis
```

```js
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduceMotion) {
  const lenis = new Lenis({
    lerp: 0.08,
    smoothWheel: true,
    wheelMultiplier: 0.9,
  });

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

window.addEventListener("load", () => ScrollTrigger.refresh());
```

## Motion Tokens
- Enter ease: `power3.out` or `power4.out`.
- Scrubbed scenes: `ease: "none"` with `scrub: 0.8` to `1.4`.
- Text reveal duration: `0.8s` to `1.1s`.
- Card reveal duration: `0.9s` to `1.2s`.
- Word stagger: `0.035s` to `0.07s`.
- Line stagger: `0.08s` to `0.14s`.
- Card stagger: `0.06s` to `0.1s`.
- Reveal offset: `y: 24` to `48`.
- Blur: `4px` to `10px`, then `0px`.
- Sticky card scale depth: `1` down to `0.92`.

## Page Anatomy
1. Preloader: black screen, progress bar, brand/title, intro fade.
2. Hero: image parallax, masked headline reveal, subtle scroll cue.
3. Intro: word-by-word kinetic typography.
4. Story sections: scroll-triggered fade-up, blur-in, and clip reveals.
5. Recent Projects: sticky card stack with scale and layered depth.
6. Gallery or proof: scroll-scrubbed horizontal or progressive reveals.
7. Footer: parallax reveal or slow upward handoff.

## Markup Pattern

```html
<div class="preloader" data-preloader>
  <div class="preloader__bar" data-preloader-bar></div>
</div>

<main>
  <section class="hero" data-parallax-section>
    <img data-parallax-layer data-speed="-0.18" src="/hero.jpg" alt="">
    <h1 data-split-reveal>Design that unfolds with cinematic restraint.</h1>
  </section>

  <section data-story-section>
    <p data-split-reveal="words">Every block arrives with quiet intent.</p>
  </section>

  <section class="project-stack" data-sticky-stack>
    <article data-stack-card>Project One</article>
    <article data-stack-card>Project Two</article>
    <article data-stack-card>Project Three</article>
  </section>

  <footer data-footer-parallax>...</footer>
</main>
```

## Preloader Sequence

Use a preloader to set the cinematic tone, then hand off into the hero reveal.

```js
function initPreloader() {
  const loader = document.querySelector("[data-preloader]");
  const bar = document.querySelector("[data-preloader-bar]");
  if (!loader) return Promise.resolve();

  if (reduceMotion) {
    loader.remove();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => {
        loader.remove();
        resolve();
      },
    });

    tl.fromTo(bar, { scaleX: 0, transformOrigin: "left" }, { scaleX: 1, duration: 1.1 })
      .to(loader, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, "+=0.15");
  });
}
```

## Split Text Reveal

Use masked overflow containers. Avoid splitting text that contains links or meaningful inline markup.

```js
function splitWords(element) {
  if (element.dataset.splitReady === "true") return;

  const text = element.textContent || "";
  const parts = text.split(/(\s+)/);
  element.textContent = "";
  element.setAttribute("aria-label", text.trim());

  parts.forEach((part) => {
    if (!part.trim()) {
      element.appendChild(document.createTextNode(part));
      return;
    }

    const mask = document.createElement("span");
    const word = document.createElement("span");
    mask.className = "split-word-mask";
    word.className = "split-word";
    word.textContent = part;
    mask.setAttribute("aria-hidden", "true");
    mask.appendChild(word);
    element.appendChild(mask);
  });

  element.dataset.splitReady = "true";
}

function initSplitReveals() {
  if (reduceMotion) {
    gsap.set("[data-split-reveal]", { autoAlpha: 1 });
    return;
  }

  gsap.utils.toArray("[data-split-reveal]").forEach((element) => {
    splitWords(element);
    const words = element.querySelectorAll(".split-word");

    gsap.fromTo(
      words,
      { yPercent: 110, autoAlpha: 0, filter: "blur(8px)" },
      {
        yPercent: 0,
        autoAlpha: 1,
        filter: "blur(0px)",
        duration: 0.95,
        ease: "power4.out",
        stagger: 0.05,
        scrollTrigger: {
          trigger: element,
          start: "top 82%",
          once: true,
        },
      }
    );
  });
}
```

```css
.split-word-mask {
  display: inline-block;
  overflow: hidden;
  vertical-align: top;
}

.split-word {
  display: inline-block;
  will-change: transform, opacity, filter;
}
```

## Scroll-Triggered Reveals

Use these for normal sections. They should play once and feel composed, not twitchy.

```js
function initSectionReveals() {
  if (reduceMotion) {
    gsap.set("[data-story-section], [data-reveal-item]", { autoAlpha: 1, clearProps: "all" });
    return;
  }

  gsap.utils.toArray("[data-story-section]").forEach((section) => {
    const items = section.querySelectorAll("[data-reveal-item]");
    const targets = items.length ? items : section.children;

    gsap.fromTo(
      targets,
      { y: 36, autoAlpha: 0, filter: "blur(8px)" },
      {
        y: 0,
        autoAlpha: 1,
        filter: "blur(0px)",
        duration: 1,
        ease: "power4.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: section,
          start: "top 82%",
          once: true,
        },
      }
    );
  });
}
```

## Scroll-Linked Progression

Use scrubbed timelines for cinematic progression. Keep scrubbed animation linear and let the scroll position do the timing.

```js
function initProgressionScenes() {
  if (reduceMotion) return;

  gsap.utils.toArray("[data-progress-scene]").forEach((scene) => {
    const media = scene.querySelector("[data-progress-media]");
    const copy = scene.querySelectorAll("[data-progress-copy]");

    gsap.timeline({
      scrollTrigger: {
        trigger: scene,
        start: "top top",
        end: "+=140%",
        scrub: 1.1,
        pin: true,
        anticipatePin: 1,
      },
    })
      .fromTo(media, { scale: 1.08 }, { scale: 1, ease: "none" })
      .fromTo(copy, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, stagger: 0.15, ease: "none" }, 0.15);
  });
}
```

## Sticky Card Stack

Use `position: sticky` for layout, and ScrollTrigger for layered scale/depth. Earlier cards should recede as later cards arrive.

```css
[data-sticky-stack] {
  position: relative;
}

[data-stack-card] {
  position: sticky;
  top: 12vh;
  transform-origin: center top;
  will-change: transform, opacity;
}
```

```js
function initStickyCardStack() {
  if (reduceMotion) return;

  gsap.utils.toArray("[data-sticky-stack]").forEach((stack) => {
    const cards = gsap.utils.toArray(stack.querySelectorAll("[data-stack-card]"));

    cards.forEach((card, index) => {
      const nextCard = cards[index + 1];
      if (!nextCard) return;

      gsap.to(card, {
        scale: 0.92 + index * 0.015,
        autoAlpha: 0.72,
        y: -24,
        ease: "none",
        scrollTrigger: {
          trigger: nextCard,
          start: "top 78%",
          end: "top 24%",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    });
  });
}
```

## Parallax

Use parallax for hero images, background layers, and footer reveals. Keep distance small.

```js
function initParallax() {
  if (reduceMotion) return;

  gsap.utils.toArray("[data-parallax-layer]").forEach((layer) => {
    const speed = Number(layer.dataset.speed || -0.16);
    const section = layer.closest("[data-parallax-section]") || layer;

    gsap.to(layer, {
      y: () => window.innerHeight * speed,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
  });
}
```

Footer parallax reveal:

```js
function initFooterReveal() {
  if (reduceMotion) return;

  const footer = document.querySelector("[data-footer-parallax]");
  if (!footer) return;

  gsap.fromTo(
    footer,
    { yPercent: -12, autoAlpha: 0.85 },
    {
      yPercent: 0,
      autoAlpha: 1,
      ease: "none",
      scrollTrigger: {
        trigger: footer,
        start: "top bottom",
        end: "top 45%",
        scrub: 1,
      },
    }
  );
}
```

## Build Order
1. Build the static page first.
2. Add preloader and hero entrance.
3. Add split text reveals.
4. Add section-by-section reveals.
5. Add sticky card stack progression.
6. Add parallax layers.
7. Add scrubbed pinned scenes only where the story needs them.
8. Add reduced-motion and touch fallbacks.
9. Run browser QA across desktop and mobile.

## Prompt Template

```txt
Create a cinematic scroll-driven landing page with smooth Lenis scrolling, GSAP ScrollTrigger animations, staggered text reveals, sticky card stack progression, parallax backgrounds, scroll-scrubbed transitions, section-by-section storytelling, and an immersive preloader animation. Use layered depth, scaling transitions, progressive opacity changes, and smooth viewport-triggered motion for a premium editorial experience.
```

## QA Checklist
- Content is readable with JavaScript disabled.
- Reduced-motion users see static content and no smooth-scroll layer.
- Scroll-triggered reveals play once.
- Scroll-linked scenes use `scrub` intentionally.
- Sticky cards do not overlap the footer or trap the page.
- Parallax movement stays subtle and does not harm readability.
- Preloader exits reliably even if images load slowly.
- `ScrollTrigger.refresh()` runs after images/fonts/layout shifts.
- Mobile has simplified pinning or no pinning if performance drops.
