# React View Transitions

**Version 1.0.0**
Vercel Engineering

> **Note:**
> This standalone guide is compiled from `SKILL.md` and its reference files
> for agents that consume a single `AGENTS.md` document. Edit the source
> files, not this compiled copy.

---

Animate between UI states using the browser's native `document.startViewTransition`. Declare *what* with `<ViewTransition>`, trigger *when* with `startTransition` / `useDeferredValue` / `Suspense`, control *how* with CSS classes. Unsupported browsers skip animations gracefully.

## When to Animate

Every `<ViewTransition>` should communicate a spatial relationship or continuity. If you can't articulate what it communicates, don't add it.

Implement **all** applicable patterns from this list, in this order:

| Priority | Pattern | What it communicates |
|----------|---------|---------------------|
| 1 | **Shared element** (`name`) | "Same thing — going deeper" |
| 2 | **Suspense reveal** | "Data loaded" |
| 3 | **List identity** (per-item `key`) | "Same items, new arrangement" |
| 4 | **State change** (`enter`/`exit`) | "Something appeared/disappeared" |
| 5 | **Route change** (page-level) | "Going to a new place" |

This is an implementation order, not a "pick one" list. Implement every pattern that fits the app. Only skip a pattern if the app has no use case for it.

### Choosing Animation Style

| Context | Animation | Why |
|---------|-----------|-----|
| Hierarchical navigation (list → detail) | Type-keyed `nav-forward` / `nav-back` | Communicates spatial depth |
| Lateral navigation (tab-to-tab) | Bare `<ViewTransition>` (fade) or `default="none"` | No depth to communicate |
| Suspense reveal | `enter`/`exit` string props | Content arriving |
| Revalidation / background refresh | `default="none"` | Silent — no animation needed |

Reserve directional slides for hierarchical navigation (list → detail) and ordered sequences (prev/next photo, carousel, paginated results). For ordered sequences, the direction communicates position: "next" slides from right, "previous" from left. Lateral/unordered navigation (tab-to-tab) should not use directional slides — it falsely implies spatial depth.

---

## Availability

- **Next.js:** Do **not** install `react@canary` — the App Router already bundles React canary internally. `ViewTransition` works out of the box. `npm ls react` may show a stable-looking version; this is expected.
- **Without Next.js:** Use stable `react` and `react-dom` 19.3 or newer (`ViewTransition` and `addTransitionType` became stable in React 19.3). Earlier stable React versions do not include these APIs.
- Browser support: Chromium 125+ (React needs the v2 object form of `startViewTransition`), Firefox 144+, Safari 18.2+. Graceful degradation on unsupported browsers.

---

## Implementation Workflow

When adding view transitions to an existing app, **follow [references/implementation.md](references/implementation.md) step by step.** Start with the audit — do not skip it. Use [references/css-recipes.md](references/css-recipes.md) for the applicable CSS and adapt it to the app.

---

## Core Concepts

### The `<ViewTransition>` Component

```jsx
import { ViewTransition } from 'react';

<ViewTransition>
  <Component />
</ViewTransition>
```

React auto-assigns a unique `view-transition-name` and calls `document.startViewTransition` behind the scenes. Never call `startViewTransition` yourself.

### Animation Triggers

| Trigger | When it fires |
|---------|--------------|
| **enter** | `<ViewTransition>` first inserted during a Transition |
| **exit** | `<ViewTransition>` first removed during a Transition |
| **update** | DOM mutations inside a `<ViewTransition>`, or the boundary itself changing size/position due to an immediate sibling. With nested VTs, mutation applies to the innermost one |
| **share** | Named VT unmounts and another with same `name` mounts in the same Transition |

Only `startTransition`, `useDeferredValue`, or `Suspense` activate VTs. Regular `setState` does not animate.

### Critical Placement Rule

`<ViewTransition>` only activates enter/exit if it appears **before any DOM nodes**:

```jsx
// Works
<ViewTransition enter="auto" exit="auto">
  <div>Content</div>
</ViewTransition>

// Broken — div wraps the VT, suppressing enter/exit
<div>
  <ViewTransition enter="auto" exit="auto">
    <div>Content</div>
  </ViewTransition>
</div>
```

---

## Styling with View Transition Classes

### Props

Values: `"auto"` (browser cross-fade), `"none"` (disabled), `"class-name"` (custom CSS), or `{ [type]: value }` for type-specific animations.

```jsx
<ViewTransition default="none" enter="slide-in" exit="slide-out" share="morph" />
```

If `default` is `"none"`, all triggers are off unless explicitly listed.

### CSS Pseudo-Elements

- `::view-transition-old(.class)` — outgoing snapshot
- `::view-transition-new(.class)` — incoming snapshot
- `::view-transition-group(.class)` — container
- `::view-transition-image-pair(.class)` — old + new pair

See [references/css-recipes.md](references/css-recipes.md) for ready-to-use animation recipes.

---

## Transition Types

Tag transitions with `addTransitionType` so VTs can pick different animations based on context. Call it multiple times to stack types — different VTs in the tree react to different types:

```jsx
startTransition(() => {
  addTransitionType('nav-forward');
  addTransitionType('select-item');
  router.push('/detail/1');
});
```

Pass an object to map types to CSS classes. Works on `enter`, `exit`, **and** `share`:

```jsx
<ViewTransition
  enter={{ 'nav-forward': 'slide-from-right', 'nav-back': 'slide-from-left', default: 'none' }}
  exit={{ 'nav-forward': 'slide-to-left', 'nav-back': 'slide-to-right', default: 'none' }}
  share={{ 'nav-forward': 'morph-forward', 'nav-back': 'morph-back', default: 'morph' }}
  default="none"
>
  <Page />
</ViewTransition>
```

`enter` and `exit` don't have to be symmetric. For example, fade in but slide out directionally:

```jsx
<ViewTransition
  enter={{ 'nav-forward': 'fade-in', 'nav-back': 'fade-in', default: 'none' }}
  exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
  default="none"
>
```

**TypeScript:** `ViewTransitionClassPerType` requires a `default` key in the object.

For apps with multiple pages, extract the type-keyed VT into a reusable wrapper:

```jsx
export function DirectionalTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
```

### `router.back()` and Browser Back Button

`router.back()` and the browser's back/forward buttons carry **no transition types**, so type-keyed animations (directional slides) resolve to their `default` and don't play — untyped shared-element morphs still apply. For typed animations, use `router.push()` with an explicit URL.

### Types and Suspense

Types are available during navigation but **not** during subsequent Suspense reveals (separate transitions, no type). Use type maps for page-level enter/exit; use simple string props for Suspense reveals.

### Shared Element Readiness

A shared element transition can pair elements only when both the old and new views are rendered in the same Transition. If incoming content suspends, only its fallback exists for that update; the resolved content appears in a later Suspense transition and can be animated separately.

---

## Shared Element Transitions

Same `name` on two VTs — one unmounting, one mounting — creates a shared element morph:

```jsx
<ViewTransition name="hero-image">
  <img src="/thumb.jpg" onClick={() => startTransition(() => onSelect())} />
</ViewTransition>

// On the other view — same name
<ViewTransition name="hero-image">
  <img src="/full.jpg" />
</ViewTransition>
```

- Only one VT with a given `name` can be mounted at a time — use unique names (`photo-${id}`). Watch for reusable components: if a component with a named VT is rendered in both a modal/popover *and* a page, both mount simultaneously and break the morph. Either make the name conditional (via a prop) or move the named VT out of the shared component into the specific consumer.
- `share` takes precedence over `enter`/`exit`. Think through each navigation path: when no matching pair forms (e.g., the target page doesn't have the same name), `enter`/`exit` fires instead. Consider whether the element needs a fallback animation for those paths.
- Two ways a wired-up morph silently never fires: (1) `default="none"` with no explicit `share` prop — share resolves to none; (2) type-keyed `share` where the navigation never adds the type — a plain link click resolves the map's `default`. Every link that should morph must add the type (`transitionTypes` on `next/link`, or `addTransitionType`).
- Never use a fade-out exit on pages with shared morphs — use a directional slide instead.

---

## Common Patterns

### Enter/Exit

```jsx
{show && (
  <ViewTransition enter="fade-in" exit="fade-out"><Panel /></ViewTransition>
)}
```

### List Reorder

```jsx
{items.map(item => (
  <ViewTransition key={item.id}><ItemCard item={item} /></ViewTransition>
))}
```

Trigger inside `startTransition`. Avoid wrapper `<div>`s between list and VT.

### Layout Displacement Morph

Only content inside an activated boundary animates position — everything else teleports to its new layout spot. Wrap the sibling content below a growing/shrinking list in a bare `<ViewTransition>` so it glides instead of jumping. See [Layout Displacement Morph](references/patterns.md#layout-displacement-morph).

### Composing Shared Elements with List Identity

Shared elements and list identity are independent concerns — don't confuse one for the other. When a list item contains a shared element (e.g., an image that morphs into a detail view), use two nested `<ViewTransition>` boundaries:

```jsx
{items.map(item => (
  <ViewTransition key={item.id}>                                      {/* list identity */}
    <Link href={`/items/${item.id}`}>
      <ViewTransition name={`item-image-${item.id}`} share="morph">   {/* shared element */}
        <Image src={item.image} />
      </ViewTransition>
      <p>{item.name}</p>
    </Link>
  </ViewTransition>
))}
```

The outer VT handles list reorder/enter animations. The inner VT handles the cross-route shared element morph. Missing either layer means that animation silently doesn't happen.

### Force Re-Enter with `key`

```jsx
<ViewTransition key={searchParams.toString()} enter="slide-up" default="none">
  <ResultsGrid />
</ViewTransition>
```

**Caution:** If wrapping `<Suspense>`, changing `key` remounts the boundary and refetches.

### Suspense Fallback to Content

Simple cross-fade:
```jsx
<ViewTransition>
  <Suspense fallback={<Skeleton />}><Content /></Suspense>
</ViewTransition>
```

Directional reveal:
```jsx
<Suspense fallback={<ViewTransition exit="slide-down"><Skeleton /></ViewTransition>}>
  <ViewTransition enter="slide-up" default="none"><Content /></ViewTransition>
</Suspense>
```

For more patterns, see [references/patterns.md](references/patterns.md).

---

## How Multiple VTs Interact

Every VT matching the trigger fires simultaneously in a single `document.startViewTransition`. VTs in **different** transitions (navigation vs later Suspense resolve) don't compete.

### Use `default="none"` Deliberately

Without it, every VT fires the browser cross-fade on **every** transition — Suspense resolves, `useDeferredValue` updates, background revalidations. Use `default="none"` on named/shared elements and type-keyed page VTs.

But it also turns off `update` (layout/reflow morphs) and `share` (a named pair with no explicit `share` prop never morphs). Keyed list items and displaced siblings *want* update — leave them bare or set `update="auto"`.

### Two Patterns Coexist

**Pattern A — Directional slides:** Type-keyed VT on each page, fires during navigation.
**Pattern B — Suspense reveals:** Simple string props, fires when data loads (no type).

They coexist because they fire at different moments. `default="none"` on both prevents cross-interference. Always pair `enter` with `exit`. Place directional VTs in page components, not layouts.

### Nested VT Limitation

When a parent VT mounts/unmounts **as one unit** with nested VTs inside it, the nested ones do not fire their own enter/exit — only the outermost VT animates. (A child VT mounted inside a *persistent* parent VT fires enter/exit normally.) Per-item staggered animations during page navigation are not currently available in Next.js; see [troubleshooting](references/troubleshooting.md) for the upstream experimental status.

---

## Next.js Integration

For Next.js integration (`transitionTypes` on `next/link` and `useRouter`, App Router patterns, Server Components), see [references/nextjs.md](references/nextjs.md).

---

## Accessibility

Always add the reduced motion CSS from [references/css-recipes.md](references/css-recipes.md#reduced-motion) to your global stylesheet.

---

## Reference Files

- **[references/implementation.md](references/implementation.md)** — Step-by-step implementation workflow.
- **[references/patterns.md](references/patterns.md)** — Patterns, animation timing, and events API.
- **[references/troubleshooting.md](references/troubleshooting.md)** — Symptom-driven debugging and runtime limitations.
- **[references/css-recipes.md](references/css-recipes.md)** — Ready-to-use CSS animation recipes.
- **[references/nextjs.md](references/nextjs.md)** — Next.js App Router patterns and Server Component details.

---

# Implementation Workflow

Follow these steps in order when adding view transitions to an app. Each step builds on the previous one.

Use the official [React `<ViewTransition>` reference](https://react.dev/reference/react/ViewTransition) and [Next.js guide](https://nextjs.org/docs/app/guides/view-transitions) for API behavior. This file focuses on audit order, integration decisions, and verification.

## Step 1: Audit the App

Before writing any code, scan the codebase thoroughly. Search for:

- **Every `<Link>` and `router.push`** — these are your navigation triggers. Open every file that contains one.
- **Every `<Suspense>` boundary** — each one is a candidate for a reveal animation. Check what its fallback renders.
- **Every page/route component** — list them all. Each page needs a VT placement decision.
- **Persistent elements** — headers, navbars, sidebars, sticky controls that stay on screen across navigations. These need `viewTransitionName` isolation.
- **Shared visual elements** — images, cards, or avatars that appear on both a source and target view (e.g., a thumbnail in a list and the same image on a detail page).
- **Skeleton-to-content control pairs** — if a Suspense fallback renders a control (search input, tab bar) that also exists in the real content, both need a matching `viewTransitionName`.

Then classify every navigation and produce a navigation map:

```
| Route           | Navigates to         | Direction    | VT pattern            |
|-----------------|----------------------|--------------|-----------------------|
| /               | /detail/[id]         | forward      | directional slide     |
| /detail/[id]    | /                    | back         | directional slide     |
| /detail/[id]    | /detail/[other]      | sequential   | directional slide (ordered prev/next) or key+share crossfade |
| /tab/[a]        | /tab/[b]             | lateral      | key+share crossfade   |
| (Suspense)      | (content loads)      | —            | slide-up reveal       |
```

For each shared element (`name` prop), note every navigation where a pair forms and where it doesn't — this determines whether you need `enter`/`exit` as a fallback alongside `share`.

## Step 2: Add CSS Recipes

Choose the animation pattern from the audit and this skill's guidance, then copy only the applicable sections from [css-recipes.md](css-recipes.md). Always include reduced motion. Add live-root, persistent-element, backdrop, or floating-element rules only when the audit found those surfaces.

Customize timing after the structure works. Keep ordinary crossfades opacity-only; scope blur to a specific shared morph when it is intentional.

## Step 3: Isolate Persistent Elements

For every persistent element identified in Step 1, add a `viewTransitionName` style to pull it out of the page content's transition snapshot:

```jsx
<header style={{ viewTransitionName: "site-header" }}>...</header>
```

Then add the [Persistent Element Isolation](css-recipes.md#persistent-element-isolation) CSS (prevents the element from animating during page transitions). If the element uses `backdrop-blur` or `backdrop-filter`, use the [Backdrop-Blur Workaround](css-recipes.md#backdrop-blur-workaround) instead.

If a Suspense fallback mirrors a persistent control (e.g., a skeleton search input), give both the real control and the skeleton the same `viewTransitionName` so they morph in place.

## Step 4: Add Directional Page Transitions

For hierarchical navigations identified in Step 1, tag the navigation direction using `addTransitionType` inside `startTransition`:

```jsx
startTransition(() => {
  addTransitionType('nav-forward');
  router.push('/detail/1');
});
```

Then wrap each **page component** (not layout) in a type-keyed `<ViewTransition>`:

```jsx
<ViewTransition
  enter={{
    "nav-forward": "nav-forward",
    "nav-back": "nav-back",
    default: "none",
  }}
  exit={{
    "nav-forward": "nav-forward",
    "nav-back": "nav-back",
    default: "none",
  }}
  default="none"
>
  <div>...page content...</div>
</ViewTransition>
```

The `nav-forward` and `nav-back` CSS classes from [Directional Navigation](css-recipes.md#directional-navigation) produce horizontal slides. For simpler apps where directional motion isn't needed, a bare `<ViewTransition default="none">` wrapper with `enter="fade-in"` / `exit="fade-out"` works too.

Extract this into a reusable component so every page doesn't repeat the verbose type map:

```jsx
export function DirectionalTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
```

This also becomes the single place to adjust if you add new transition types later.

**Rules:**
- Always pair `enter` with `exit` — without an exit animation, the old page disappears instantly while the new one animates in.
- Always include `default: "none"` in type map objects and `default="none"` on the component — otherwise it fires on every transition.
- Place the directional `<ViewTransition>` in each page component, not in a layout. Layouts persist across navigations and never trigger enter/exit.
- Only use directional slides for hierarchical navigation or ordered sequences (prev/next). Lateral/sibling navigation (tab-to-tab) should use a bare `<ViewTransition>` (cross-fade) or `default="none"`.

## Step 5: Add Suspense Reveals

For every `<Suspense>` boundary identified in Step 1, wrap the fallback and content in separate `<ViewTransition>`s:

```jsx
<Suspense
  fallback={
    <ViewTransition exit="slide-down">
      <Skeleton />
    </ViewTransition>
  }
>
  <ViewTransition enter="slide-up" default="none">
    <AsyncContent />
  </ViewTransition>
</Suspense>
```

This example uses `slide-down` / `slide-up` for directional vertical motion. For a simpler reveal, a bare `<ViewTransition>` around the `<Suspense>` gives a cross-fade with zero configuration. Choose based on the spatial meaning described in the main skill.

**Rules:**
- Always use `default="none"` on the content `<ViewTransition>` to prevent re-animation on revalidation or unrelated transitions.
- Use simple string props (not type maps) on Suspense `<ViewTransition>`s — Suspense resolves fire as separate transitions with no type, so type-keyed props won't match.
- A fallback/content `share` pair morphs between snapshots. Use it only when that interpolation is desired and does not distort layout or geometry.
- If the same element appears in **both** the fallback and the content (a title, a heading), it flickers on reveal — an opacity dip. Render it **outside** the `<Suspense>` boundary (or pin it), so it isn't in both. See [Suspense reveal flicker](patterns.md#suspense-reveal-flicker).

## Step 6: Add Shared Element Transitions

For every shared visual element identified in Step 1, add matching named `<ViewTransition>` wrappers on both the source and target views:

```jsx
// On the source view (e.g., list/grid page)
<ViewTransition name={`photo-${photo.id}`} share="morph" default="none">
  <Image src={photo.src} ... />
</ViewTransition>

// On the target view (e.g., detail page) — same name
<ViewTransition name={`photo-${photo.id}`} share="morph">
  <Image src={photo.src} ... />
</ViewTransition>
```

The `share="morph"` class uses the [Shared Element Morph](css-recipes.md#shared-element-morph) recipe (controlled duration + motion blur). For a simpler cross-fade, use `share="auto"` (browser default).

When list items contain shared elements, compose both patterns with two nested `<ViewTransition>` layers — an outer keyed VT for list identity and an inner named VT for the cross-route pair. See [Composing Shared Elements with List Identity](../SKILL.md#composing-shared-elements-with-list-identity).

**Rules:**
- Names must be globally unique — use prefixes like `photo-${id}`.
- Add `default="none"` on list-side shared elements to prevent per-item cross-fades on filter/search updates.
- The target must be **in the DOM at navigation time** for the pair to form. If it's behind a Suspense fallback (not rendered yet), no pair forms and it won't morph. It works when the target is present at the snapshot — render it above the data boundary, or have its data **cached/prefetched** so it resolves in time.

## Step 7: Verify Each Navigation Path

Walk through every row in the navigation map from Step 1 and confirm:

- Does the VT mount/unmount on this navigation, or does it stay mounted (same-route)?
- For named VTs: does a shared pair form? If not, does `enter`/`exit` provide a fallback?
- Does `default="none"` block an animation you actually want?
- Do persistent elements stay static (not sliding with page content)?
- Do Suspense reveals animate independently from directional navigations?

If any path produces no animation or competing animations, use the symptom-driven [troubleshooting guide](troubleshooting.md).

For Next.js-specific implementation steps (`transitionTypes` on `<Link>`, prefetch behavior, and same-route dynamic segments), see [nextjs.md](nextjs.md).

---

# Patterns and Guidelines

Use the official [React `<ViewTransition>` reference](https://react.dev/reference/react/ViewTransition) for API mechanics. This file collects reusable implementation patterns and failure modes from production apps.

## Searchable Grid with `useDeferredValue`

`useDeferredValue` makes filter updates a transition, activating `<ViewTransition>`:

```tsx
'use client';

import { useDeferredValue, useState, ViewTransition, Suspense } from 'react';

export default function SearchableGrid({ itemsPromise }) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  return (
    <>
      <input value={search} onChange={(e) => setSearch(e.currentTarget.value)} />
      <ViewTransition>
        <Suspense fallback={<GridSkeleton />}>
          <ItemGrid itemsPromise={itemsPromise} search={deferredSearch} />
        </Suspense>
      </ViewTransition>
    </>
  );
}
```

Per-item `<ViewTransition name={...}>` inside a deferred list triggers cross-fades on every keystroke. Fix with `default="none"`:

```tsx
{filteredItems.map(item => (
  <ViewTransition key={item.id} name={`item-${item.id}`} share="morph" default="none">
    <ItemCard item={item} />
  </ViewTransition>
))}
```

## Card Expand/Collapse with `startTransition`

Toggle between grid and detail view with shared element morph:

```tsx
'use client';

import { useState, useRef, startTransition, ViewTransition } from 'react';

export default function ItemGrid({ items }) {
  const [expandedId, setExpandedId] = useState(null);
  const scrollRef = useRef(0);

  return expandedId ? (
    <ViewTransition enter="slide-in" name={`item-${expandedId}`}>
      <ItemDetail
        item={items.find(i => i.id === expandedId)}
        onClose={() => {
          startTransition(() => {
            setExpandedId(null);
            setTimeout(() => window.scrollTo({ behavior: 'smooth', top: scrollRef.current }), 100);
          });
        }}
      />
    </ViewTransition>
  ) : (
    <div className="grid grid-cols-3 gap-4">
      {items.map(item => (
        <ViewTransition key={item.id} name={`item-${item.id}`}>
          <ItemCard
            item={item}
            onSelect={() => {
              scrollRef.current = window.scrollY;
              startTransition(() => setExpandedId(item.id));
            }}
          />
        </ViewTransition>
      ))}
    </div>
  );
}
```

## Type-Safe Transition Helpers

Use `as const` arrays and derived types to prevent ID clashes:

```tsx
const transitionTypes = ['default', 'transition-to-detail', 'transition-to-list'] as const;
const animationTypes = ['auto', 'none', 'animate-slide-from-left', 'animate-slide-from-right'] as const;

type TransitionType = (typeof transitionTypes)[number];
type AnimationType = (typeof animationTypes)[number];
type TransitionMap = { default: AnimationType } & Partial<Record<Exclude<TransitionType, 'default'>, AnimationType>>;

export function HorizontalTransition({ children, enter, exit }: {
  children: React.ReactNode;
  enter: TransitionMap;
  exit: TransitionMap;
}) {
  return <ViewTransition enter={enter} exit={exit}>{children}</ViewTransition>;
}
```

## Cross-Fade Without Remount

Omit `key` to trigger an update (cross-fade) instead of exit + enter. Avoids Suspense remount/refetch:

```jsx
<ViewTransition>
  <TabPanel tab={activeTab} />
</ViewTransition>
```

Use `key` when content identity changes (state resets). Omit for cross-fades (tabs, panels, carousel).

## Isolate Elements from Parent Animations

Pull an element out of the animated `root` snapshot by giving it its own `view-transition-name`. **`view-transition-name: none` is a no-op** — it's the CSS default, so the element stays in `root` (a common flicker bug). Use a real, unique name, then neutralize with `<ViewTransition default="none">` (no CSS) or CSS (needed for `z-index`/`display` control — see [css-recipes.md](css-recipes.md#persistent-element-isolation)).

- **Persistent chrome** (nav, sidebar, player bar): `<nav style={{ viewTransitionName: 'persistent-nav' }}>` + isolation CSS. `<ViewTransition default="none">` works too, but its auto-name can't take `z-index`/backdrop `display:none` — hand-name when you need those.
- **Floating elements** (popovers, menus): left open, they're captured in `root` and flicker on settle. Real name + isolation ([Floating Element Isolation](css-recipes.md#floating-element-isolation-popovers-menus-tooltips-control-clusters)). A static name is fine if only one is mounted (`unmountOnHide`); native top-layer (`popover`/`<dialog>`) settle-flicker is a browser limit.
- **Naming an interactive element has a cost:** named participants are skipped by hit-testing while a transition runs ([csswg#10930](https://github.com/w3c/csswg-drafts/issues/10930)) — clicks and hover fall through to whatever is beneath. Portal named popovers/menus; rendered inline in a clickable row, mid-transition clicks activate the row and read as outside-clicks that close the popover.
- **Third-party floating components** (toast libraries, portals you don't render): put the name on an always-mounted wrapper you own — `<div style={{ viewTransitionName: 'toaster' }} className="pointer-events-none fixed inset-0">`. Library containers often unmount when empty, so naming them directly leaves the group unpinned exactly when a toast appears mid-transition. Name a dialog's backdrop separately from its panel so each pins independently.

## Suspense reveal flicker

An element rendered in **both** the fallback and the content flickers (opacity dip) on reveal — it fades against itself. Not a morph. **Fix: render it outside the `<Suspense>` boundary** (mount once, above it), or pin it with a `view-transition-name`.

```jsx
<h1>{title}</h1>
<Suspense fallback={<BodySkeleton />}><Body /></Suspense>
```

Don't put a manual `viewTransitionName` on the root DOM node inside `<ViewTransition>` — React's auto-name overrides it.

## Sliding Indicator (tabs)

One shared-name indicator rendered under the **active** tab morphs between positions on change (slide the group, disable old/new — see [Sliding Indicator](css-recipes.md#sliding-indicator-tab-underline--segmented-pill)). Render it only under the active tab so exactly one element holds `indicatorName`; use a distinct `indicatorName` per tab strip. Trigger the state change inside `startTransition` so the move animates. Whatever owns `active` drives it — local state here, routing in Next (see [Routing-Driven Tabs](nextjs.md#routing-driven-tabs)).

```tsx
import { useState, useTransition, ViewTransition } from 'react';

export function Tabs({ tabs, indicatorName = 'tab-indicator' }) {
  const [active, setActive] = useState(tabs[0].value);
  const [, startTransition] = useTransition();
  return (
    <nav>
      {tabs.map(t => (
        <button key={t.value} type="button"
          aria-current={active === t.value ? 'page' : undefined}
          onClick={() => startTransition(() => setActive(t.value))}>
          <span>{t.label}</span>
          {active === t.value && (
            <ViewTransition name={indicatorName} share="tab-underline">
              <span className="active-underline" aria-hidden />
            </ViewTransition>
          )}
        </button>
      ))}
    </nav>
  );
}
```

Because the state change is a transition, if the newly-active tab renders suspending content the whole update — indicator **and** `aria-current` — waits for it to commit, and the strip feels dead on click. Give the controls an immediate value with `useOptimistic` (drive `aria-current` from it) so feedback is instant while the content streams. The routing variant ([Routing-Driven Tabs](nextjs.md#routing-driven-tabs)) does exactly this: optimistic `aria-current`, committed `active` for the bar.

## Layout Displacement Morph

Only content inside an activated boundary animates position — everything else teleports to its new layout spot. When a list grows or shrinks, wrap the sibling content below it so it glides instead of jumping:

```jsx
<FavoritesList />              {/* rows enter/exit */}
<ViewTransition>               {/* bare: update enabled */}
  <section>
    <h2>You Might Also Like</h2>
    <Recommendations />
  </section>
</ViewTransition>
```

The section — heading included — morphs as one group when rows above are added or removed. Nothing inside the section changed; the *displacement* is the update.

- React only measures boundaries that are direct children of nodes along the changed path — a VT buried under an extra wrapper element won't activate. Place the boundary as a direct sibling of the changing content.
- Sometimes the better fix is no morph at all: pad fixed-size lists to a constant slot count with invisible fillers so the grid never changes height and nothing below it moves.
- `default="none"` disables exactly this morph — it turns off `update`. Named/shared elements get `default="none"`; displaced siblings and keyed list items stay bare or set `update="auto"`.

## Reusable Animated Collapse

```jsx
function AnimatedCollapse({ open, children }) {
  if (!open) return null;
  return (
    <ViewTransition enter="expand-in" exit="collapse-out">
      {children}
    </ViewTransition>
  );
}

// Usage: toggle with startTransition
<button onClick={() => startTransition(() => setOpen(o => !o))}>Toggle</button>
<AnimatedCollapse open={open}><SectionContent /></AnimatedCollapse>
```

## Composing with Activity

`Activity` is orthogonal to view transitions: it preserves the state of a hidden subtree, `ViewTransition` animates it. Compose them for an in-page show/hide (drawer, panel, tab body) that keeps its scroll/form state while it animates in and out:

```jsx
<Activity mode={isVisible ? 'visible' : 'hidden'}>
  <ViewTransition enter="slide-in" exit="slide-out">
    <Sidebar />
  </ViewTransition>
</Activity>
```

Only reach for Activity when there's state worth preserving — a stateless element (e.g. the sliding indicator above) gains nothing from it. In Next.js, layout-hosted chrome already persists across navigations without Activity (see [nextjs.md](nextjs.md#layout-level-viewtransition)).

## Exclude Elements with `useOptimistic`

`useOptimistic` values update before the transition snapshot, excluding them from animation. Use for controls (labels); use committed state for animated content:

```tsx
const [sort, setSort] = useState('newest');
const [optimisticSort, setOptimisticSort] = useOptimistic(sort);

function cycleSort() {
  const nextSort = getNextSort(optimisticSort);
  startTransition(() => {
    setOptimisticSort(nextSort);  // before snapshot — no animation
    setSort(nextSort);            // between snapshots — animates
  });
}

<button>Sort: {LABELS[optimisticSort]}</button>
{items.sort(comparators[sort]).map(item => (
  <ViewTransition key={item.id}><ItemCard item={item} /></ViewTransition>
))}
```

---

## View Transition Events

Imperative control via `onEnter`, `onExit`, `onUpdate`, `onShare`. Return a cleanup function to cancel your animation when the transition finishes. `onShare` takes precedence over `onEnter`/`onExit`.

```jsx
<ViewTransition
  onEnter={(instance, types) => {
    const anim = instance.new.animate(
      [{ transform: 'scale(0.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: 300, easing: 'ease-out' }
    );
    return () => anim.cancel();
  }}
>
  <Component />
</ViewTransition>
```

The `instance` object: `instance.old`, `instance.new`, `instance.group`, `instance.imagePair`, `instance.name`.

The `types` array (second argument) lets you vary animation based on transition type.

---

## Animation Timing

| Interaction | Duration |
|------------|----------|
| Direct toggle (expand/collapse) | 100–200ms |
| Route transition (slide) | 150–250ms |
| Suspense reveal (skeleton → content) | 200–400ms |
| Shared element morph | 300–500ms |

---

# Troubleshooting

**VT not activating:** Ensure `<ViewTransition>` comes before any DOM node and the state update is inside `startTransition`. A raw `viewTransitionName` only isolates an element; it does not activate a React view transition.

**"Two ViewTransition components with the same name":** Names must be globally unique. Use IDs such as `name={`hero-${item.id}`}`. If a reusable component appears in multiple surfaces at once, move the name to the specific consumer or make it conditional.

**Unrelated content crossfades:** A bare VT uses the browser crossfade for every trigger. Set `default="none"` and opt in only to the triggers that boundary should handle.

**Scrolling hangs while a transition animates:** the `::view-transition` overlay is `position: fixed` and its snapshots don't scroll — a browser limitation, not fixable in React (skipping snaps to the end). Keep reveal durations short; for scroll-driven UI use gesture transitions (experimental `useSwipeTransition`, if available).

**Open popover flickers when a background transition settles:** it's captured in `root`. Give it a real `view-transition-name` + isolation (not `none`) — see [Isolate Elements from Parent Animations](patterns.md#isolate-elements-from-parent-animations).

**Popover closes or goes dead when clicked mid-transition:** named participants are skipped by hit-testing while a transition runs; clicks land on what's beneath and read as outside-clicks. Portal the popover (see [Isolate Elements from Parent Animations](patterns.md#isolate-elements-from-parent-animations)); brief dead clicks during the transition remain — that's the price of the name.

**Shared morph silently not firing:** `share` resolved to `none`. Either the VT has `default="none"` with no explicit `share` prop, or `share` is type-keyed and the navigation never adds the type — the link needs `transitionTypes` (or `addTransitionType` in the transition).

**Shared morph competes with a page fade:** A fading page exit dissolves the source while it is morphing. Remove that exit or use motion that preserves the shared element's continuity.

**An enter animation runs even though Suspense never showed its fallback:** The content-side VT became the topmost entering subtree during navigation. At that call site, add a host DOM element immediately outside `Suspense`. The host suppresses the nested enter during warm navigation but remains mounted so the VT can enter on a later fallback-to-content reveal. Keep the host outside `Suspense`, not inside the reusable crossfade; do nothing when a direct host already exists.

**Section below a list teleports instead of gliding:** it's outside any activated boundary, its VT has `default="none"` (which disables `update`), or it isn't an immediate sibling of the changing content. See [Layout Displacement Morph](patterns.md#layout-displacement-morph).

**`router.back()` and browser back/forward skip the directional slide:** traversals carry no transition types, so type-keyed maps resolve to `default` — untyped shared-element morphs still apply. Use `router.push()` for typed animations.

**`flushSync` skips animations:** Use `startTransition` instead.

**Only updates animate (no enter/exit):** Without `<Suspense>`, React treats swaps as updates. Conditionally render the VT itself, or wrap in `<Suspense>`.

**Suspense reveal does not animate:** Suspense resolves in a separate transition without navigation types. Use string `enter`/`exit` props rather than a type map.

**Layout VT prevents page VTs from animating:** Nested VTs skip their own enter/exit when they mount or unmount as one unit with a parent VT. Keep route boundaries in pages, not a layout wrapping `{children}`. React has experimental upstream `parentEnter`/`parentExit` work ([PR #36690](https://github.com/facebook/react/pull/36690)), but those props are not currently available in the Next.js client runtime; do not recommend them in a Next.js app unless the installed runtime and docs explicitly include them.

**Same-route content does not animate with `update`:** Nested VTs can own the mutation before an outer boundary sees it. For a real identity change, use `key` with a stable `name` and `share` instead.

**List reorder not animating with `useOptimistic`:** Optimistic values resolve before snapshot. Use committed state for list order.

**TS error "Property 'default' is missing":** Type-keyed objects require a `default` key.

**Hash fragments cause scroll jumps:** Navigate without hash; scroll programmatically after navigation.

**Backdrop-blur flickers:** Use the [Backdrop-Blur Workaround](css-recipes.md#backdrop-blur-workaround).

**`border-radius` lost during transitions:** Apply `border-radius` directly to the captured element.

**Skeleton controls slide away:** Give matching controls the same `viewTransitionName`.

**Batching:** Multiple updates during animation are batched. A→B→C→D becomes B→D.

---

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

---

# View Transitions in Next.js

## Setup

`<ViewTransition>` works in the App Router with no configuration. The bundled React channel includes it, and Next.js navigations run in React Transitions. Do **not** add the old `experimental.viewTransition` flag or install `react@canary` into a Next.js app.

Read the current [Next.js View Transitions guide](https://nextjs.org/docs/app/guides/view-transitions) and the matching guide under `node_modules/next/dist/docs/` before editing. The installed version is authoritative for flags and API signatures.

Because every link click is a transition, any VT with `default="auto"` fires on **every** navigation — use `default="none"` to prevent competing animations.

For unexpected or broken animation behavior, see [troubleshooting.md](troubleshooting.md).

---

## Next.js Implementation Additions

When following [implementation.md](implementation.md), apply these additions:

**Step 4:** Use `transitionTypes` on `<Link>` — see [The `transitionTypes` Prop](#the-transitiontypes-prop-on-nextlink). If the animation depends on dynamic destination content, also see [When Content Must Be Ready](#when-content-must-be-ready).

**After Step 6:** For same-route dynamic segments (e.g., `/collection/[slug]`), use the `key` + `name` + `share` pattern — see [Same-Route Dynamic Segment Transitions](#same-route-dynamic-segment-transitions).

---

## Layout-Level ViewTransition

**Do NOT add a layout-level VT wrapping `{children}` if pages have their own VTs.** A nested VT skips its own enter/exit only when it mounts or unmounts *as one unit* with a parent VT, which is exactly what a layout VT wrapping `{children}` causes — page-level enter/exit will silently not work. Remove the layout VT entirely. Nesting is otherwise fine and sometimes required: a child VT inside a *persistent* parent VT fires enter/exit normally, and two nested boundaries are the intended shape for [shared elements inside list items](../SKILL.md#composing-shared-elements-with-list-identity).

A bare `<ViewTransition>` in layout works only if pages have **no** VTs of their own.

**Layouts persist across navigations** — `enter`/`exit` only fire on initial mount, not on route changes. Don't use type-keyed maps in layouts. Because layouts persist, chrome hosted in one (nav, sidebar, player) keeps its state across navigations for free — no `Activity` needed. Reserve `Activity` for in-page show/hide (see [Composing with Activity](patterns.md#composing-with-activity)).

---

## The `transitionTypes` Prop on `next/link`

No wrapper component needed, works in Server Components:

```tsx
<Link href="/products/1" transitionTypes={['transition-to-detail']}>
  View Product
</Link>
```

Replaces the manual pattern of `onNavigate` + `startTransition` + `addTransitionType` + `router.push()`. Reserve manual `startTransition` for non-link interactions (buttons, forms).

**Availability:** `transitionTypes` shipped in **Next.js 16.2.0** (it is not gated on the `experimental.viewTransition` flag). If unavailable, use `startTransition` + `addTransitionType` + `router.push()` (see [Programmatic Navigation](#programmatic-navigation)). To check: `grep -r "transitionTypes" node_modules/next/dist/` — if no results, fall back to programmatic navigation.

---

## When Content Must Be Ready

A page transition can animate whatever Next.js renders during navigation, including a loading fallback. A shared content-to-content morph only works when the incoming content is ready as the navigation commits; content that has not rendered yet cannot form the incoming half of the pair.

When an animation depends on dynamic destination content, use Next.js prefetching and caching to make that content available ahead of time. `<Link>` automatically prefetches in production, but the default behavior for dynamic routes may only prefetch a shell or loading boundary. Set `prefetch={true}` to prefetch the full route, and cache the data needed to render the shared content.

```tsx
<Link href={nextHref} prefetch={true} transitionTypes={['nav-forward']}>
  Next
</Link>
```

With Cache Components, put reusable route data in a cached scope such as `use cache` so prefetching can include it. If the destination remains behind an unresolved Suspense boundary, the route transition animates the fallback instead. The content resolves in a separate Suspense transition without the original `nav-forward` or `nav-back` type, so give that content its own reveal animation when needed.

Verify directional transitions in a production build with a cold client cache. Development mode does not run automatic `<Link>` prefetching.

See the Next.js [View Transitions guide](https://nextjs.org/docs/app/guides/view-transitions) and [Prefetching guide](https://nextjs.org/docs/app/guides/prefetching).

---

## Programmatic Navigation

```tsx
'use client';

import { useRouter } from 'next/navigation';

function DetailButton({ href }: { href: string }) {
  const router = useRouter();

  return (
    <button onClick={() => router.push(href, { transitionTypes: ['nav-forward'] })}>
      Open
    </button>
  );
}
```

The `transitionTypes` option adds the types inside the router's navigation Transition. Use `startTransition` + `addTransitionType` for non-navigation state updates, or as a fallback on Next.js versions without the router option.

---

## Server-Side Filtering with `router.replace`

For search/sort/filter that re-renders on the server (via URL params), use `startTransition` + `router.replace`. VTs activate because the state update is inside `startTransition`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { startTransition } from 'react';

function SortControl() {
  const router = useRouter();

  function handleSort(sort: string) {
    startTransition(() => {
      router.replace(`?sort=${sort}`);
    });
  }

  return <button onClick={() => handleSort('newest')}>Newest</button>;
}
```

List items wrapped in `<ViewTransition key={item.id}>` will animate reorder. This is the server-component alternative to the client-side [Searchable Grid](patterns.md#searchable-grid-with-usedeferredvalue) pattern.

For immediate control feedback while the route commits, use `useOptimistic` for the button state but keep the animated list tied to the committed sort value. See [Exclude Elements with `useOptimistic`](patterns.md#exclude-elements-with-useoptimistic).

---

## Routing-Driven Tabs

The generalized sliding indicator ([Sliding Indicator](patterns.md#sliding-indicator-tabs)) driven by navigation instead of local state: tabs are `<Link>`s, `active` comes from the URL (a server prop), and `useOptimistic` slides the indicator instantly while the route commits. Key the mounted indicator to committed `active` so the bar lands where navigation actually settles.

```tsx
'use client';
import Link from 'next/link';
import { useOptimistic, useTransition, ViewTransition } from 'react';

export function Tabs({ tabs, active, indicatorName = 'tab-indicator' }) {
  const [optimisticActive, setOptimisticActive] = useOptimistic(active);
  const [, startTransition] = useTransition();
  return (
    <nav>
      {tabs.map(t => (
        <Link key={t.value} href={t.href} scroll={false}
          aria-current={optimisticActive === t.value ? 'page' : undefined}
          onNavigate={() => startTransition(() => setOptimisticActive(t.value))}>
          <span>{t.label}</span>
          {active === t.value && (
            <ViewTransition name={indicatorName} share="tab-underline">
              <span className="active-underline" aria-hidden />
            </ViewTransition>
          )}
        </Link>
      ))}
    </nav>
  );
}
```

---

## Two-Layer Pattern (Directional + Suspense)

Directional slides + Suspense reveals coexist because they fire at different moments. Place the directional VT in the **page component** (not layout):

```tsx
<ViewTransition
  enter={{ "nav-forward": "slide-from-right", default: "none" }}
  exit={{ "nav-forward": "slide-to-left", default: "none" }}
  default="none"
>
  <div>
    <Suspense fallback={<ViewTransition exit="slide-down"><Skeleton /></ViewTransition>}>
      <ViewTransition enter="slide-up" default="none"><Content /></ViewTransition>
    </Suspense>
  </div>
</ViewTransition>
```

---

## `loading.tsx` as Suspense Boundary

Next.js `loading.tsx` is an implicit `<Suspense>` boundary. Wrap the skeleton in `<ViewTransition exit="...">` in `loading.tsx`, and the content in `<ViewTransition enter="..." default="none">` in the page:

```tsx
// loading.tsx
<ViewTransition exit="slide-down"><PhotoGridSkeleton /></ViewTransition>

// page.tsx
<ViewTransition enter="slide-up" default="none"><PhotoGrid photos={photos} /></ViewTransition>
```

Same rules as explicit `<Suspense>`: use simple string props (not type maps) since Suspense reveals fire without transition types.

---

## Shared Elements Across Routes

```tsx
// List page
{products.map((product) => (
  <Link key={product.id} href={`/products/${product.id}`} transitionTypes={['nav-forward']}>
    <ViewTransition name={`product-${product.id}`}>
      <Image src={product.image} alt={product.name} width={400} height={300} />
    </ViewTransition>
  </Link>
))}

// Detail page — same name
<ViewTransition name={`product-${product.id}`}>
  <Image src={product.image} alt={product.name} width={800} height={600} />
</ViewTransition>
```

If the pair's `share` is type-keyed (or classed via CSS that expects a type), every `<Link>` between the two views must carry the type via `transitionTypes` — a plain link click resolves the share map's `default`, and if that's `none` the morph silently never fires.

---

## Same-Route Dynamic Segment Transitions

When navigating between dynamic segments of the same route (e.g., `/collection/[slug]`), the router swaps subtrees keyed by the segment value rather than doing a plain unmount/mount — enter/exit don't fire reliably. Use `key` + `name` + `share`:

```tsx
<Suspense fallback={<Skeleton />}>
  <ViewTransition key={slug} name="collection-content" share="auto" default="none">
    <Content slug={slug} />
  </ViewTransition>
</Suspense>
```

- `key={slug}` forces unmount/remount on change
- The stable `name` pairs the outgoing and incoming containers; `share="auto"` creates the crossfade
- VT inside `<Suspense>` (without keying Suspense) keeps old content visible during loading

## Server Components

- `<ViewTransition>` works in both Server and Client Components
- `<Link transitionTypes>` works in Server Components — no `'use client'` needed
- `router.push(..., { transitionTypes })`, `addTransitionType`, and `startTransition` require Client Components
