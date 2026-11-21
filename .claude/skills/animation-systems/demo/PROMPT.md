# Animation Systems Demo Prompts

## Minimal prompt

Use $animation-systems to create a polished standalone HTML example that clearly demonstrates the skill.

## Recreate the demo

Use $animation-systems to build a responsive reference demo for this capability:

> Use when designing or implementing product-grade web motion like Stripe, Linear, Apple, and Vercel. Covers motion principles, easing/duration defaults, choreography patterns, scroll/hover interactions, performance, accessibility (reduced motion), and implementation guidance.

### Direction

Make choreography, easing, and replay behavior the primary demonstration.

Use an art-directed composition with one clear focal point, restrained supporting copy, and enough surrounding interface to show how the technique behaves in a real product or landing page.

### Canonical example

- Reveal the lines Motion should, explain the, and next state in sequence.
- Use a four-part timeline and a keyboard-accessible Replay sequence control.

### Deliverable

- Create demo/index.html as a standalone document.
- Keep CSS and JavaScript inline.
- Put any required images, fonts, models, textures, or vendor files in demo/assets/.
- Do not add a framework, package manager, build step, or node_modules.
- Add controls only when they help inspect or replay the technique.

### Acceptance checks

- Keep the demo responsive from 390px through 1440px.
- Use semantic HTML, visible focus states, and reduced-motion handling.
- Keep all HTML, CSS, and JavaScript inside demo/index.html.
- Use only relative local asset paths.
- Provide a replay control and stop continuous work when the animation settles.
- Remove nonessential movement under prefers-reduced-motion.

## Remix prompt

Use $animation-systems and keep the same implementation contract, but change the subject, copy, palette, and content hierarchy. Preserve the core technique, accessibility behavior, responsive rules, and performance constraints demonstrated by the reference.
