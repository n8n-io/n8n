---
name: build-threejs-scroll-worlds
description: Build rich, scroll-controlled real-time Three.js experiences as one persistent 3D world whose camera, lighting, atmosphere, materials, objects, DOM story, and interactions evolve across authored chapters. Use for 3D scrollytelling, scroll-driven WebGL worlds, camera journeys, interactive portfolios, product stories, exhibitions, explainers, game or film microsites, spatial narratives, and multi-scene websites where native scroll should travel through one continuous place. Not limited to landing pages.
---

# Build Three.js Scroll Worlds

Build one detailed real-time world and use native document scroll as its deterministic conductor. Keep the renderer, scene graph, and spatial continuity alive while camera composition, light, fog, animation, copy, and interaction focus move through authored chapters.

The mechanism is **one persistent Three.js world + one normalized reversible scroll state**. If removing either makes the experience collapse into stacked sections, this skill applies.

The exact [Kage demo](demo/index.html) proves the quality bar; it is staging, not a mandatory subject or layout. Use its detailed anatomy only when the requested direction benefits from it: [references/kage-anatomy.md](references/kage-anatomy.md).

## Route the request correctly

- Use `threejs` for a single interactive scene with no scroll-authored journey.
- Use `scroll-world-storytelling` when deciding between real-time 3D, pre-rendered video, and DOM-first storytelling.
- Use `scroll-scrubbed-visual-sequence` for a video or image sequence whose time is scrubbed by scroll.
- Use `cinematic-scroll-storytelling` for DOM-first GSAP/Lenis choreography.
- Use this skill when objects must remain truly spatial and interactive while scroll moves through several compositions in one live WebGL world.

Do not disguise a video as Three.js. The public [oso95/scroll-world](https://github.com/oso95/scroll-world) project, reviewed at commit `71cc36d`, is a strong reference for intake, scene ledgers, budget gates, mobile-specific composition, config-driven playback, and seam QA, but its renderer is a pre-generated video chain. This skill adopts those structural strengths while retaining real geometry, materials, lighting, raycasting, and camera control.

## Read the build references

Before implementing a new world, read:

- [references/world-bible.md](references/world-bible.md) for intake, art direction, scene, material, texture, and interaction ledgers;
- [references/realtime-architecture.md](references/realtime-architecture.md) for the scene graph, conductor, camera, loading, interaction, and lifecycle patterns;
- [references/quality-and-qa.md](references/quality-and-qa.md) before optimization and final verification.

Copy [references/scroll-conductor.js](references/scroll-conductor.js) when a project needs a portable native-scroll conductor rather than a framework-specific implementation.

## Start with the output, not the template

Determine what the world is for: a landing page, portfolio, museum chapter, product explanation, game teaser, editorial essay, data story, or another spatial experience. Do not force every request into a hero-plus-CTA layout.

Discover only what is unknown:

- the subject, audience, and ordered story beats;
- the art direction and emotional arc;
- whether the world is continuous, portal-connected, or composed as adjacent sets;
- the target devices and minimum acceptable hardware;
- how interactive the world should be beyond scrolling;
- available models, textures, brand assets, audio, and copy;
- the initial-load and total-download budget.

If the user supplied an approved reference or working scene, inspect it first and carry its real geometry, materials, textures, light ratios, camera values, and motion constants into the ledger. Do not replace measured details with adjectives.

## Write the world bible before code

Define one reusable visual grammar:

- scale system and unit convention;
- silhouette language and level of stylization;
- palette and per-chapter accent progression;
- material families and wear logic;
- key, fill, rim, practical, and emissive light roles;
- fog, haze, particles, weather, and post-processing;
- typography, DOM composition, and near-plane foreground rules;
- motion grammar for camera, ambient objects, and interactions.

Every visible detail must support the same world. Random noise, unrelated texture packs, arbitrary particle effects, and one-off materials create complexity without cohesion.

## Author a scene ledger

Use 4–8 chapters for most experiences. Store the full contract as data rather than scattering thresholds through CSS and the render loop:

```js
const chapters = [
  {
    id: "threshold",
    scrollWeight: 1.25,
    copy: {
      eyebrow: "Chapter 01",
      title: "Enter the archive",
      body: "A spatial collection revealed through motion."
    },
    camera: {
      position: [0, 3.8, 13.5],
      target: [0, 2.4, -8],
      fov: 38,
      mobile: { position: [0, 4.8, 18], fov: 46 }
    },
    world: {
      key: 1.0,
      practicals: 0.35,
      fog: 0.018,
      particles: 0.25,
      grade: "cold"
    },
    focus: ["gate", "lantern-left"],
    interactions: ["inspect-gate"],
    assets: ["gate-shell", "stone-1k", "mist-atlas"]
  }
];
```

For each chapter record the story beat, landmark, camera endpoint, occluders, light/fog state, active animation clips, interaction targets, DOM beat, foreground treatment, asset dependencies, and responsive override. Reject a chapter that differs only by copy.

## Build one persistent spatial architecture

Create these systems once:

```text
WebGL canvas
  worldRoot
    environment       sky, terrain, distant silhouettes
    architecture      persistent landmarks and paths
    chapterSets       local props grouped for culling and loading
    interactives      raycast targets and animation state
    atmosphere        fog volumes, particles, weather
    nearPlane3D       optional camera-relative depth accents

DOM above canvas
  semantic chapters  headings, copy, links, media, fallback order
  fixed interface    progress, chapter navigation, controls
  fixed cut-outs      optional alpha foregrounds at viewport edges
```

Use one renderer and normally one scene. Use layers or render passes when transparency, post-processing, or interaction isolation requires them. Do not instantiate one renderer per chapter or rebuild the world at seams.

Choose a topology deliberately:

- **Continuous geography:** landmarks share one navigable space; strongest presence, highest world-building cost.
- **Connected sets:** rooms or islands are joined by tunnels, gates, fog banks, terrain folds, or darkness; easiest to art-direct and stream.
- **Layered reveal:** the same place changes through time, scale, or state; animate materials, visibility, and light instead of moving to unrelated coordinates.

Hide unavoidable discontinuities behind occlusion, darkness, dense atmosphere, an interior threshold, or a close foreground pass. Never let an object visibly teleport in open space.

## Give the world real detail

### Geometry

- Establish the large silhouette first, then medium forms, then small accents. A dense scatter of tiny props cannot rescue a weak silhouette.
- Give architectural edges believable thickness, bevels, joints, caps, reveals, and contact points. Paper-thin roofs and floating props expose the fake immediately.
- Use modular kits, instancing, merged static meshes, and LODs instead of duplicating unique geometry.
- Break repetition with authored clusters, scale/rotation ranges, decals, and material variation—not unbounded randomness.
- Keep collision and raycast proxies simpler than render meshes.

### Materials and textures

Use a coherent PBR surface stack where it improves the image:

| map | role | common failure |
| --- | --- | --- |
| base color | material identity and broad variation | baked highlights fight live lighting |
| normal | small directional relief | strength too high makes rubber or foil |
| roughness | controls highlight breakup and age | flat values make every object plastic |
| AO | contact and crevice grounding | multiplied too heavily makes dirty seams |
| metalness | separates conductors from dielectrics | gray values everywhere create implausible mud |
| emissive | practical lights, screens, runes | replaces light but does not illuminate nearby forms |
| alpha/transmission | foliage, cloth, glass, mist | sorting, overdraw, and depth artifacts |

- Set color textures to sRGB and keep normal, roughness, AO, metalness, and data textures linear.
- Keep texel density consistent within a camera range. Reserve 2K–4K maps for surfaces that genuinely fill the frame; use 512–1K atlases for most props.
- Prefer KTX2/Basis compression, Meshopt/Draco geometry compression, atlases, trim sheets, decals, and baked AO/light where appropriate.
- Add anisotropy only to shallow-angle surfaces that need it. Setting every texture to the maximum wastes bandwidth.
- Make wear causal: exposed edges polish, recesses collect grime, water leaves vertical or pooling traces, and paths compress vegetation. Uniform grunge reads as a filter.
- For foliage, use alpha-tested cards or instanced low-poly clusters before transparent blended planes. Transparency overdraw is often more expensive than geometry.

### Lighting and atmosphere

- Start with one authored key direction, a restrained environment/fill, and practical emissive sources. Add lights only when they create a visible relationship.
- Bake static bounce and contact where possible. Keep shadow-casting dynamic lights to roughly 1–2 on mobile and 2–4 on desktop unless profiling proves more.
- Use fog and haze to separate depth planes, not merely darken the scene. Keep the focal landmark inside the contrast window.
- Match emissive geometry, glow sprites, actual light intensity, and bloom threshold so lamps feel luminous without bleaching the frame.
- Use post-processing after the unprocessed frame is composed. Bloom, vignette, grain, chromatic separation, and depth of field must not hide weak materials or framing.

Record the detailed surface and light plan in the ledgers from [references/world-bible.md](references/world-bible.md).

## Map native scroll to deterministic state

Measure stable section anchors only after fonts and critical media settle. Convert `scrollY` into a fractional chapter value such as `2.35`.

Keep separate values:

```js
rig.target = progressFromScroll(scrollY);       // exact reproducible story state
rig.smooth = reduceMotion
  ? rig.target
  : damp(rig.smooth, rig.target, 5.2, dt);      // cinematic render state
```

Use exact progress for navigation, URLs, accessibility, foreground ownership, and interaction gating. Use smoothed progress for camera and visual interpolation only. The same scroll position must recreate the same state forward, backward, after a fast jump, and after reload.

Use [references/scroll-conductor.js](references/scroll-conductor.js) as the baseline implementation. Keep native scroll as the source of truth; never integrate wheel delta into story position.

## Author the camera as cinematography

Compose every chapter endpoint at desktop and mobile before interpolating.

- Store position, target, FOV, optional roll, lens shift, and responsive overrides.
- Use Catmull–Rom curves for broad continuous travel and segment interpolation for deliberate turns.
- Inspect the curve for wall penetration, ground clipping, target flips, speed spikes, and accidental close passes.
- Parameterize by chapter progress, not raw curve arc length, so story pacing remains intentional.
- Use `scrollWeight` to give important views more dwell; do not distort the camera path just to slow a section.
- Add restrained pointer parallax only after the base composition works. Clamp it and blend it out near precise transitions.
- On tall viewports, author a pullback/FOV override instead of accepting an arbitrary center crop.

Camera motion must expose new spatial relationships: approach, reveal, passage, scale change, inspection, horizon, departure. Six dolly-ins aimed at the same center are not six scenes.

## Interpolate world state from the same conductor

Resolve the adjacent chapters once per frame and interpolate their declared values:

```js
const { a, b, t } = segmentState(rig.smooth);
moon.scale.setScalar(lerp(a.world.moon, b.world.moon, t));
key.intensity = lerp(a.world.key, b.world.key, t);
scene.fog.density = lerp(a.world.fog, b.world.fog, t);
```

Prefer continuous physical change: occlusion, material blend, animation mixer weight, light, fog, scale, and transform. When swapping assets, crossfade only within an occluded or atmospherically dense interval and keep both states loaded until the transition completes.

## Add interactions without fighting scroll

Scroll owns macro movement. Pointer, touch, and keyboard interactions own local response.

- Use raycasting against named proxy meshes, not every decorative triangle.
- Define `idle`, `hover`, `focused`, `active`, and `unavailable` states for each interactive object.
- Let hover warm light, shift material response, reveal a label, or trigger a short animation; do not move the scroll camera away from its path.
- Pause or soften pointer parallax while the user drags a control or activates a hotspot.
- Gate interactions by exact chapter visibility and depth; hidden objects must not capture events.
- Mirror every essential hotspot with a DOM button or link in document order. Give it a visible focus state and synchronize its state with the 3D object.
- On touch, use tap-to-focus then tap-to-activate when accidental activation would be costly. Keep hit targets at least 44 CSS px in the DOM proxy.
- Make decorative particle trails and cursor effects optional, camera-relative where appropriate, and disabled for coarse pointers or reduced motion.

Write the interaction matrix before implementation; use the pattern in [references/world-bible.md](references/world-bible.md).

## Keep the DOM story semantic

Keep headings, body copy, links, controls, and the footer in real HTML above or beside the canvas. The 3D world creates place; the DOM carries meaning and fallback order.

- Reveal display headings by word only when it supports the rhythm; preserve the complete accessible label.
- Reveal eyebrow, heading, body, media, proof, and CTA as independent beats.
- Keep the reading block stable while the camera makes its largest move.
- Use optional fixed alpha cut-outs as near-plane scenery, not as a requirement of every design. When used, keep them fully opaque while active and fade/blur them out after ownership changes.

## Load progressively

Make the first authored frame complete before loading the entire journey.

1. Inline or preload the critical shell, camera, first-scene geometry, smallest environment, and fallback poster.
2. Load the next chapter before it can enter; prefetch one or two chapters ahead.
3. Decode textures off the main interaction path and reveal a chapter only when its required assets are ready.
4. Keep a designed poster and semantic DOM visible if WebGL, a model, or a texture fails.
5. Report meaningful progress by required asset weight or completed groups, not an arbitrary timer.

Do not hide a 40 MB world behind a decorative percentage. Record the load plan in the asset ledger.

## Hold a measurable performance budget

Start with these budgets, then profile on the actual target device:

| budget | mobile target | desktop target |
| --- | ---: | ---: |
| DPR cap | 1.25–1.5 | 1.5–2 |
| visible triangles | 150k–300k | 500k–1.2m |
| draw calls | 50–90 | 90–160 |
| shadowed lights | 1–2 | 2–4 |
| simultaneously blended full-screen layers | 2 | 3 |
| critical initial transfer | 3–6 MB | 5–10 MB |
| steady frame time | ≤16.7 ms ideal, ≤25 ms fallback | ≤16.7 ms |

These are starting envelopes, not success claims. Measure CPU, GPU, texture memory, shader compilation, long tasks, and first-interactive frame.

- Cap `dt` near `1/30` second after stalls.
- Pause on `document.hidden` and when the experience is not visible.
- Use a quality governor that lowers DPR and optional effects before deleting authored landmarks.
- Render secondary cameras, reflections, cloth simulations, and expensive particles only while relevant.
- Dispose geometries, materials, textures, render targets, observers, events, animation mixers, and RAF during teardown.

## Respect motion, access, and failure

- Preserve native reversible scroll; do not trap the wheel or force a custom scrollbar.
- For reduced motion, snap camera/state to the nearest composed chapter, stop ambient loops and stagger/blur, and retain the complete ordered DOM story.
- Keep a real heading hierarchy, landmarks, links, form controls, visible focus, and reachable footer.
- Provide a composed poster or chapter stills when WebGL is unavailable.
- Maintain contrast when the world changes behind copy; use authored scrims or local contrast management, not an opaque blanket over the whole scene.

## Verify the whole journey

Follow [references/quality-and-qa.md](references/quality-and-qa.md). At minimum verify:

- every camera endpoint at 1440×900, 768×1024, and 390×844;
- slow, fast, reverse, scrollbar-drag, anchor navigation, reload-at-depth, and resize between chapters;
- material scale, UVs, texture color space, roughness response, contact grounding, shadow stability, fog depth, and post-processing;
- hover, focus, tap, activation, chapter gating, and interaction recovery after scrolling away and back;
- first-load poster, progressive chapter loading, failed asset, context loss, hidden-tab resume, and teardown;
- reduced motion, WebGL fallback, keyboard order, readable DOM, reachable footer, and a clean console;
- target-device frame time, draw calls, triangles, texture memory, transfer size, and shader compilation.

Use the Codex browser for visual and interaction verification. Build/DOM checks are not visual proof.

## Deliver

Return:

- the world bible and art-direction constants;
- chapter, camera, material/texture, interaction, asset, and performance ledgers;
- a layer and scene-graph map;
- the working experience and local runtime assets;
- desktop, tablet, and mobile evidence from representative chapters;
- measured performance and loading results;
- fallback/reduced-motion evidence;
- remaining visual, interaction, or device gaps stated plainly.

Keep the bundled Kage demo unchanged unless the user explicitly asks to revise the reference itself.
