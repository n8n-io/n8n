# Lessons from a large procedural three.js world (WebGPU)

Source studied 2026-11-16: `Braffolk/fable5-world-demo` ("LAAS", MIT licence, three.js
0.184, `WebGPURenderer` + TSL). It is a 4 x 4 km forest and mountain world built at boot
from code only (no image or model files), about 21,000 lines of TypeScript. The notes
below are our summary in our own words. Read the original repository for code.

Most of our 3D work is a hero object or a scroll scene, not an open world. Take the
methods (sections 1, 2 and 6) everywhere; take the rendering recipes (3 to 5) when a
scene has terrain, vegetation, water or a sky.

## 1. How the project was run (copy this for any ambitious 3D page)

- **A written brief with a visual bar.** Reference images in a folder, a list of hard
  floors (triangle counts, systems that must exist) and a list of banned outcomes
  ("black shadows", "cloned trees", "fog to hide the horizon"). The brief says WHAT,
  never HOW.
- **A reference-delta loop for each phase.** Render the shot closest to a reference,
  put both side by side, write the 10 biggest visual differences ranked by impact, fix
  the top 3, render again. The phase closes only then.
- **A status file as memory.** Mission, verified environment facts, phase checklist,
  decisions log, and an append-only list of gotchas. Same idea as our DECISIONS.md.
- **Pin the library version and read its source.** three.js and TSL change between
  releases. Check an API in `node_modules/three` before using it; keep a notes file of
  what was verified.
- **Seeded randomness, one stream per system** (`rng('trees')`, `rng('rocks')`): adding
  random draws to one system must never change the layout of another. The whole world
  comes back from `?seed=N`.

## 2. Verification without a human (Playwright)

- WebGPU in headless Chromium: `chromium.launch({ headless: true, channel: 'chromium' })`.
  The default headless shell has no GPU. Load the page from `http://localhost`, never
  `about:blank`: WebGPU needs a secure context.
- A screenshot tool with named camera poses (`--scene`, `--cam`), plus a compare tool
  that puts the render next to the reference.
- **Pixel tests for art rules.** Example: sample pixels in shadowed vegetation; if they
  are grey and desaturated, the "no black shadows" rule fails.
- **Ablation flags** (`?ablate=gtao,bloom`) to measure what each pass costs and adds.
  Headless fps is not GPU time: use GPU timestamps, median over many frames.
- **Debug views per system** (`?clsdbg=1` colours each vegetation class, `?facedbg=1`
  shows front faces green and back faces red). A flat-colour view finds in minutes what
  hours of guessing do not.
- If a change "has no effect", first check that the browser received the new code
  (fetch the served module), then question the state you assumed.
- Auto-exposure hides lighting changes: judge them by A/B difference images, not by
  how bright the frame looks.
- Headless still shots do not show motion bugs, pointer lock or window resizing. Check
  those in a headed browser before calling them fixed.

## 3. Lighting rules that make a scene look expensive

- **No black shadows.** Shadowed foliage keeps a green bounce; shadowed rock and snow
  turn blue from the sky. Cheap way: an ambient term from a few irradiance probes or a
  hemisphere light tinted sky-blue above, ground-green below.
- **Leaves let light through** (translucency term on foliage) and foliage cards must be
  almost fully diffuse (roughness about 0.9). A shiny card shows one flat silver sheen.
- **Cascaded shadows (CSMShadowNode, three 0.184):** set `sun.shadow.camera.near/far`
  yourself (the defaults leave the maps empty, with no error) and call
  `updateFrustums()` after the camera changes.
- **Custom materials and shadows:** an alpha-tested material needs a `vec4` colour node
  and a `maskShadowNode`; instanced geometry moved by a `positionNode` also needs
  `castShadowPositionNode`, or it casts nothing.
- **`cameraPosition` in a shader means the camera of the current pass.** In the shadow
  pass it is the shadow camera. Any fade or cull by camera distance must read an explicit
  "main camera" uniform, or the objects vanish from the shadow maps only.
- Never dither shadow casters with a screen-space pattern (it swims and flickers); anchor
  the dither in world space. Fade far casters out; a hard cut-off draws a visible circle
  on the ground.
- AO (GTAONode): 8 samples at full resolution was the stable setting; half resolution made
  streaks; 16 samples cost about 50 ms on wide views.

## 4. Vegetation and detail

- **Geometry, not flat textures, near the camera.** Within about 10 m the ground should
  be covered by grass blades, litter and stones, not by a texture.
- **No two trees alike:** a few structural variants per species, plus per-instance changes
  on the GPU (lean, droop, crown shape, hue).
- **Lushness comes from big cluster cards** (one card = a whole painted spray of leaves),
  captured from real generated leaf geometry. Real needle geometry only for the nearest
  trees; at distance it is smaller than a pixel and vanishes under TAA.
- Foliage sits on fine twigs, never directly on big branches.
- Far trees become octahedral impostors (pre-rendered views on a sphere of directions).
- Capture scenes for atlases need `DoubleSide` materials, or cards that face away come out
  empty. Store dark colours with a square-root encoding in 8-bit textures to avoid bands.
- Hundreds of thousands of instances: GPU scatter (Poisson-like) plus per-frame culling
  into an indirect draw (`Mesh` + `geometry.setIndirect(...)`, `frustumCulled = false`).

## 5. Terrain, water and sky

- Terrain: noise heightfield, then hydraulic and thermal erosion, then rivers from flow
  accumulation. `mx_noise` outputs are signed: remap them, or low land sinks under water.
- A lake needs an outlet, or it floods the valley up to the lowest pass.
- Water surface = the fill level of each pond (flat), not bed plus blurred depth.
- Water fresnel must use a flattened normal; per-pixel ripple normals make every stream a
  white sky mirror. Ripples decide WHAT reflects, the mean surface decides HOW MUCH.
- Reflections in a gorge must not fall back to open sky; fall back to the local ambient.
- Sky: a physically based atmosphere (Hillaire look-up tables) drives sky colour, haze and
  sun colour from one model; volumetric clouds cast shadows on the ground.
- Animated values that must stay identical between two screenshots run on a world clock
  you control, not on TSL `time`.

## 6. Frame-update order (a bug class that costs days)

Update callbacks run in registration order. Whatever MOVES the camera must run before
whatever COPIES camera state, and the mover must call `camera.updateMatrixWorld()`.
Screen-space consumers should read the camera at render time, not in an update callback.
Symptom when wrong: clouds, water or culling lag one frame behind the camera.
