# 3D Orbit & Inspect — Demo Prompts

## Minimal prompt

Use $3d-orbit-inspect-demo to make this 3D object lean around a few degrees when
I hover it, and lift into a full inspect view when I click: drag to turn, Esc to put it back.

## Recreate the demo

Use $3d-orbit-inspect-demo to recreate **3D Orbit & Inspect** as a single
standalone HTML file. Treat `demo.html` as the visual, motion, accessibility and
performance reference. Load three.js 0.169.0 through an import map from unpkg.

### Experience

- One full-viewport dark workshop (`#0a0806`), a hinoki-and-sugi wedged
  through-tenon joint lying on a dark plank, warm key light from the upper left,
  one low ember accent (`#dbad64`). Instrument Serif and Inter.
- Left column: a small ember kicker naming the stack (Three.js, WebGL,
  MeshPhysicalMaterial, no OrbitControls, no shaders), the title
  "Orbit & Inspect", one paragraph, two hint labels and an "Inspect the joint"
  button. The joint sits right of the words on desktop, below them on a phone.
- The joint is real geometry, in millimetres: a beam with a rectangular mortise
  cut through its depth, a post stepped down to a tenon that passes through it,
  a slot in the tenon and a tapered wedge in the slot. 0.4 mm clearances, 1.2 mm
  bevels, the post's shoulder exactly on the beam face, the wedge flat on its
  slot. Everything rests on the plank (no floating, no intersecting).

### Hover

- Raycast against the joint's meshes. While hit, a gain eases to 1 (tau 0.30 s);
  the camera orbits the joint by an amount taken from where the pointer is
  relative to the joint, capped at 0.30 rad round and 0.09 rad up and down,
  damped at 4.5/s. Off the joint the gain returns to 0 and the camera returns.
- A "Look closer" pill with an ember ring sits beside the joint, never over it;
  the cursor is `zoom-in`.
- Touch devices have no hover: a slow sway at 0.6 of the bounds shows the depth.
- Reduced motion: no lean, the joint rests at its three-quarter pose.

### Click and the inspect view

- Press and release under 6 px and 600 ms on the joint opens it. A press that
  drags does not. The lean freezes for the length of a press.
- The joint moves to layer 1. Pass one draws the room, then a fullscreen dim at
  0.80 opacity, then pass two draws the joint alone, lit by the room's lights plus
  a warm lamp from upper left. It travels to the middle of the free band between
  the top bar and the caption, 1.0 m from the eye, sized to the band, on a
  perspective-true path (interpolate x/z and y/z, then the depth), 1.0 s with
  `1 - (1-k)^4.4`, lifting on a `sin` arc of 0.06 m and tilting toward you to 0.72 rad.
- The page copy fades out. A caption arrives: "Wedged through-tenon 込栓",
  "Two timbers and a wedge — no glue, no steel", and a hint row with Close.
- In the hand: drag turns it (0.0085 rad/px yaw, 0.0065 pitch, pitch 0.25 to 1.30),
  it coasts with `exp(-2.4 dt)`, after 2.2 s idle it turns on at 0.26 rad/s. Wheel
  or pinch moves it closer, 0.70 to 1.45 of fit, eased. Arrow keys turn, `+`/`-` zoom.
- Click away, Esc or Close puts it back. It straightens first, then descends to
  the exact pose it left (0.60 s; cancelling mid-lift lands on the same pose).
  Focus returns to the opener after the page copy is visible.
- A real button opens it from the keyboard; a `role=status` region announces
  "Inspecting..." and "Back on the bench."

### Performance and rules

- DPR cap 2, `dt` clamp 1/30, pause when hidden, render only when something
  moved, static shadow map (update it only when the joint changes layer), warm both
  light states at load so the first click does not compile. Screenshots at
  1440x900 and 390x844, console clean.

## Remix prompt

Use $3d-orbit-inspect-demo to build a different object with the same two gestures.
Change the subject: a lacquered tea bowl on a slate slab, a chef's knife on a
board, a rotary dial, a pocket watch. Change the palette and the composition
(centred object, text above, a cool room and a copper accent). Keep the mechanism
and the budgets: bounded damped hover lean with a raycast-driven gain, the lean
frozen across a click, 6 px / 600 ms click test, layer-1 lift with a dim between
passes, 1.0 s in, 0.60 s home, focus return, live region, reduced-motion still,
DPR cap 2. If the subject is rotationally symmetric, give the lean something to
show: a handle, a spout, a logo, a chip.
