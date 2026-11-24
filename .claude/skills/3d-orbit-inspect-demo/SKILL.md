---
name: 3d-orbit-inspect-demo
description: Make a 3D object lean around on hover and open a full inspect view on click. Hover is a damped, bounded camera lean; click lifts the piece off its bench into the hand, where you drag to turn it, coast, dolly with wheel or pinch, and put it back with Esc, click-away or a Close button. Use for product, object, joinery and portfolio pieces in Three.js where a hover orbit and click-to-full-view must not fight each other; use webgl-3d-object for a floating hero mesh with no inspect mode, and 3d-virtual-tour for a camera path through a place.
---

# 3D Orbit and Inspect

Three.js · WebGL. No OrbitControls, no custom shaders.

**The mechanism:** hover leans the *camera* a few degrees around the object with a gain that rises only while a raycast hits it, and click hands the *object* (not the camera) to a second render layer that lifts it to a fixed spot in front of the lens. The two modes share no state except one rule: the lean freezes whenever a click is possible or the piece is in the hand. Remove that rule and the target slides out from under the click.

Nearest skills: `webgl-3d-object` (a floating mesh, no inspect), `3d-virtual-tour` (its "orbit inspection" is one mode of a walkthrough; the camera itself flies). Reach for this when there is one object and two gestures on it.

Reuse `demo.html`: the joint, the room, the lean, the lift and the return are all in one module. Copy `updateLean`, `updateHand`, `openInspect`, `closeInspect`, the pointer block and `draw`. Swap the meshes for your own object; nothing else names the joint except `FROM`, `RR` and `Q_BENCH`.

## What is and is not in the source

Kibori (`kibori.html`, section "8b. Inspect — pick an item up") has click-to-lift with drag-to-turn, an idle wheel, a "Look closer" cue and a zoom-in cursor on hover, and close by click-away, Esc, scroll or its Close button. It has **no hover orbit**: the camera only leans a few degrees as scroll dollies it between stations. It also has **no free zoom**, because wheel is the page scroll and closes the piece. So:

- Ported unchanged: the item is lifted, the camera is not flown; the layer-1 second pass; the `1-(1-k)^4.4` lift ease; 1.0 s in, 0.60 s home, 0.28 s fast close; the way home straightens before it descends (`sstep(0,.36)` then `sstep(.24,1)`); drag 0.0085 / 0.0065 rad per px; spin damping `exp(-2.4 dt)`; idle turn 0.26 rad/s after 2.2 s; click = under 6 px and 600 ms; the band between the top bar and the caption; the cue pill. Not ported: Kibori's hand-written tone-mapping pass and blur of the room behind the piece; the demo uses `ACESFilmic` and a flat dim.
- Built here in the Kibori manner: the hover lean, the wheel/pinch dolly, arrow-key and +/- control, focus return, the live region, the touch sway.

## Rules, each with the failure it prevents

1. **Freeze the lean on pointerdown and while inspecting.** Otherwise the camera keeps easing during a 100 ms click and the raycast at pointerup misses a piece that moved 6 px. Raycast again at pointerup, on the same layer the piece is on.
2. **Gain from a raycast, target from the pointer relative to the piece.** `g` rises to 1 only while the ray hits (tau 0.30 s); the target is `clamp((pointer - pieceCentre)/(0.18 W), -1, 1)`. Screen-centre pointer maps make the piece drift whenever the mouse is anywhere on the page.
3. **Bound and damp.** Azimuth ±0.30 rad, elevation ±0.09 rad, `1 - exp(-4.5 dt)`. Unbounded lean turns the object edge-on; an undamped one jitters with a 1 px mouse.
4. **Hover is the last pointer, not a media query.** `(hover:hover)` lies on hybrid laptops and headless Chrome. Read `pointerType` on `pointermove`; touch gets a slow sway (±0.6 of the bound at 0.55 rad/s) so the depth is still shown without hover.
5. **Click and drag are one pointerdown.** Under 6 px and under 600 ms opens; anything else is a drag and never opens. In the hand the same 6 px test separates "turn" from "click away". Set `touch-action:none` on the canvas only while inspecting, so the page can still scroll when it is not.
6. **Lift by layer, not by clone or `.visible`.** The piece moves to layer 1, the room renders on layer 0, a fullscreen quad at opacity `0.80 e` goes between, `clearDepth()`, then layer 1. Lights need `layers.enable(1)` or the lifted piece renders black. The scene needs `background = null` and manual `clear()`; a scene background re-clears pass two.
7. **Perspective-true hand-off, no pop.** Interpolate in camera space: `x/z` and `y/z` linearly, then multiply by the lerped depth. A world-space lerp slides in depth and the piece hardly moves sideways for the first 100 ms. The world "from" pose is stored, never re-read from the moving object, so a cancelled lift lands on the exact bench pose (verified equal to four decimals after Esc at 150 ms).
8. **Hold the camera in the hand; never chase it.** The hand pose is defined in camera space; if the lean keeps easing while inspecting, the piece swims. Freeze it, resume on close.
9. **Sit at the band's middle, sized by it.** `fit = min(0.92 bandH, 0.88 W) / (2 R ppu)` with `ppu = H / (2 D tan(fov/2))`, D = 1.0 m. Measure the caption's settled top (`top - 14 - 40`) before it fades in; a piece sized for the whole viewport runs under the caption.
10. **Close is its own clock.** On close, `e0 = r0 = insOut(k)` and `k` restarts from 1; a piece turned further takes up to 1.5x longer (`span`). Closing from the middle of the lift must not restart from zero.
11. **Zoom is eased and bounded.** 0.70 to 1.45 of fit, wheel `exp(-dy 0.0012)`, ease `1 - exp(-8 dt)`, pinch by finger distance ratio. Past 1.5 the piece overlaps the caption; below 0.7 it is smaller than it sat on the bench. Reset to 1 on close.
12. **Pitch is bounded and relaxes.** 0.25 to 1.30 rad, home 0.72, pull home at `exp(-0.35 dt)`. A flat timber turned past ~1.3 is a hairline.
13. **Keyboard and focus.** A real button opens (`Inspect the joint`); Enter and Space work. On open, focus the Close button and set the caption `inert = false`; Tab is trapped to it; arrows turn 0.14 rad, `+` `-` zoom 15%, Esc closes. Return focus to the opener **after** the page copy is visible again: the copy is `visibility:hidden` while inspecting and `focus()` on a hidden element silently does nothing.
14. **A live region, not aria-live on the dialog.** Announce "Inspecting ..." on open and "Back on the bench." on close through a separate `role=status` node, cleared then set 30 ms later so a repeat is announced.

## Numbers

| thing | value |
| --- | --- |
| lens, rest camera | FOV 34, elevation 0.40 rad, 1.50 m (portrait: `0.92 / aspect`) |
| hover lean | az ±0.30, el ±0.09, damping 4.5/s, gain tau 0.30 s |
| lift | 1.0 s, `1 - (1-k)^4.4`, arc `sin(pi e) * 0.06` m, hand at D = 1.0 m |
| home | 0.60 s (0.28 s fast), rotate `sstep(0,.36)`, descend `sstep(.24,1)` |
| dim behind | opacity `0.80 e`, same colour as the room |
| lamp on the piece | warm point, `3.0 e`, up 0.5 / left 0.6 / toward eye 0.35 m, layer 1 only |
| turn | 0.0085 / 0.0065 rad/px, damp 2.4/s, idle 0.26 rad/s after 2.2 s |
| budget | `dt` clamp 1/30, DPR cap 2, shadow map static (2048), render only when something moved |

## Room

Dark room `#0a0806`, `FogExp2 0.42` (materials that must not go murky set `fog:false`), key `0xfff2df` 2.0 from upper left with the only shadow, fill `0xaec7df` 0.76, rim `0xffdeb4` 0.72, hemisphere 0.19, a low ember point `0xffb46a`. Environment: a PMREM of three emissive cards in a black box at `environmentIntensity 0.55`. Ember `#dbad64` is the only accent (cue ring, kicker, focus).

## Reduced motion, hidden, cost

- `prefers-reduced-motion`: no lean (the piece rests at the three-quarter bench pose), the lift is instant (`rate = 1e3`), no idle spin, no cue slide. Drag, keys and zoom still work: they are direct manipulation.
- `visibilitychange` cancels the loop; resume resets `last` so the first frame does not integrate the pause.
- Cost, measured on an Apple GPU in headless Chrome (Metal): about 0.3 ms of CPU per rendered frame, 3 draw calls, about 250 triangles; 8.6 ms per synchronous frame in the two-pass lifted state at 1440x900 and 14.2 ms at 2880x1800 (DPR 2). Idle at rest renders zero frames. The lever is DPR; the shadow map is static and free, and triangle count does not matter.

## Expensive gotchas

- **The lifted piece is black.** Lights are layer-filtered by the camera; `light.layers.enable(1)`.
- **The room disappears when the piece appears.** `scene.background` re-clears in the second `render`; use `setClearColor` and `autoClear = false`.
- **A shader compile hitch on the first click.** The lit-piece pass has a different light set (the lamp). Draw both states once at load.
- **Shadow of a piece that has left.** `shadowMap.autoUpdate = false`, then `needsUpdate` when the piece changes layer, or a ghost shadow stays on the bench.
- **Cue and cursor stay after a click.** Clear both on open; `zoom-in` cursor only on hit, `grab` / `grabbing` in the hand.
- **Focus lost on close.** See rule 13.
- **`Object3D.clone` serialises `userData`.** If you clone instead of switching layers, empty `userData` first (render targets and polygons in there stall the clone).

## Verify

Load at 1440x900 and 390x844; hover at three pointer positions (lean left, right, none); press and release on the piece (opens), press-drag-release across it (does not open); drag, wheel, pinch in the hand; click-away, Esc and Close each return the piece to the exact bench pose, including when cancelled 150 ms into the lift; Tab reaches the button, Enter opens, focus lands on Close and returns; reduced motion shows the rest pose and an instant lift; console is clean.

Extracted from KIBORI 木彫, a dark WebGL workshop page where every bench piece can be picked up and turned in the hand (section 8b). The hover lean and dolly are new, built to the same easing and HUD.
