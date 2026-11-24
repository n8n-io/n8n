# Three.js Demo Prompts

## Minimal prompt

Use $threejs to create a polished standalone HTML example that clearly demonstrates the skill.

## Recreate the demo

Use $threejs to build a responsive reference demo for this capability:

> Use when building or debugging interactive 3D scenes on the web with Three.js (scene/camera/renderer, lights/materials, GLTF loading, controls, performance). Helpful for designers shipping 3D UI moments.

### Direction

Center a lit, rotating geometric object with visible mesh depth and restrained camera motion.

Use an art-directed composition with one clear focal point, restrained supporting copy, and enough surrounding interface to show how the technique behaves in a real product or landing page.

### Canonical example

- Project and rotate a glowing wireframe cube with eight vertices and visible perspective.
- Keep the object centered inside a technical measurement frame.

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
- Show real perspective, mesh depth, and a stable rotation axis.
- Pause rendering when the page is hidden and resize without distortion.

## Remix prompt

Use $threejs and keep the same implementation contract, but change the subject, copy, palette, and content hierarchy. Preserve the core technique, accessibility behavior, responsive rules, and performance constraints demonstrated by the reference.
