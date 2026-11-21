# World bible and production ledgers

Use this reference before building a new scroll world. Keep the decisions in data or Markdown beside the project so geometry, surfaces, lighting, interactions, and responsive behavior stay coherent as chapters multiply.

## Contents

1. Intake
2. World sentence
3. Visual bible
4. Chapter ledger
5. Camera ledger
6. Material and texture ledger
7. Lighting and atmosphere ledger
8. Interaction matrix
9. Asset and loading ledger
10. Performance budget
11. Approval gates

## 1. Intake

Ask only for information that cannot be safely inferred from the supplied project or reference.

Capture:

- `PURPOSE`: portfolio, product story, exhibition, editorial, game teaser, data story, or another experience;
- `SUBJECT`: the place, system, process, object, or idea the visitor travels through;
- `AUDIENCE`: who must understand or act after the journey;
- `STORY_BEATS`: ordered moments with a distinct landmark or state change;
- `WORLD_TOPOLOGY`: continuous geography, connected sets, or layered reveal;
- `ART_DIRECTION`: visual era, realism/stylization, palette, material language, light, atmosphere, lens language;
- `INTERACTION_DEPTH`: scroll-only, ambient response, inspectable objects, or local tasks;
- `TARGETS`: minimum device class, browsers, orientations, accessibility needs;
- `ASSETS`: existing GLB/glTF, CAD, textures, photos, type, audio, copy, brand kit;
- `BUDGET`: first-load transfer, total transfer, frame-time target, production time.

Do not ask the user to choose implementation details that the reference or target device already decides. Explain any choice that changes cost, scope, or visual character before acting.

## 2. World sentence

Write one sentence that joins subject, spatial journey, and transformation:

> Travel from the abandoned observatory floor into its restored celestial archive while the same building wakes through light, machinery, and weather.

Reject a sentence that only describes a visual style. The world sentence must imply different spatial compositions and a reason to move between them.

Write a second sentence for the interaction contract:

> Scroll controls the camera and global time; pointer, touch, and keyboard reveal local evidence without breaking the route.

## 3. Visual bible

Record real constants.

### Scale and shape

| decision | value | reason |
| --- | --- | --- |
| world units | 1 unit = 1 meter | keeps camera, fog, and lights predictable |
| human reference | 1.7 units | validates architecture and prop scale |
| bevel language | 0.5–2% of object width | prevents razor edges without toy inflation |
| curve language | squared architecture, rounded equipment | creates a controlled contrast |
| detail hierarchy | silhouette / structure / accent | prevents noise-first modeling |

### Palette

| role | value | use |
| --- | --- | --- |
| world dark | `#071014` | sky, deep structure, negative space |
| structural mid | `#263237` | stone, metal, distant forms |
| readable light | `#DCE5DD` | DOM type and focal edges |
| warm practical | `#FF8C47` | lamps, machinery, local warmth |
| story accent | `#D9362A` | chapter focus and navigation state |

Use role names, not `color1`. Define how palette roles change between chapters. A color arc can move from cold/low saturation to warm/high saturation without changing the material identity of every object.

### Lens and composition

Record:

- FOV range and preferred focal character;
- horizon height;
- dominant axis or deliberate asymmetry;
- safe copy zones at desktop, tablet, and phone;
- allowable camera roll and pointer parallax;
- whether depth of field is physical, post-processed, or absent.

### Motion

Define separate amplitudes and frequencies:

| layer | range | frequency/timing |
| --- | ---: | ---: |
| camera damping | 4.5–7.0 | exponential damping constant |
| pointer parallax | 0.1–0.5° rotation, 0.02–0.12 world units | immediate target, damped render |
| suspended dust | 0.02–0.12 units/s | seeded, non-synchronized |
| foliage sway | 1–4° | 0.08–0.25 Hz with spatial phase |
| word reveal | 40–90 ms per word | one entrance per chapter |
| foreground retirement | 650–950 ms | opacity + restrained blur |

If the art direction needs faster or quieter motion, change the table and keep the relationships.

## 4. Chapter ledger

Use one row per authored state.

| field | requirement |
| --- | --- |
| `id` | stable slug for anchors, URLs, debugging, and analytics |
| `beat` | what the visitor understands here |
| `landmark` | the dominant spatial subject |
| `change` | how this frame differs from the previous one beyond copy |
| `scrollWeight` | relative dwell in viewport heights |
| `camera` | position, target, FOV, responsive override |
| `occlusion` | doorway, fog bank, foreground, darkness, or terrain used at the seam |
| `worldState` | light, fog, grade, particles, material/animation weights |
| `focus` | visible and interactable named objects |
| `copy` | eyebrow, heading, body, proof, action |
| `foreground` | optional fixed alpha or camera-relative near-plane elements |
| `assets` | required asset group and prefetch point |
| `fallback` | poster or meaningful still frame |

Example:

```js
{
  id: "reactor",
  beat: "The archive is powered by a physical memory core.",
  landmark: "reactor-vault",
  change: "The camera passes through the archive door and descends below grade.",
  scrollWeight: 1.6,
  camera: {
    p: [5.4, 2.2, -18],
    t: [0.8, 1.4, -28],
    fov: 42,
    mobile: { p: [6.2, 3.8, -14], t: [0, 2.0, -28], fov: 50 }
  },
  occlusion: "door-frame + steam-volume",
  worldState: { key: 0.55, core: 1.0, fog: 0.024, dust: 0.18 },
  focus: ["core", "coolant-gauge"],
  interactions: ["inspect-core", "open-gauge-note"],
  assets: ["reactor-shell", "machinery-atlas", "steam-sprites"]
}
```

Reject a chapter when its landmark, change, and camera composition cannot be named.

## 5. Camera ledger

Record endpoints before curves:

| chapter | position | target | FOV | roll | near/far | mobile override | failure risk |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| threshold | `[0,3.8,13.5]` | `[0,2.4,-8]` | 38 | 0° | `.1 / 180` | pull back 22% | roof crop |
| archive | `[-4,2.5,-2]` | `[1,3,-14]` | 44 | -0.4° | `.1 / 180` | target +1.2y | wall collision |

For every segment inspect:

- start and end composition;
- target interpolation and unintended roll;
- clearance from architecture and terrain;
- near-plane clipping on close foregrounds;
- velocity and acceleration near the seam;
- tall-screen crop and wide-screen empty space;
- whether DOM copy overlaps the landmark;
- whether scroll reversal remains readable.

Use a debug route that draws the path, target curve, frustums, chapter labels, and collision warnings.

## 6. Material and texture ledger

Give every material family a causal surface story.

| material | base/normal/rough/AO | scale | response | variation | budget |
| --- | --- | --- | --- | --- | --- |
| basalt | 1K atlas + normal + rough + AO | 1.5 m repeat | rough `.72–.9` | damp lower edge, chipped decals | shared 4 maps |
| painted steel | trim sheet + normal + rough | 0.5 m trim | metal `1`, rough `.28–.55` | exposed-edge wear only | shared 2K set |
| paper lantern | base + alpha + emissive | unique UV | rough `.65`, emissive `1.8` | warm hue ±4% | 512 atlas |
| foliage | base/alpha + normal | card atlas | alphaTest `.35–.55` | 3 hue clusters | 1K atlas |

### Color-space contract

- Base-color and emissive color maps: `SRGBColorSpace`.
- Normal, roughness, metalness, AO, height, masks, LUT data: `NoColorSpace`/linear.
- HDR environment maps: load as linear HDR and process with PMREM.
- Do not use the same image file as both color and data without explicitly setting the correct interpretation.

### Texture-resolution contract

Estimate screen coverage at the closest authored camera:

```text
required texture pixels ≈ projected CSS pixels × device pixel ratio × 1.0–1.5
```

Round to a practical compressed size. Do not give every prop a 4K map. A repeated hero floor may justify a 2K tile; a background crate usually does not.

### Surface QA

Check materials under:

- neutral white test light;
- the final chapter light;
- a glancing highlight that exposes normal and roughness scale;
- the closest authored camera;
- mobile DPR and compressed-texture output.

Look for swimming UVs, inconsistent texel density, inverted normals, black AO from missing `uv2`, over-strong normal maps, sRGB data textures, and metallic dielectrics.

## 7. Lighting and atmosphere ledger

| system | chapters | intensity/range | shadow | purpose | fallback |
| --- | --- | --- | --- | --- | --- |
| sun/key | all | `2.2 → 0.8` | one 2048 map desktop, 1024 mobile | readable form direction | baked directional gradient |
| environment | all | `0.35–0.55` | none | material reflections/fill | hemisphere light |
| reactor core | 3–4 | emissive `2.4`, point `22`, range `9` | no | focal warmth | emissive + glow sprite |
| fog | all | density `.012–.026` | n/a | depth separation and seam cover | background grade |

Rules:

- Stabilize shadow camera bounds; a huge shadow frustum causes crawling and softness.
- Bias only enough to remove acne; excess normal bias detaches objects from the ground.
- Match practical geometry, emissive output, light falloff, and bloom.
- Keep transparent fog cards from intersecting the camera near plane.
- Seed particles so reloads remain visually stable when reproducibility matters.

## 8. Interaction matrix

| id | object | available chapters | hover/focus | activate | keyboard/DOM proxy | exit/recovery |
| --- | --- | --- | --- | --- | --- | --- |
| inspect-core | core | 2.65–3.55 | rim +12%, label in | mixer clip + detail panel | `button[aria-controls=core-panel]` | close panel, restore orbit weight |
| lantern-note | lantern-left | 0.2–1.2 | warm light `.4→.7` | reveal note | real button after chapter heading | fades when chapter leaves |

Define for every interactive:

- raycast proxy and priority;
- hover/focus/active visuals;
- pointer, touch, and keyboard behavior;
- interaction availability range based on exact scroll progress;
- camera/parallax behavior while active;
- accessible name, role, state, and DOM control;
- cleanup when the user scrolls away mid-interaction;
- failure/fallback when the object or animation is unavailable.

Avoid interaction without feedback. A cursor change alone is not enough in a dark 3D scene.

## 9. Asset and loading ledger

| group | files | compressed size | memory estimate | required by | prefetch at | fallback |
| --- | --- | ---: | ---: | --- | --- | --- |
| critical-shell | sky, terrain, first landmark, 1K atlas | 4.2 MB | 48 MB | chapter 0 | page load | hero poster |
| archive | archive GLB, trim sheet, decals | 6.8 MB | 82 MB | chapter 1 | progress 0.35 | chapter still |
| reactor | reactor GLB, emissive atlas, steam | 8.1 MB | 96 MB | chapter 3 | progress 1.7 | chapter still |

Account for decoded texture memory, not only compressed transfer:

```text
RGBA texture memory ≈ width × height × 4 bytes × mip factor 1.33
```

A compressed 4K JPEG can still occupy roughly 85 MB decoded with mipmaps. KTX2 GPU compression changes this materially; measure the actual renderer info and browser memory behavior.

## 10. Performance budget

Write the budget before optimization:

```yaml
minimum_device: iPhone 12 class / integrated laptop GPU
target_fps: 60
fallback_fps: 40
critical_transfer_mobile_mb: 4.5
total_transfer_mobile_mb: 24
dpr_mobile: 1.35
dpr_desktop: 1.75
visible_triangles_mobile: 240000
visible_triangles_desktop: 850000
draw_calls_mobile: 75
draw_calls_desktop: 135
shadowed_lights_mobile: 1
shadowed_lights_desktop: 2
```

Name the first quality cuts in order:

1. lower DPR;
2. disable optional depth of field, reflections, and dense particles;
3. reduce shadow resolution or update frequency;
4. select lower LODs and texture variants;
5. simplify transparent layers;
6. reduce non-focal geometry.

Keep authored landmarks, camera endpoints, copy, and interaction meaning intact.

## 11. Approval gates

Stop for review at these points when the project is substantial:

1. world sentence, topology, and story order;
2. graybox silhouettes and every camera endpoint;
3. one finished material/lighting slice that proves the art direction;
4. first-to-second chapter transition with reverse scroll;
5. interaction prototype with DOM proxy;
6. mobile composition and performance tier;
7. complete journey before final texture/particle polish.

Do not spend the full asset-production budget before a graybox proves the route.
