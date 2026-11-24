# Kage scroll-world anatomy

Use this reference when extracting the Kage architecture or diagnosing a multi-scene Three.js scroll page. The bundled demo is the literal approved Kage page and remains the source of truth when this explanation and the runtime ever differ.

## Acceptance frame

Kage is a dark Japanese editorial world, not a generic Three.js showcase.

| Layer | Kage treatment |
| --- | --- |
| World | Kyoto mountain sanctuary at night, centered temple, approach stairs, torii, lanterns, fog, water, red moon |
| Type | Muted sage-white sans, uppercase wide tracking, oversized KAGE word, large vertical Japanese characters |
| Accent | Vermilion red, dim amber lanterns, restrained gold hardware |
| Foreground | Grass, maple/sakura branches, pine, stones, walls, ruins and hills anchored to viewport edges |
| Surface | Heavy film grain, dark blue-black haze, slow bloom, no glossy glass dashboard |
| Motion | Damped camera travel, subtle ambient drift, word-level headings, foreground rise/fade/blur |

## Detail and surface implementation

Kage reaches depth through several coordinated systems rather than a single texture overlay:

| system | reference treatment | transferable lesson |
| --- | --- | --- |
| Sky and ridge | Procedural `CanvasTexture` plates, dark silhouette layers, and exponential fog | Separate distant planes and control whether each participates in fog; a black ridge with the wrong fog flag becomes a pale band |
| Temple | Standard materials for timber, tile, gold hardware, and ground; emissive/basic paper and shoji layers | Use PBR where light response carries form, and unlit/emissive layers where a practical must stay luminous |
| Moon and lantern glow | Textured discs/sprites plus restrained additive glow | Coordinate visible emitter, glow, and nearby light instead of asking bloom to create the lamp |
| Trees and leaves | Instanced foliage with seeded placement and restrained material variation | Spend geometry on silhouette clusters while keeping draw calls bounded |
| Grounding | Rough dark platforms, rocks, stairs, grass, fog, and contact shadows | Layer medium-scale contact details before adding tiny particles |
| Foreground | Alpha WebP cut-outs parked in sections and moved into a fixed viewport host | Treat cut-outs as near-plane scenery, not rectangular content cards |
| Finish | ACES-style exposure, restrained bloom/post, film grain, haze, and cold/warm contrast | Compose the unprocessed frame first; use finish effects to unify depth and material response |

The procedural texture functions and material constants in the bundled demo are part of the approved reference. Reuse them when reproducing Kage; use the general material and texture ledger for unrelated worlds.

## Interaction hierarchy

Kage keeps scroll in charge of macro travel and reserves pointer response for local presence:

- camera-space wisps trail the pointer without changing chapter ownership;
- card cloth simulations wake only while relevant and stop when hidden;
- fine-pointer cursor response is omitted for coarse pointers;
- navigation and chapter rail controls move to measured anchors;
- pointer effects can warm or disturb a local layer but cannot redirect the camera path.

This is the default interaction hierarchy for scroll worlds: scroll controls the route, while pointer, touch, and keyboard control nearby detail.

## Chapter topology

The reference uses six `[data-cam]` anchors:

1. Hero / Hidden Gate
2. Sanmon approach
3. Still Gardens
4. Sacred Craft
5. Afterlight
6. Colophon

The DOM is ordinary document flow. A fixed canvas stays behind every section. Fixed navigation, a right-side chapter rail, and a foreground host stay above it.

## Camera table

These are the reference Kage waypoints. Adapt only after preserving the same composition at the target aspect ratios.

```js
const CAM = [
  { p: [ 0.0,  4.05,  13.6], t: [ 0.0,  6.60, -18.0], fov: 36 },
  { p: [-5.6,  2.35,  11.6], t: [ 1.2,  5.60, -14.0], fov: 48 },
  { p: [ 1.2,  3.60,   2.2], t: [-0.6,  7.50, -22.0], fov: 40 },
  { p: [ 5.2,  2.10,  -3.4], t: [-2.6,  7.00, -20.0], fov: 46 },
  { p: [ 0.0,  7.60, -16.0], t: [ 0.0, 13.00, -40.0], fov: 42 },
  { p: [ 0.0, 10.50, -20.0], t: [ 0.0,  3.00, -34.0], fov: 46 }
];
```

Create two Catmull–Rom curves: one through positions and one through targets. Interpolate FOV per segment. On a tall viewport, step backward along the view direction and open FOV slightly; do not simply crop the wide composition.

## Scroll conductor

Measure section centers into `anchors[]`. Convert `scrollY` into a fractional chapter value such as `2.35`, where `2` is the current camera frame and `.35` is progress to the next.

Keep:

- `rig.target`: exact chapter progress from the document;
- `rig.smooth`: damped render progress;
- `activeChapter`: `Math.round(rig.target)` for interface and foreground ownership.

This separation is why the camera can feel heavy while navigation remains correct.

## Foreground ownership

Each section owns a decorative foreground stage while parked. When its chapter wins the viewport, re-parent that stage to a single fixed `#foreground-sky` host outside the page stacking context.

- Incoming pieces begin off their anchored edge.
- Active pieces are fully opaque and settle at their designed bottom/side positions.
- The prior stage receives a retiring class for roughly 820 ms.
- Retiring pieces fade and blur out before returning to their source section.

Key placement rules by a stable `data-foreground` value, not by ancestry, because the active stage no longer lives inside its source section.

## Text and interface state

Split only display headings. Preserve the complete phrase in `aria-label`; mark visual word wrappers presentational. Use about 72 ms between words. Eyebrow, body, media, and CTA remain independent reveal items.

The right chapter rail, nav highlight, and section ownership read `activeChapter`. Pointer focus can warm lanterns or moon glow, but cannot change the current chapter.

## World-state rules

- Keep the temple, gate, ground, sky, moon, and weather in one scene.
- Let camera depth and occlusion reveal the next place.
- Anchor ambient leaf/weather respawn ahead of the camera so density stays stable along the route.
- Keep camera-attached pointer effects in camera space so rig movement does not detach them from the hand.
- Render secondary card cameras only while their section is relevant.

## Failure signatures

| Symptom | Likely cause |
| --- | --- |
| Chapter label changes late | UI is reading damped camera progress |
| Reverse scroll lands differently | wheel delta or one-way triggers are the source of truth |
| Flash at section boundary | renderer, scene, or poster is being swapped |
| Foreground looks like a card | cut-out is section-relative instead of fixed near-plane scenery |
| Tall mobile loses the gate | wide camera values are reused without aspect pullback |
| Camera feels floaty | endpoints were not composed before smoothing was added |
| World pauses between sections | scroll timeline is section-local instead of global |
| Page becomes inaccessible | canvas text replaced semantic DOM or scroll was hijacked |

## Verification sequence

1. Load at the top and compare the first live frame with the approved Kage reference.
2. Scroll slowly through every anchor; record camera, heading, rail, and foreground ownership.
3. Reverse through every boundary.
4. Flick from first to last, drag the scrollbar, and load an anchor URL at depth.
5. Resize while between chapters at 1440×900, 768×1024, and 390×844.
6. Enable reduced motion and force the WebGL fallback.
7. Inspect failed requests, console errors, DPR, hidden-tab pause, and teardown.
