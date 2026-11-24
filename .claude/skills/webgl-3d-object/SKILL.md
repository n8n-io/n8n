---
name: webgl-3d-object
description: Create a real 3D WebGL object with geometric mesh depth, physically based material, directional and ambient lighting, perspective camera, subtle rotation, and floating motion. Use when a page needs a faceted 3D hero object or product-like visual with real lighting instead of CSS transform tricks.
---

# WebGL 3D Object

## Use When
- A hero, feature block, or product moment needs one strong 3D object.
- The visual should show real geometry, lighting, highlights, and edges.
- A faceted mesh should float or rotate subtly inside a web layout.
- CSS transforms, SVG illusions, or flat gradients are not enough.

## Rules
1. Use real 3D geometry: `IcosahedronGeometry`, `DodecahedronGeometry`, `BoxGeometry`, custom `BufferGeometry`, or a glTF mesh.
2. Use a perspective camera so the object has depth and scale.
3. Use PBR material: `MeshStandardMaterial` or `MeshPhysicalMaterial`.
4. Tune `metalness`, `roughness`, and `emissive` to match the brand mood.
5. Light the object with at least one directional light plus ambient or hemisphere fill.
6. Animate transforms only: subtle rotation, bobbing, or parallax.
7. Handle resize and dispose geometry/material/renderer on teardown.

## HTML And CSS

```html
<div class="webgl-object-shell">
  <canvas class="webgl-object-canvas" data-webgl-3d-object></canvas>
</div>
```

```css
.webgl-object-shell {
  position: relative;
  width: min(100%, 720px);
  aspect-ratio: 1 / 1;
}

.webgl-object-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
```

## Three.js Object Recipe

```js
import * as THREE from "three";

function initWebGL3DObject(canvas, options = {}) {
  if (!canvas) return () => {};

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.maxDpr || 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = options.exposure || 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.15, 5.2);

  const geometry = new THREE.IcosahedronGeometry(options.radius || 1.35, options.detail || 1);
  const material = new THREE.MeshStandardMaterial({
    color: options.color || 0x8aa4ff,
    metalness: options.metalness ?? 0.48,
    roughness: options.roughness ?? 0.34,
    emissive: options.emissive || 0x101833,
    emissiveIntensity: options.emissiveIntensity ?? 0.22,
    flatShading: true,
  });

  const object = new THREE.Mesh(geometry, material);
  object.castShadow = true;
  object.receiveShadow = true;
  scene.add(object);

  const ambient = new THREE.AmbientLight(0xffffff, 0.38);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 2.15);
  key.position.set(3.4, 4.2, 4.8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const rim = new THREE.DirectionalLight(options.rimColor || 0x7dd3fc, 0.82);
  rim.position.set(-4.2, 1.2, -2.8);
  scene.add(rim);

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 5.2),
    new THREE.ShadowMaterial({ opacity: 0.18 })
  );
  shadowPlane.position.set(0, -1.65, 0);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let rafId = 0;

  function resize() {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.maxDpr || 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function render(time = 0) {
    const t = time * 0.001;
    object.rotation.x = -0.16 + Math.sin(t * 0.45) * 0.06;
    object.rotation.y = t * 0.28;
    object.rotation.z = Math.sin(t * 0.32) * 0.08;
    object.position.y = reduceMotion ? 0 : Math.sin(t * 0.8) * 0.08;

    renderer.render(scene, camera);
    if (!reduceMotion) rafId = requestAnimationFrame(render);
  }

  function handleResize() {
    cancelAnimationFrame(rafId);
    resize();
    render();
  }

  resize();
  render();
  window.addEventListener("resize", handleResize);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", handleResize);
    geometry.dispose();
    material.dispose();
    shadowPlane.geometry.dispose();
    shadowPlane.material.dispose();
    renderer.dispose();
  };
}

const cleanupObject = initWebGL3DObject(
  document.querySelector("[data-webgl-3d-object]"),
  {
    color: 0x8aa4ff,
    rimColor: 0x7dd3fc,
    metalness: 0.48,
    roughness: 0.34,
    emissive: 0x101833,
  }
);
```

## Material Defaults
- Premium metal: `metalness: 0.45-0.7`, `roughness: 0.25-0.45`.
- Soft ceramic: `metalness: 0.0-0.15`, `roughness: 0.38-0.62`.
- Glow-tinted tech object: low `emissive` with `emissiveIntensity: 0.12-0.35`.
- Faceted object: set `flatShading: true`; smooth product object: set it to `false`.

## Lighting Defaults
- Key light: directional, high front-side angle, strongest source.
- Ambient fill: low intensity so shadows stay visible.
- Rim light: brand-tinted or cool light from behind to reveal edges.
- Shadows: enable only when the object needs grounded depth; keep map size moderate.

## Motion Defaults
- Rotation: slow, continuous, and secondary to the page content.
- Floating: `0.04` to `0.12` units on Y.
- Reduced motion: render a still frame or only allow direct interaction.
- Avoid camera movement unless the object is the main interaction.

## Avoid
- CSS 3D transforms pretending to be WebGL.
- Unlit materials when the ask is real lighting and depth.
- Flat planes with gradients instead of actual geometry.
- Strong bloom or particles that hide the form.
- High DPR, huge shadow maps, or too many lights on mobile.
- Letting the object compete with foreground copy or CTAs.

## Quick Checks
- The object has visible form, edges, highlights, and shadows.
- The material uses `metalness`, `roughness`, and optional `emissive`.
- Directional and ambient lights are both present.
- The camera is perspective, not orthographic by accident.
- Resize does not stretch the object.
- Geometry, material, event listeners, RAF, and renderer are cleaned up.
