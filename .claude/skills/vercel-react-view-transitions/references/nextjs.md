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
