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
