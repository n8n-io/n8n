# Real-time Three.js scroll-world architecture

Use this reference when implementing the persistent renderer, scene graph, scroll conductor, camera path, world-state interpolation, asset streaming, interactions, quality profiles, and teardown.

## Contents

1. Runtime contract
2. Scene graph
3. Renderer and color pipeline
4. Asset pipeline
5. Scroll conductor
6. Camera rig
7. World-state interpolation
8. Chapter streaming and culling
9. Interaction system
10. DOM synchronization
11. Responsive composition
12. Quality governor
13. Lifecycle and failure
14. Debug surfaces

## 1. Runtime contract

Keep one authoritative configuration:

```js
const worldSpec = {
  units: "meters",
  initialChapter: "threshold",
  quality: {
    mobile: { dpr: 1.35, shadows: 1024, particles: 0.45, post: "lite" },
    desktop: { dpr: 1.75, shadows: 2048, particles: 1, post: "full" }
  },
  chapters,
  groups: {
    critical: ["shell", "threshold"],
    approach: ["path", "garden"],
    deep: ["archive", "reactor"]
  }
};
```

Drive all subsystems from the same fractional progress object:

```js
{
  exact: 2.35,
  smooth: 2.28,
  index: 2,
  next: 3,
  localExact: 0.35,
  localSmooth: 0.28,
  direction: 1
}
```

Do not let the camera, DOM, foreground host, navigation, particles, and interactions compute their own chapter rules independently.

## 2. Scene graph

Use named groups that match production responsibility:

```js
const worldRoot = new THREE.Group();
worldRoot.name = "world";

const environment = new THREE.Group();
environment.name = "environment";

const landmarks = new THREE.Group();
landmarks.name = "landmarks";

const chapterSets = new THREE.Group();
chapterSets.name = "chapter-sets";

const interactives = new THREE.Group();
interactives.name = "interactives";

const atmosphere = new THREE.Group();
atmosphere.name = "atmosphere";

worldRoot.add(environment, landmarks, chapterSets, interactives, atmosphere);
scene.add(worldRoot);
```

Inside each loaded model, normalize useful names once:

```js
gltf.scene.traverse((node) => {
  node.frustumCulled = true;
  if (node.isMesh) {
    node.castShadow = shouldCast(node.name);
    node.receiveShadow = shouldReceive(node.name);
    if (node.userData.interactive) registerInteractive(node);
  }
});
```

Avoid scene traversal in the render loop. Build registries for animated objects, lights, materials, mixers, particles, and interactive proxies during loading.

## 3. Renderer and color pipeline

Configure the renderer before validating materials:

```js
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: quality.antialias,
  alpha: false,
  powerPreference: "high-performance"
});

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setPixelRatio(Math.min(devicePixelRatio, quality.dpr));
renderer.shadowMap.enabled = quality.shadows > 0;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

Material QA is meaningless until output color space, tone mapping, exposure, environment intensity, and post-processing order are stable.

Use explicit texture roles:

```js
baseColor.colorSpace = THREE.SRGBColorSpace;
emissiveMap.colorSpace = THREE.SRGBColorSpace;

normalMap.colorSpace = THREE.NoColorSpace;
roughnessMap.colorSpace = THREE.NoColorSpace;
metalnessMap.colorSpace = THREE.NoColorSpace;
aoMap.colorSpace = THREE.NoColorSpace;
```

If the Three.js version predates `colorSpace`, use the equivalent `encoding` API and pin that version locally. Do not mix examples from different Three.js releases.

### PBR setup checks

- Duplicate the primary UV set into `uv2` when an AO map requires it and the asset lacks one.
- Process HDR environments through `PMREMGenerator` and dispose the source texture and generator after assignment.
- Keep `normalScale` conservative, often `.25–.8` depending on authoring strength.
- Use `alphaTest` for foliage and fences when soft transparency is unnecessary.
- Use `polygonOffset`, render order, or a decal library deliberately; random `z` offsets eventually flicker.
- Keep transmission/refraction surfaces rare and small. They may require the scene color and multiply full-frame cost.

## 4. Asset pipeline

Prefer glTF/GLB with Meshopt or Draco where it materially reduces transfer, and KTX2/Basis for GPU-ready textures.

```js
const ktx2 = new KTX2Loader()
  .setTranscoderPath("/basis/")
  .detectSupport(renderer);

const draco = new DRACOLoader().setDecoderPath("/draco/");

const loader = new GLTFLoader()
  .setKTX2Loader(ktx2)
  .setDRACOLoader(draco)
  .setMeshoptDecoder(MeshoptDecoder);
```

Pin loader versions to the Three.js runtime version. A mismatched loader and core build can fail only on compressed assets, making the problem look like corrupted media.

### Load by groups

```js
class AssetGroup {
  constructor(id, urls) {
    this.id = id;
    this.urls = urls;
    this.state = "idle";
    this.assets = new Map();
  }
}
```

Maintain `idle → queued → loading → ready | failed → retired`. Retire only disposable chapter-local assets; never retire a landmark still visible from later frames.

Decode and compile before reveal:

```js
await loadGroup(group);
scene.add(group.root);
await renderer.compileAsync(scene, camera);
group.state = "ready";
```

Where `compileAsync` is unavailable, render a hidden or occluded warm-up frame. Avoid first-use shader compilation during a visible scroll seam.

### Texture residency

- Keep one material/texture instance per shared asset.
- Release object URLs after loaders consume them.
- Dispose chapter-local render targets and textures when their group retires.
- Do not dispose shared resources from a single mesh destructor; reference-count them or dispose at world teardown.

## 5. Scroll conductor

Use native scroll position as the exact state. Copy [scroll-conductor.js](scroll-conductor.js) or implement the same contract.

Measure after layout stabilizes:

```js
await document.fonts?.ready;
await Promise.all(criticalImages.map(waitForImage));
conductor.measure();
```

Observe later layout changes with `ResizeObserver`. Re-measure after content insertion, font swap, orientation change, or a width-changing resize. Ignore touch-browser URL-bar height noise when width and orientation are unchanged.

Use exponential damping independent of frame rate:

```js
function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}
```

Clamp `dt` after a pause:

```js
dt = Math.min(clock.getDelta(), 1 / 30);
```

The exact state must update immediately on `scroll`, `pageshow`, `hashchange`, history restoration, and programmatic anchor navigation. The damped state may catch up visually.

## 6. Camera rig

Separate the authored camera from local input offsets:

```text
cameraRig
  pathRig          authored position and orientation
    inputRig       pointer/device micro-parallax
      camera       projection and post effects
```

Do not add pointer offsets directly to waypoint data.

### Position and target curves

```js
const positionCurve = new THREE.CatmullRomCurve3(
  chapters.map(c => new THREE.Vector3(...c.camera.position)),
  false,
  "centripetal",
  0.5
);

const targetCurve = new THREE.CatmullRomCurve3(
  chapters.map(c => new THREE.Vector3(...c.camera.target)),
  false,
  "centripetal",
  0.5
);
```

Map each segment deliberately. A single global `curve.getPoint(progress / lastIndex)` gives every chapter equal parametric space even when `scrollWeight` differs; that is fine when the conductor already expresses fractional chapter progress. Sample per segment if chapters need different curve types or easings.

Avoid interpolating Euler angles. Interpolate position and target, then call `lookAt`; or author quaternions and use `slerp` when roll is intentional.

### Responsive camera

Resolve a camera endpoint from the active breakpoint before curve construction. Do not linearly blend from a desktop curve to a mobile curve during a normal resize; rebuild the curve and preserve the exact chapter progress.

For an emergency tall-screen correction:

```js
const tall = Math.max(0, innerHeight / innerWidth - 1.15);
resolvedPosition.addScaledVector(viewDirection, -tall * pullback);
resolvedFov += tall * fovOpen;
```

Author explicit overrides for hero and close-interior frames. Formula-only corrections cannot know where the copy or landmark sits.

### Collision guard

Sample each camera segment offline or in debug mode. Cast a sphere or several rays from the previous sample to the next against coarse environment proxies. Flag points whose clearance falls below the camera near-plane plus a design margin.

Do not run dense world collision every frame for a fixed authored route.

## 7. World-state interpolation

Use named state channels:

```js
const channels = {
  key: value => { key.intensity = value; },
  fog: value => { scene.fog.density = value; },
  core: value => {
    coreMaterial.emissiveIntensity = value;
    coreGlow.material.opacity = smoothstep(0.2, 1, value);
  },
  foliage: value => { foliageWindTarget = value; }
};
```

Resolve adjacent chapter values and interpolate once. Do not let every object compare raw progress to arbitrary thresholds.

Use the correct interpolation type:

- scalar/vector: linear or smoothstep;
- color: interpolate in the intended working space, checking luminance through the grade;
- quaternion: spherical interpolation;
- visibility: opacity or an occluded swap window;
- animation: mixer weight crossfade;
- discrete interaction availability: exact progress range, no damping.

Keep update order stable:

1. read exact scroll and input targets;
2. update damped progress and local input rigs;
3. resolve camera and world state;
4. update animation mixers, simulations, and particles;
5. update interaction proxies and DOM state;
6. render post-processing passes;
7. sample performance.

## 8. Chapter streaming and culling

Use a prefetch window based on exact progress and scroll direction:

```js
const near = Math.round(state.exact);
ensureLoaded(near);
ensureLoaded(near + state.direction);
ensureLoaded(near + state.direction * 2);
```

Keep the previous chapter resident until the transition is complete and reverse scroll is safe. Do not unload the only asset needed to reproduce the state just above the current seam.

Use multiple strategies:

- frustum culling for ordinary meshes;
- chapter-group visibility for distant or impossible sets;
- LODs for persistent landmarks;
- instancing for repeated props;
- animation and particle suspension outside the relevance window;
- reduced shadow casting outside the focal chapter.

Turning a group invisible does not free its GPU memory. Use that distinction deliberately.

## 9. Interaction system

Raycast against proxy layers:

```js
raycaster.layers.set(INTERACTIVE_LAYER);
camera.layers.enable(INTERACTIVE_LAYER);

const hits = raycaster.intersectObjects(activeProxies, false);
const hit = hits.find(h => interactionAvailable(h.object.userData.id, exactProgress));
```

Build a finite state machine per interaction:

```text
unavailable → idle ↔ hover/focus → active → idle
                         ↘ chapter-exit → unavailable
```

Synchronize pointer and DOM focus through the same state setter. Do not create separate hover and keyboard visual code paths.

```js
function setInteractionState(id, next, source) {
  const item = registry.get(id);
  item.state = next;
  item.apply3D(next);
  item.dom?.toggleAttribute("data-active", next === "active");
  item.dom?.setAttribute("aria-expanded", String(next === "active"));
}
```

Throttle pointer raycasts to one per animation frame and skip them when the pointer is unchanged, the tab is hidden, reduced motion disables the effect, or no interactions are available.

When an active detail panel should stop macro motion, do not block scrolling. Close or gracefully retire the panel when exact progress leaves its range.

## 10. DOM synchronization

Keep DOM updates event-based. On chapter or interaction change, toggle stable classes/attributes rather than writing every style on every frame.

Use exact state for:

- active navigation and `aria-current`;
- chapter URL/hash;
- DOM reading ownership;
- interactive button availability;
- foreground stage ownership;
- analytics milestones.

Use smooth state for:

- visual word/element entrances;
- local opacity and translate interpolation;
- camera-matched scrim intensity.

Preserve complete accessible text when visually splitting headings:

```html
<h2 aria-label="The archive wakes beneath us">
  <span aria-hidden="true"><span>The</span> <span>archive</span> …</span>
</h2>
```

## 11. Responsive composition

Treat mobile as a second composition of the same world, not a cropped desktop render.

- Resolve mobile camera endpoints and safe copy zones.
- Reduce foreground density, not landmark identity.
- Prefer a simpler post stack and lower DPR before removing the world.
- Keep small interactive objects reachable through DOM controls even if their 3D proxy is too small.
- Use `100dvh` where supported for fixed DOM, while keeping scroll-anchor math based on measured elements.
- Ignore height-only touch-browser resizes; rebuild on width/orientation change.

## 12. Quality governor

Choose a tier from hardware and measured frame time, then allow conservative runtime downgrades.

```js
const tiers = {
  high:   { dpr: 1.75, shadows: 2048, particles: 1.0, reflections: true, post: "full" },
  medium: { dpr: 1.35, shadows: 1024, particles: 0.55, reflections: false, post: "lite" },
  low:    { dpr: 1.0,  shadows: 0,    particles: 0.2, reflections: false, post: "grade" }
};
```

Sample a rolling frame-time window after shader warm-up. Downgrade only after sustained misses, for example 120 frames above 22 ms. Do not oscillate tiers; require a reload or a long stable interval before upgrading.

Use the cheapest high-impact lever first: DPR, full-resolution post passes, reflections, shadow update frequency, transparent particles, then geometry LOD.

## 13. Lifecycle and failure

Pause and resume cleanly:

```js
document.addEventListener("visibilitychange", () => {
  running = !document.hidden;
  if (running) lastTime = performance.now();
});
```

Handle WebGL context loss:

```js
canvas.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  running = false;
  showFallback("The 3D world paused. Restore or continue with the story below.");
});
```

If restoration is supported, rebuild GPU resources from retained asset sources and reapply exact scroll state. Do not reload the page without user intent.

Dispose once:

- cancel RAF and timers;
- disconnect `ResizeObserver`, `IntersectionObserver`, and media-query listeners;
- remove scroll, pointer, keyboard, history, and visibility listeners;
- stop audio and animation mixers;
- dispose geometries, unique materials, textures, skeleton helpers, render targets, PMREM targets, controls, and renderer;
- revoke object URLs;
- clear DOM classes and fixed foreground ownership.

Track ownership so shared resources are not disposed twice.

## 14. Debug surfaces

Ship a development-only overlay that can show:

- exact/smooth progress and direction;
- active and prefetched chapter groups;
- camera position, target, FOV, and waypoint labels;
- path and target curves;
- interaction proxy bounds and hit results;
- renderer triangles, calls, points, lines, textures, and programs;
- current quality tier and rolling frame time;
- asset group state and transfer size;
- toggles for fog, post, shadows, textures, wireframe, and fallback.

The debug overlay prevents subjective guessing. Remove or gate it in production, but keep the instrumentation callable.
