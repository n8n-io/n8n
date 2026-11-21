---
name: gsap
description: Use when you need to add or debug professional web animations with GSAP (timelines, ScrollTrigger, stagger, transforms) in HTML/CSS/JS/React. Includes patterns for smooth motion, performance, and common pitfalls.
---

# GSAP (GreenSock) — Web Animation Skill

## When to use
- High-quality UI/motion design: entrances, micro-interactions, page transitions
- Timeline-based sequences (vs. scattered CSS transitions)
- Scroll-driven storytelling (with ScrollTrigger)
- Complex easing, staggering, orchestration across many elements

## Key concepts & APIs
- Tweens:
  - `gsap.to(targets, vars)`
  - `gsap.from(targets, vars)`
  - `gsap.fromTo(targets, fromVars, toVars)`
- Timelines:
  - `const tl = gsap.timeline({ defaults, repeat, yoyo, paused })`
  - Chain: `tl.to(...).from(...).addLabel('x').add(() => ...)`
  - Position parameter: absolute `1.2`, relative `"+=0.5"`, overlap `"-=0.3"`, label `"intro"`
- Eases: `ease: "power2.out"`, `"expo.inOut"`, `"elastic.out(1, 0.3)"`
- Staggers: `stagger: 0.05` or `{ each, from: "start|center|end|random", grid }`
- Performance-friendly properties:
  - Prefer transforms (`x`, `y`, `scale`, `rotation`) and opacity (`autoAlpha`)
- ScrollTrigger (plugin):
  - `gsap.registerPlugin(ScrollTrigger)`
  - Inline: `gsap.to(".box", { scrollTrigger: ".box", x: 500 })`
  - Advanced: `scrollTrigger: { trigger, start, end, scrub, pin, snap, markers }`
  - Standalone: `ScrollTrigger.create({ trigger, start, end, onUpdate, onToggle })`

## Common pitfalls (and fixes)
- Animating layout properties (top/left/width/height) → jank
  - Use transforms, add `will-change: transform`, avoid forced reflow.
- ScrollTrigger “not firing” due to wrong trigger sizing/overflow containers
  - Ensure trigger exists, has height, and check scroll container (nested scrolling needs config).
- Not cleaning up in SPA/React
  - Use `gsap.context()` and revert on unmount; kill triggers (`ScrollTrigger.getAll().forEach(t => t.kill())`) if needed.
- FOUC / measuring before fonts/images load
  - Initialize after layout is stable; run `ScrollTrigger.refresh()` after images load.

## Quick recipes

### 1) Hero entrance (stagger)
```js
gsap.from(".hero [data-anim]", {
  y: 24,
  autoAlpha: 0,
  duration: 0.8,
  ease: "power2.out",
  stagger: 0.06,
});
```

### 2) Sequenced timeline
```js
const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 0.6 } });
tl.from(".nav", { y: -20, autoAlpha: 0 })
  .from(".hero-title", { y: 30, autoAlpha: 0 }, "-=0.2")
  .from(".hero-cta", { scale: 0.95, autoAlpha: 0 }, "-=0.2");
```

### 3) Scroll-scrub pinned section
```js
gsap.registerPlugin(ScrollTrigger);

gsap.timeline({
  scrollTrigger: {
    trigger: ".story",
    start: "top top",
    end: "+=800",
    scrub: 1,
    pin: true,
  },
}).to(".story .panel", { xPercent: -200 });
```

## What to ask the user (if requirements unclear)
- Is this a static site or SPA (React/Next/Vue)? Any page transitions?
- Do we need scroll-driven sections (pin/scrub/snap)?
- Performance constraints (mobile support, reduced motion)?
