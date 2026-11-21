# Three.js Scroll Worlds demo prompt

## Minimal prompt

```text
Use $build-threejs-scroll-worlds to turn this experience into one detailed persistent Three.js world with camera waypoints, textured landmarks, local interactions, and synchronized story chapters controlled by native scroll.
```

## Recreate the Kage demo

Use `$build-threejs-scroll-worlds` to build **Kage — Hidden Realms of Kyoto** as a focused multi-scene scroll-world demo. Treat this `index.html` and its bundled Kage assets as the exact visual, motion, responsive, accessibility, and performance reference.

Do not reconstruct or simplify the demo. Start from the current approved `kage.html` and copy it unchanged with the local runtime assets it references. Extract the reusable scroll-world reasoning into the skill documentation without replacing the original temple, camera rig, layout, typography, foreground stages, post-processing, or interactions.

### World

- Create one persistent Three.js night sanctuary with a red moon, tiered temple, torii, stairs, lanterns, dark trees, mist, falling red leaves, and wet ground.
- Keep one renderer, scene, camera, and world for the entire page.
- Use six camera chapters: Hidden Gate, Sanmon, Still Gardens, Sacred Craft, Afterlight, and Colophon.
- Interpolate camera position and target on Catmull–Rom curves. Interpolate FOV per segment and pull the camera back on tall screens.
- Scroll position is the exact source of truth. Damp a separate render value for cinematic weight.

### Composition

- Preserve Kage's dark blue-black field, vermilion moon, centered temple axis, muted sage-white type, Japanese vertical text, giant foreground KAGE word, thin rules, red foliage, and heavy film grain.
- Keep the hero heading left aligned. Put the scene preview low on the right and chapter numbers along the bottom.
- Use transparent foreground cut-outs as fixed viewport scenery at each chapter. They are fully opaque while active and retire with a fade plus blur.
- Reveal each heading word by word. Reveal eyebrow, body, media, and CTA as separate elements.

### Interaction and fallback

- Keep native reversible scroll; do not intercept wheel events or trap sections.
- Chapter links and the right rail scroll to exact anchors and follow exact progress, not the damped camera.
- Cap DPR at 2, pause while hidden, clamp resumed frame time, resize correctly, and dispose resources on teardown.
- Use only the bundled local Three.js build, fonts, plates, and foregrounds. No remote dependencies.
- Keep semantic copy and navigation above the canvas. On reduced motion, snap to the nearest camera waypoint and remove stagger/blur. On WebGL failure, reveal the owned Kage poster.

### Verification bar

- The opening live frame is recognisably Kage.
- One canvas persists through all chapters.
- Slow, fast, reverse, scrollbar-drag, anchor navigation, reload-at-depth, and resize all reproduce the correct chapter.
- Desktop 1440×900 and mobile 390×844 keep the temple, copy, foreground, nav, and rail legible.
- Foreground assets have no rectangular background, are 100% opaque while active, stay attached to the viewport edge, and fade/blur on exit.
- Console, local assets, keyboard focus, reduced motion, fallback, hidden-tab pause, and teardown are clean.

## Remix prompt

```text
Use $build-threejs-scroll-worlds to create an interactive museum journey through a continuous desert observatory at dusk. Keep the proven Kage architecture: one persistent scene, six semantic chapters, authored camera position/target/FOV waypoints, exact and damped progress values, native reversible scrolling, responsive camera overrides, local Three.js, reduced-motion snapping, and a poster fallback. Build a coherent material and texture system for sandstone, oxidized brass, glass, dust, paper charts, and emissive instruments. Add keyboard-accessible local interactions for a telescope, star map, and mechanical orrery without letting them take control of the scroll camera. Change the world, palette, typography, copy, landmarks, DOM layout, foreground treatment, and interaction design while preserving the real-time scroll-world mechanism and measurable performance budgets.
```
