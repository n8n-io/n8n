---
name: react-3d-web
description: Add interactive 3D to a React website or web app - choose between React Three Fiber (three.js) and PlayCanvas React, load GLTF/GLB models, orbit controls, lights, loaders, mobile performance, and 3D portfolio or product-viewer sections. Use when the user wants a 3D hero, a 3D portfolio, a product viewer, a 3D globe or object on a site, or mentions three.js in React, React Three Fiber, R3F, drei, PlayCanvas. For pure three.js scenes, scroll worlds and materials, the threejs and build-threejs-scroll-worlds skills go deeper. Based on playcanvas/react (MIT) and the adrianhajdin 3D developer portfolio project (structure only).
---

# 3D in React

## Pick the library

| Need | Choice |
|---|---|
| 3D section inside a normal React site (hero, model, globe, particles), largest ecosystem | **React Three Fiber** (`@react-three/fiber` + `@react-three/drei`) on three.js |
| Interactive app with physics, input and asset management included, ECS model | **PlayCanvas React** (`@playcanvas/react` + `playcanvas`) |
| One decorative effect, no interaction | CSS / a video loop / Lottie: cheaper than any 3D engine |

Check current versions with `npm view <package> version` before installing: tutorials
online often pin old majors (for example R3F 8 with three 0.149).

## React Three Fiber pattern (model viewer)

```jsx
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Preload, useGLTF } from '@react-three/drei';

function Model({ isMobile }) {
  const { scene } = useGLTF('/models/product.glb');
  return (
    <>
      <hemisphereLight intensity={0.3} groundColor="black" />
      <spotLight position={[-20, 50, 10]} angle={0.12} penumbra={1} intensity={1} castShadow />
      <primitive object={scene} scale={isMobile ? 0.7 : 1} />
    </>
  );
}

export default function ModelCanvas({ isMobile }) {
  return (
    <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: [20, 3, 5], fov: 25 }}>
      <Suspense fallback={null /* or a <Html> progress loader from drei */}>
        <OrbitControls enableZoom={false} />
        <Model isMobile={isMobile} />
      </Suspense>
      <Preload all />
    </Canvas>
  );
}
```

Portfolio structure that works: page sections as normal components (Hero, About,
Experience, Works, Contact), and a separate `canvas/` folder for each 3D piece
(model, globe, stars, tech balls). Each canvas is lazy and independent.

## PlayCanvas React pattern

```jsx
import { Application, Entity } from '@playcanvas/react';
import { Camera, Render } from '@playcanvas/react/components';
import { OrbitControls } from '@playcanvas/react/scripts';

export function Viewer() {
  return (
    <Application>
      <Entity position={[0, 2, 0]}>
        <Camera />
        <OrbitControls />
      </Entity>
      <Render type="sphere" />
    </Application>
  );
}
```

Included: suspense asset loading, pointer events, physics, script components.

## Performance and mobile (most 3D sites fail here)

- `frameloop="demand"` when nothing animates: no rendering when idle, saves battery.
- Cap pixel ratio (`dpr={[1, 2]}`); lower scale and effects under ~500 px width; consider
  a static image instead of the canvas on low-end phones.
- Compress models: GLB with Draco or Meshopt, textures in KTX2/WebP, target a few MB.
- Disable zoom on a hero model so page scroll is not captured by the canvas.
- Respect `prefers-reduced-motion`; give the canvas an accessible text alternative.
- Lazy-load the canvas below the fold; keep the hero's text readable before 3D loads.

## Gotchas

- `useGLTF` paths are relative to `public/`; a wrong path suspends forever with no error
  shown in the page.
- Model licences: free models (Sketchfab etc.) often require attribution or forbid
  commercial use; record the licence of each asset.
- `preserveDrawingBuffer: true` costs performance; enable it only for screenshots.
