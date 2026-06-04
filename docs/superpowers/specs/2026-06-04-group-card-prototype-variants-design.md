# Group card prototype variants — design

- **Date:** 2026-06-04
- **Branch:** `groups-proto-expanded-details`
- **Status:** Approved (design)
- **Type:** Throwaway prototype for usability testing — NOT for production.

## Context & goal

We are testing how much detail belongs on a **collapsed canvas group card**. We
want to show several alternative card designs to participants in a **single live
usability session** and flip between them **instantly**, without `git switch` or
rebuilds. All variants live together on this branch.

Start with **3 variant slots** (content to be decided later); adding a 4th must
be trivial.

## Non-goals

- No production wiring: no PostHog/experiment flag, no DB migration, no API change.
- No variants on the **expanded** group overlay (collapsed card only for now).
- No automated coverage of the variant content (it is throwaway). Existing
  collapsed-group tests must stay green.

## Architecture (Approach B: variant sub-components + registry)

```
GroupVariantSwitcher.vue  ──writes──▶  useGroupCardVariant (state, localStorage)
                                              │ reads
CanvasNodeCollapsedGroup.vue (container) ─────┘
   owns: wrapper, edge handles, expand/contextmenu, pinned-node data, icon helpers
   renders: <component :is="activeVariant.component" v-bind="cardProps" @…/>
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────┐
   GroupCardV1.vue                       GroupCardV2.vue                GroupCardV3.vue
   (today's title+description)           (copy of V1, TBD)              (copy of V1, TBD)
```

### Components & files

**New** (all under
`packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/nodes/render-types/group-card-variants/`):

- `registry.ts` — ordered list of `{ id, label, component }`. Single source of
  truth for which variants exist and their switcher labels.
- `useGroupCardVariant.ts` — composable exposing `variants` (from registry),
  `activeVariantId` (persisted via `useLocalStorage` from `@vueuse/core`, key
  `n8n.prototype.groupCardVariant`, default the first id), `activeVariant`
  computed, and `setVariant(id)`.
- `GroupCardV1.vue` — exact extract of today's collapsed-card body (chevron +
  title/description column [Option-B layout], pin button, pinned list). Pure
  presentation: receives props, emits events.
- `GroupCardV2.vue`, `GroupCardV3.vue` — start as copies of V1 (identical until
  edited later).
- `GroupVariantSwitcher.vue` — small segmented control (`V1 · V2 · V3`),
  discreetly pinned in a canvas corner; highlights the active id; click →
  `setVariant`.

**Modified:**

- `CanvasNodeCollapsedGroup.vue` → becomes the **container**. Keeps all data
  computeds (`pinnedNodes`, `pickableItems`, `iconSourceForNodeId`,
  `executionRank`, `currentGroup`, `description`, handle/port logic) and the
  outer wrapper + `CanvasHandleRenderer`s + expand/context-menu wiring. Replaces
  the inline header/title/description/pinned markup with the active variant
  component, passing a typed `cardProps` bundle and forwarding events.
- The canvas host component that renders groups (e.g. `Canvas.vue`, gated by the
  existing `isCanvasNodeGroupingEnabled`) → mount `<GroupVariantSwitcher>` once.

### `cardProps` bundle (container → variant)

A single typed prop object so variants stay simple and adding fields later does
not churn call sites. Includes: `title`, `description`, `isReadOnly`,
`pinnedNodes` (display list), `pickableItems`, `canPickNodes`, and the helper
`iconSourceForNodeId`. Variants emit: `expand`, `pick-node`, `open-node`,
`unpin-node`, `open-contextmenu` — the container maps these to its existing
handlers.

### Data flow

1. Switcher click → `setVariant(id)` → `activeVariantId` ref updates (and
   localStorage).
2. Every `CanvasNodeCollapsedGroup` container reads `activeVariant` → swaps the
   rendered variant component → all collapsed cards update at once.
3. Variant emits an action → container runs the same store calls it does today
   (`setGroupCollapsed`, `addPinnedNodeToGroup`, etc.).

## Extensibility — adding a 4th variant

1. Add `GroupCardV4.vue` (copy an existing one).
2. Append `{ id: 'v4', label: 'V4', component: GroupCardV4 }` to `registry.ts`.

The switcher renders the new button and persistence handles the new id
automatically. No other changes.

## Scope guard / risk

- The only non-trivial step is the container/presentational refactor of
  `CanvasNodeCollapsedGroup.vue`. It is mechanical: move markup into `GroupCardV1`
  unchanged, wire props/events. **Preserve all existing `data-testid`s** so any
  collapsed-group tests keep passing.
- Box width/height geometry is unchanged (still driven by
  `GROUP_COLLAPSED_WIDTH` / `min-height`); variants only change inner content.

## Verification

- App boots; `http://localhost:5173/workflow/MOrmPdqXesdEYqkB` and
  `…/QcLDKGHibwOcwU0m` render with the switcher visible.
- V1 looks identical to today; V2/V3 (copies) also identical at first.
- Clicking `V1/V2/V3` instantly re-renders every collapsed card; reload keeps the
  selection.
- `cd packages/frontend/editor-ui && pnpm typecheck` and lint on changed files pass;
  existing collapsed-group/overlay tests stay green.

## Open items (intentional, decide later)

- Actual content of V2 and V3 (service icons, key parameters, minimal, etc.).
- Whether the switcher should be hideable / labelled.
