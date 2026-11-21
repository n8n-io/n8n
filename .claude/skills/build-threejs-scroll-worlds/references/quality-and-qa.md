# Visual, interaction, and runtime QA

Use this reference after the graybox route works and again before delivery. A build, lint pass, or DOM inspection does not prove a live Three.js journey.

## Contents

1. Evidence matrix
2. Endpoint composition
3. Transition paths
4. Geometry and scale
5. Materials and textures
6. Lighting and atmosphere
7. Interactions
8. DOM and accessibility
9. Loading and failure
10. Performance
11. Responsive behavior
12. Release evidence

## 1. Evidence matrix

Create one row per chapter and viewport:

| chapter | 1440×900 | 768×1024 | 390×844 | reverse seam | interaction | fallback | performance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| threshold | screenshot | screenshot | screenshot | pass/fail | pass/fail | pass/fail | ms/calls/triangles |

Capture representative evidence from the live renderer, not a design mockup. Mark untested devices or paths as unknown.

## 2. Endpoint composition

At every authored camera endpoint verify:

- the landmark is readable before the copy explains it;
- foreground, midground, and background form distinct depth planes;
- the eye has one dominant focus and one or two supporting details;
- the camera is not inside geometry and the near plane does not slice important forms;
- the horizon and verticals match the intended lens character;
- copy occupies a deliberate negative-space zone;
- navigation, rail, captions, and interactions avoid focal geometry;
- mobile shows the same story beat through an authored composition, not a random crop;
- the fallback poster matches the live frame closely enough to avoid a visual jump.

Toggle DOM copy off during review. If the 3D frame becomes meaningless, the world is not carrying its share of the story.

## 3. Transition paths

Exercise every segment:

1. slow forward scroll;
2. slow reverse scroll;
3. fast trackpad or touch flick across two or more chapters;
4. scrollbar drag to a non-adjacent chapter;
5. click each chapter anchor in both directions;
6. reload at the middle of a segment;
7. browser history restoration;
8. resize and rotate while between endpoints;
9. leave the tab hidden for at least ten seconds, then return;
10. scroll away while a local interaction is active, then return.

Look for:

- chapter labels lagging behind because they read damped progress;
- objects popping or unloading too early on reverse scroll;
- camera acceleration spikes at curve joins;
- target flips or unwanted roll;
- light, fog, material, and animation state landing on different endpoints by direction;
- foreground stages stranded in the fixed host;
- shader compilation or texture upload stalls at first reveal;
- interactions remaining active after their object becomes unavailable.

## 4. Geometry and scale

Review at silhouette, structural, and accent levels.

### Silhouette

- Compare each chapter as a thumbnail and in grayscale.
- Confirm adjacent landmarks have distinct outer contours and camera relationships.
- Remove small props temporarily; the chapter should remain identifiable.

### Structure

- Check roof, wall, floor, trim, rails, doors, and props for thickness and contact.
- Check repeated modules for visible seams, gaps, inconsistent scale, or floating origin points.
- Verify bevel width against object size and closest camera distance.
- Inspect normals, hard/soft edges, tangent artifacts, mirrored UV seams, and negative scales.

### World scale

- Place a human-scale debug mannequin at each chapter.
- Confirm camera height, door dimensions, stairs, furniture, vegetation, and atmospheric falloff belong to one unit system.
- Test the fog and light ranges after scale changes; both reveal inconsistent units quickly.

## 5. Materials and textures

Run a neutral material-debug pass before judging the final grade.

### Color space

- Base color and emissive color maps display in sRGB.
- Normal, roughness, AO, metalness, masks, and lookup data remain linear.
- Environment maps use the correct HDR workflow and PMREM.
- Tone mapping and exposure do not clip the practical lights or crush surface variation.

### UV and density

- Compare a checker texture across hero surfaces and nearby props.
- Check texture scale at the closest camera endpoint.
- Confirm AO maps have valid `uv2` data.
- Inspect atlas padding and mip bleed at oblique angles.
- Confirm anisotropy is used on floors, roads, or labels that need it rather than globally.

### Physical response

- Rotate or move a neutral test light to inspect roughness and normal response.
- Metals have metalness near `1`; stone, wood, cloth, paint, and skin remain dielectric near `0` unless the shader has a deliberate layered model.
- Roughness variation follows construction, wear, moisture, or touch—not uniform noise.
- Contact zones have enough AO or baked grounding without black outlines.
- Emissive materials look luminous before bloom and coordinate with actual light or baked spill.
- Glass and transparent surfaces maintain stable sorting and do not erase objects behind them.

### Compression

- Compare source and shipped compressed textures on the target device.
- Check normal-map block artifacts, alpha fringes, color banding, and roughness posterization.
- Record shipped and decoded texture cost.

## 6. Lighting and atmosphere

Toggle these systems one at a time:

- environment/fill;
- direct key;
- practical lights;
- shadow maps;
- fog/haze;
- bloom and post-processing;
- particles/weather;
- final color grade and grain.

Each must have a named job. Delete an effect that changes the frame but does not improve depth, focus, material readability, or story.

Check:

- shadow acne, peter-panning, crawling, clipped casters, and oversized frustums;
- practical lamps whose glow does not match the fixture or nearby surfaces;
- fog that turns distant dark objects into a pale wall because their material/fog relationship is wrong;
- particles that become a flat screen overlay with no depth scale or occlusion;
- bloom that raises the entire frame instead of isolating emissive highlights;
- grade or vignette that sacrifices readable detail for mood;
- temporal shimmer from post passes during scroll and resize.

## 7. Interactions

For every row in the interaction matrix verify:

- proxy bounds match the visible object at every relevant camera position;
- hover begins and ends predictably at edges;
- keyboard focus invokes the same 3D response as pointer hover;
- touch has an intentional focus/activation pattern;
- the cursor and object both provide feedback;
- the interaction is disabled outside its exact chapter range;
- a hidden or occluded proxy cannot steal a hit;
- opening a detail does not hijack scroll or strand the camera;
- scrolling away closes, retires, or preserves the state according to the ledger;
- returning restores a valid idle or saved state;
- reduced motion removes unnecessary movement but preserves meaning and activation;
- coarse-pointer layouts expose the DOM proxy at a reachable size.

Test pointer raycasting while the camera is still damping after a fast scroll. The hit proxy must use the camera's rendered pose, while availability uses exact chapter state.

## 8. DOM and accessibility

- Keep one logical heading hierarchy in document order.
- Ensure every chapter remains understandable when the canvas is hidden.
- Preserve full accessible headings when visual words are split.
- Mark decorative canvas and alpha foregrounds appropriately; provide text equivalents for meaningful 3D content.
- Make chapter navigation and interactions real links/buttons with visible focus.
- Use `aria-current` for the active chapter and accurate expanded/pressed states for controls.
- Keep the footer reachable without scroll trapping.
- Verify contrast at every chapter, not only the hero.
- Verify zoom at 200% and text reflow where applicable.
- Under reduced motion, snap to designed chapter frames, stop ambient loops, remove blur/stagger, and keep controls functional.

## 9. Loading and failure

Test under a cold cache and throttled network:

- critical first frame appears within the stated budget;
- semantic content and poster appear before optional 3D;
- progress represents real required groups;
- next-chapter prefetch completes before entry at ordinary scroll speed;
- fast-skip to an unloaded chapter shows a composed fallback and resolves without a blank flash;
- a 404 model or texture produces a recoverable chapter, not an endless loader;
- shader compilation is warmed before visible reveal;
- WebGL creation failure keeps the entire story usable;
- context loss pauses cleanly and offers a fallback/restoration path;
- history reload at depth restores exact chapter state after assets settle;
- failed optional effects do not block the world.

Use a loopback HTTP server for local testing; do not rely on `file://` behavior.

## 10. Performance

Measure after the initial shader warm-up and during the heaviest chapter transition.

Record:

- median and 95th-percentile frame time;
- CPU scripting vs GPU/render cost where the profiler exposes it;
- renderer draw calls, triangles, lines, points, textures, and programs;
- JS heap trend across a full forward/reverse journey;
- GPU texture/render-target estimate;
- critical and total transfer;
- long tasks during load and chapter entry;
- shader compile and texture upload stalls;
- battery/thermal behavior on a real mobile device when possible.

Profile toggles in this order to identify the real bottleneck:

1. lower DPR;
2. disable post-processing;
3. disable shadows or freeze their updates;
4. disable transparent atmosphere and particles;
5. hide chapter-local groups;
6. swap LODs;
7. replace complex materials with neutral basic materials.

Interpretation:

- DPR win means fill-rate/post/shadow cost dominates.
- Basic-material win means shader/material cost dominates.
- Group visibility win means geometry/draw-call cost dominates.
- Particle/transparent win means overdraw dominates.
- No GPU toggle win with high scripting time means update, layout, raycast, or DOM work dominates.

Do not claim optimization from file size alone.

## 11. Responsive behavior

Test at least:

- 1440×900 desktop;
- 768×1024 portrait tablet;
- 390×844 phone;
- one very wide desktop and one short landscape phone when the audience makes them relevant.

Verify:

- camera endpoints use responsive authored overrides;
- the focal landmark remains visible beside/behind copy;
- UI and 3D interaction targets do not collide;
- mobile serves its intended quality tier and textures;
- orientation changes preserve exact progress and rebuild curves once;
- URL-bar height changes do not remeasure the story and jump scroll;
- DPR changes between displays resize renderer and post targets safely;
- foreground density and particle count reduce without erasing identity;
- the page does not create horizontal overflow unless the composition explicitly owns it.

## 12. Release evidence

Deliver:

- one screenshot per representative chapter and viewport;
- a short forward/reverse screen recording when transitions are central;
- console and failed-request status;
- the exact checked commit/runtime version;
- performance table and target hardware/browser;
- asset/texture transfer and memory estimates;
- reduced-motion and WebGL-fallback captures;
- a list of unverified devices or remaining visual gaps.

Do not convert missing evidence into a pass.
