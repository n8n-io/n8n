# CSS Animation Recipes

Ready-to-use CSS for `<ViewTransition>` props. Copy into your global stylesheet.

This file contains the complete CSS recipe set for the patterns in this skill. Copy only what the app needs.

---

## Timing Variables

```css
:root {
  --duration-exit: 150ms;
  --duration-enter: 210ms;
  --duration-move: 400ms;
}
```

### Shared Keyframes

```css
@keyframes fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide {
  from { translate: var(--slide-offset); }
  to { translate: 0; }
}

@keyframes slide-y {
  from { transform: translateY(var(--slide-y-offset, 10px)); }
  to { transform: translateY(0); }
}
```

---

## Fade

```css
::view-transition-old(.fade-out) {
  animation: var(--duration-exit) ease-in fade reverse;
}
::view-transition-new(.fade-in) {
  animation: var(--duration-enter) ease-out var(--duration-exit) both fade;
}
```

Usage: `<ViewTransition enter="fade-in" exit="fade-out" />`

Keep the shared fade keyframe opacity-only. If a specific morph needs softness, give that class its own blur keyframe so ordinary content reveals stay crisp.

---

## Slide (Vertical)

```css
::view-transition-old(.slide-down) {
  animation:
    var(--duration-exit) ease-out both fade reverse,
    var(--duration-exit) ease-out both slide-y reverse;
}
::view-transition-new(.slide-up) {
  animation:
    var(--duration-enter) ease-in var(--duration-exit) both fade,
    var(--duration-move) ease-in both slide-y;
}
```

Usage:
```jsx
<Suspense fallback={<ViewTransition exit="slide-down"><Skeleton /></ViewTransition>}>
  <ViewTransition default="none" enter="slide-up"><Content /></ViewTransition>
</Suspense>
```

---

## Directional Navigation

### Separate Enter/Exit Classes

```css
::view-transition-new(.slide-from-right) {
  --slide-offset: 60px;
  animation:
    var(--duration-enter) ease-out var(--duration-exit) both fade,
    var(--duration-move) ease-in-out both slide;
}
::view-transition-old(.slide-to-left) {
  --slide-offset: -60px;
  animation:
    var(--duration-exit) ease-in both fade reverse,
    var(--duration-move) ease-in-out both slide reverse;
}

::view-transition-new(.slide-from-left) {
  --slide-offset: -60px;
  animation:
    var(--duration-enter) ease-out var(--duration-exit) both fade,
    var(--duration-move) ease-in-out both slide;
}
::view-transition-old(.slide-to-right) {
  --slide-offset: 60px;
  animation:
    var(--duration-exit) ease-in both fade reverse,
    var(--duration-move) ease-in-out both slide reverse;
}
```

### Single-Class Approach

```css
::view-transition-old(.nav-forward) {
  --slide-offset: -60px;
  animation:
    var(--duration-exit) ease-in both fade reverse,
    var(--duration-move) ease-in-out both slide reverse;
}
::view-transition-new(.nav-forward) {
  --slide-offset: 60px;
  animation:
    var(--duration-enter) ease-out var(--duration-exit) both fade,
    var(--duration-move) ease-in-out both slide;
}

::view-transition-old(.nav-back) {
  --slide-offset: 60px;
  animation:
    var(--duration-exit) ease-in both fade reverse,
    var(--duration-move) ease-in-out both slide reverse;
}
::view-transition-new(.nav-back) {
  --slide-offset: -60px;
  animation:
    var(--duration-enter) ease-out var(--duration-exit) both fade,
    var(--duration-move) ease-in-out both slide;
}
```

---

## Shared Element Morph

```css
::view-transition-group(.morph) {
  animation-duration: var(--duration-move);
}

::view-transition-image-pair(.morph) {
  animation-name: via-blur;
}

@keyframes via-blur {
  30% { filter: blur(3px); }
}
```

Usage: `<ViewTransition name={`product-${id}`} share="morph" />`

**Note:** Shared element transitions take raster snapshots. For text with significant size differences (e.g., `<h3>` → `<h1>`), the old snapshot gets scaled up, producing a visible ghost artifact. Use `text-morph` for text shared elements.

## Text Morph

Avoids raster scaling artifacts on text by hiding the old snapshot and showing the new text at full resolution:

```css
::view-transition-group(.text-morph) {
  animation-duration: var(--duration-move);
}
::view-transition-old(.text-morph) {
  display: none;
}
::view-transition-new(.text-morph) {
  animation: none;
  object-fit: none;
  object-position: left top;
}
```

Usage: `<ViewTransition name={`title-${id}`} share="text-morph" />`

---

## Scale

```css
::view-transition-old(.scale-out) {
  animation: var(--duration-exit) ease-in scale-down;
}
::view-transition-new(.scale-in) {
  animation: var(--duration-enter) ease-out var(--duration-exit) both scale-up;
}

@keyframes scale-down {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(0.85); opacity: 0; }
}
@keyframes scale-up {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

Usage: `<ViewTransition enter="scale-in" exit="scale-out" />`

---

## Interactivity During Transitions

The `::view-transition` overlay captures all pointer events. React shrinks it to zero when the root group doesn't animate, but in-flight animations still block clicks. To pass clicks/hover through even while animating:

```css
::view-transition {
  pointer-events: none;
}
```

Trade-offs: clicks can hit live elements under still-moving snapshots, and it only helps **unnamed** content — named participants are skipped by hit-testing for the transition's duration, no CSS override ([csswg#10930](https://github.com/w3c/csswg-drafts/issues/10930)). Weigh that before naming interactive elements; portal named popovers (see [Isolate Elements from Parent Animations](patterns.md#isolate-elements-from-parent-animations)).

---

## No Root Cross-Fade (Live Root)

The root cross-fades on every transition, freezing unnamed content behind a stale snapshot — hover and active styles stop rendering until it settles. `::view-transition-new(root)` is a **live** capture, so disabling the root animation keeps unnamed regions rendering (and, with the `pointer-events` recipe above, interactive):

```css
::view-transition-old(root) {
  display: none;
}
::view-transition-new(root) {
  animation: none;
}
```

Named and classed groups still animate — they stack above root. Trade-off: unnamed content swaps instantly, so regions that should fade need their own VT. This also removes the main reason to hand-name static chrome; keep names only for elements that must stack above animating groups.

Pairs well with enter-only reveals: skip the fallback-exit VT entirely (`<ViewTransition enter="auto" default="none">` around the content, nothing on the skeleton) — the skeleton snaps out live while the content fades in.

---

## Persistent Element Isolation

```css
::view-transition-group(persistent-nav) {
  animation: none;
  z-index: 100;
}
```

Layer multiple pinned groups with z-index tiers — chrome at `100`, toasts/overlays that must beat everything at `200`.

### Backdrop-Blur Workaround

For elements with `backdrop-filter`, hide the old snapshot to avoid flash:

```css
::view-transition-old(persistent-nav) {
  display: none;
}
::view-transition-new(persistent-nav) {
  animation: none;
}
```

### Floating Element Isolation (popovers, menus, tooltips, control clusters)

Same freeze as persistent chrome. A floating/interactive element left rendered while a background transition runs is otherwise captured in the `root` snapshot and flickers as it settles. Give it a real, unique `view-transition-name` (never `none` — that's the CSS default = no isolation) and:

```css
::view-transition-group(popover) {
  animation: none;
  z-index: 100;
}
::view-transition-old(popover),
::view-transition-new(popover) {
  animation: none;
}
```

### Sliding Indicator (tab underline / segmented pill)

One shared-name indicator morphs between positions. Slide the group; disable old/new so the solid bar slides instead of cross-fading:

```css
::view-transition-group(.tab-underline) {
  animation-duration: 220ms;
  animation-timing-function: cubic-bezier(0.5, 0, 0.2, 1);
}
::view-transition-old(.tab-underline),
::view-transition-new(.tab-underline) {
  animation: none;
  height: 100%;
}
```

---

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*),
  ::view-transition-group(*) {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
}
```
