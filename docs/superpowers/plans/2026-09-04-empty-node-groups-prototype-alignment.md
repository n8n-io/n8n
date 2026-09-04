# Empty Node Groups — Prototype Alignment Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the empty-node-groups spike match the prototype frames exactly. A group is one **card**: a header with the title, a right-hand slot (EMPTY badge or collapse chevron), and the description inline under the title. An empty group adds a body with a centered "+" that opens node search and fills the group. Filled groups collapse to the same card shape (minus the "+"). The canvas toolbar gets an add-group button beside the sticky-note button. This is a spike to assess how far approach B can go, so: no shortcuts, no hacks, and existing `ponytail:` markers in scope get resolved.

**Architecture:** Unchanged (approach B): an empty group is a normal group whose only member is a hidden no-op `groupPlaceholder` node. Filling replaces the placeholder through the existing `replaceNode` path. The change here is the **card layout model**: today the group VueFlow node is always `GROUP_HEADER_HEIGHT` tall and the description floats in a panel *outside* that box. The prototype needs the description inside the header and, for empty groups, a "+" body below it, so the node's height must reflect the whole card and the side handles land at its true middle. That is a change in the rect model (`useCanvasMapping.groups.ts`), threaded through the layout engine, then a rebuild of the title bar as a card.

**Tech Stack:** Vue 3, VueFlow, Pinia, Vitest. Frontend only.

**Spec:** Nine prototype frames shared in conversation on 2026-09-04. Summarised in "Frame contract" below so this plan is self-contained.

## Frame contract (what "the same" means)

| # | Frame | Contract |
|---|---|---|
| 1 | Toolbar + expanded group (Webhook) + empty card | Toolbar has an add-group button next to the sticky-note button. Expanded group: header with title and italic "Add a description..." on top of a dashed frame around its nodes. Empty group: card with title, **EMPTY** badge top-right, description line, centered bordered **"+"**, grey handle dots left/right at the card's vertical middle. Dashed border. |
| 2 | Two filled groups, one hovered | Filled group header has a **chevron** in the right slot (collapse). Hover/selection thickens the border. |
| 3–6 | Filled groups with several nodes | Expanded frame; connections attach to member nodes and cross the frame. A node added from a member's output joins the group (existing auto-extend). |
| 7 | Start → Middle → End, all empty | Each card: bold title, EMPTY badge, **real description text wrapping to 2 lines** (not italic), "+", handles. Dashed edges handle-to-handle. |
| 8 | Middle filled with Notion | Middle becomes an expanded card: title, description **clamped to 1 line with ellipsis**, Notion inside the frame. Start's edge now enters Notion; Notion's edge exits to End. Start/End unchanged. |
| 9 | Middle collapsed | Same card shape as an empty group: title, **chevron** (not EMPTY), 2-line description, handles; no "+". Edges attach to its handles. |

Not in the frames and therefore **unchanged**: the description editor's Save + Build actions (kept from v1), title rename (inline when expanded, modal when collapsed), toolbar ungroup / extract / add-to-chat for filled groups, mock generation when the AI builder is off.

## Global Constraints

- Always use `pnpm`; run tests from the package directory.
- No `any`; no `as` outside tests.
- All UI text through `@n8n/i18n` (`en.json`).
- CSS: semantic tokens from `@n8n/design-system`; never hardcoded px for spacing/colors. Use the `n8n:design-system` skill on every `.vue`/SCSS change.
- Icons: keys from `updatedIconSet` only.
- **No new `ponytail:` markers.** Resolve the in-scope ones (Task 4). Leave a marker only for the mock generator, which is a stand-in by design.
- Every card dimension comes from **one** place (`useCanvasMapping.groups.ts` + constants). The component never invents a height.
- Do not regress expanded groups: their rect, frame, and z-order are untouched.

## File map

| File | Responsibility |
|---|---|
| `canvas/stores/canvasNodeGroups.constants.ts` | `GROUP_EMPTY_BODY_HEIGHT`; header height doc update. |
| `canvas/composables/useCanvasMapping.groups.ts` | `computeGroupFrameRects(nodesRect, { isEmpty })`, `getGroupCardHeight`, `titleBarFromNodesRect` returns height, `mapGroupsToVueFlowNodes` sets node height. |
| `canvas/composables/useCanvasNodeGroupLayout.ts` | `buildNodeGroupLayoutComponents` takes `isEmptyGroup`. |
| `canvas/components/WorkflowCanvas.vue` | Pass `isEmptyGroup` to the layout builder. Drop the description-visibility provide (Task 5). |
| `canvas/components/elements/groups/CanvasNodeGroupTitleBar.vue` | Rebuild as the card. |
| `canvas/components/Canvas.vue` | Drop description-visibility handlers (Task 5). |
| `shared/contextMenu/composables/useContextMenuItems.ts` | Drop show/hide description items (Task 5). |
| `canvas/composables/useCanvasNodeGroupDescriptionVisibility.ts` | Delete (Task 5). |
| `shared/nodeCreator/views/NodeCreation.vue` | Add-group toolbar button. |
| `app/composables/useCanvasOperations.ts` | `addEmptyGroup({ position })` as one undo step. |
| `app/views/NodeView.vue` | Use `addEmptyGroup`; wire the toolbar emit. |
| `@n8n/i18n/src/locales/en.json` | New strings; remove pin strings (Task 5). |

---

### Task 1: Card layout model

**Files:**
- Modify: `canvasNodeGroups.constants.ts`, `useCanvasMapping.groups.ts`, `useCanvasNodeGroupLayout.ts`, `WorkflowCanvas.vue`
- Test: `useCanvasMapping.groups.test.ts`, `useCanvasNodeGroupLayout.test.ts`

**Interfaces:**
- `GROUP_EMPTY_BODY_HEIGHT = GRID_SIZE * 4` — the "+" body under the header.
- `computeGroupFrameRects(nodesRect, options?: { isEmpty?: boolean })` — `collapsed.height` becomes `GROUP_HEADER_HEIGHT + (isEmpty ? GROUP_EMPTY_BODY_HEIGHT : 0)`. Expanded unchanged.
- `getGroupCardHeight({ isCollapsed, isEmptyGroup }): number` — the single source for the rendered node height: collapsed card (with or without body) or the header when expanded.
- `titleBarFromNodesRect(nodesRect, collapsed, isEmpty?)` → adds `height`.
- `mapGroupsToVueFlowNodes` → `height: titleBar.height` (was the constant).
- `buildNodeGroupLayoutComponents({ ..., isEmptyGroup })` → `collapsedRect` accounts for the body so pushes clear the whole card.

- [x] **Step 1: Failing tests** in `useCanvasMapping.groups.test.ts`: collapsed rect height for an empty group = header + body; non-empty unchanged; `mapGroupsToVueFlowNodes` emits `height` = card height for empty, header for collapsed, header for expanded. In `useCanvasNodeGroupLayout.test.ts`: an empty group's component `collapsedRect.height` includes the body.
- [x] **Step 2: Implement** as above. Thread `isEmptyGroup` into `buildNodeGroupLayoutComponents` from `WorkflowCanvas.vue` (`workflowDocumentStore.value.isEmptyGroup`).
- [x] **Step 3: Run both test files, typecheck. Commit** `feat(editor): Size empty group cards to include the add-node body` — `4e64139973`.

---

### Task 2: Rebuild the title bar as the card

**Files:**
- Modify: `CanvasNodeGroupTitleBar.vue`, `en.json`
- Test: `CanvasNodeGroupTitleBar.test.ts`

**Structure (one card, dashed border in every state):**

```
.wrapper                         height = getGroupCardHeight(data)
  .card
    .header                      background: subtle; height = GROUP_HEADER_HEIGHT
      .titleRow
        title                    inline edit when expanded, plain when collapsed
        rightSlot                EMPTY badge (empty) | chevron toggle (filled)
      .description               inline; italic placeholder when empty;
                                 clamp 1 line expanded, 2 lines collapsed/empty;
                                 click → textarea in place; Escape/Enter/blur
        .descriptionActions      only while editing: cancel · save · build (empty only)
    .body                        empty only: centered bordered "+" (add-node)
  Handle left/right              at 50% of .wrapper → card middle
                                 visible dot when collapsed (empty or filled)
                                 connectable only when empty
  .frame                         expanded only, below header (unchanged)
  .selectionRing                 expanded + selected (unchanged)
  .toolbar                       hover, above: ungroup / extract / add-to-chat (filled only)
```

**Remove from this component:** the floating `descriptionPanel`, `showInfoIcon`, hover timers, pin/eye button, `NodeGroupDescriptionVisibilityKey` inject, `showCollapsedDescription`/`isPermanentlyVisible`. (Their upstream providers go in Task 5.)

- [x] **Step 1: Rewrite tests.** Keep every non-description test. Replace the `description` and `collapsed description` describes with: inline description shown in all three states; placeholder when empty; 1-line clamp class when expanded, 2-line when collapsed; click-to-edit; Enter/Escape/blur; Save and Build (empty) emits; EMPTY badge vs chevron in the right slot; "+" present only when empty and not read-only; handle dot class present when collapsed, connectable only when empty; wrapper height equals `getGroupCardHeight` for each state.
- [x] **Step 2: Implement** the template and styles. Tokens only. Card `var(--background--surface)`, frame `var(--background--hover)`. Description clamp via `-webkit-line-clamp`. Below `GROUP_DESCRIPTION_MIN_ZOOM` hide the description text but keep the header height. The editor overlays the card while editing so the card keeps the height the mapping gave it.
- [x] **Step 3: Tests, typecheck, lint. Commit** `feat(editor): Render node groups as a card with an inline description` — `7565954a0f`.

---

### Task 3: Toolbar add-group button + one-step creation

**Files:**
- Modify: `NodeCreation.vue`, `NodeView.vue`, `useCanvasOperations.ts`, `en.json`
- Test: `NodeCreation.test.ts`, `useCanvasOperations.test.ts`

**Interfaces:**
- `useCanvasOperations.addEmptyGroup({ position, name? }): Promise<IWorkflowGroup | undefined>` — creates the placeholder and its group inside one `startRecordingUndo`/`stopRecordingUndo` bulk, pushing `AddNodeGroupCommand`. Replaces the inline body of `onCreateEmptyGroup` (resolves its `ponytail:` marker).
- `NodeCreation` emit `addEmptyGroup: [position: XYPosition]` — mid-canvas like `addStickyNote`.
- i18n `nodeView.addEmptyGroupHint`.

- [x] **Step 1: Failing tests.** `useCanvasOperations`: `addEmptyGroup` creates the node + group and records one bulk with an `AddNodeGroupCommand`. `NodeCreation`: the button renders and emits `addEmptyGroup` with a position.
- [x] **Step 2: Implement.** Button placed directly above the sticky-note button, `icon="square"`, `data-test-id="add-empty-group-button"`. `NodeView.onCreateEmptyGroup(position?)` calls `addEmptyGroup` then opens the rename flow as today.
- [x] **Step 3: Tests, typecheck, lint. Commit** `feat(editor): Add empty groups from the canvas toolbar in one undo step` — `fa776be833`.

---

### Task 4: Resolve in-scope shortcut markers

- [x] `NodeView.vue` "not one undo step" — resolved by Task 3.
- [x] `useCanvasOperations.ts` "no drop guard". Investigated: group connection rules are decided on release for every endpoint (`isConnectionReplacementAllowedForNodeGroups`), and node handles carry no earlier per-group validation either (`useNodeConnections.isValidConnection` only checks handle mode/type). An empty card therefore already behaves exactly as a node does during a drag — there was no shortcut, only a misleading comment. Comment corrected; no drag-time validator added, as that would be new behaviour nodes do not have.
- [x] Mock generator marker stays; it is a stand-in by design.

---

### Task 5: Retire the description pin system

Approved by the user on 2026-09-04. The prototype shows descriptions always inline, so the pin/eye toggle, info-icon hover reveal, per-workflow pinned-state storage, and the four show/hide context-menu items had nothing left to control.

- [x] Deleted `useCanvasNodeGroupDescriptionVisibility.ts` (+ test), `LOCAL_STORAGE_CANVAS_GROUP_DESCRIPTION_PINNED`, the provide in `WorkflowCanvas.vue`, the inject + handlers in `Canvas.vue`, the four items in `useContextMenuItems.ts`, `isDescriptionVisible` on the context-menu bridge, their i18n strings, and the matching `useContextMenu.test.ts` cases.
- [x] Typecheck, lint, tests. Commit `refactor(editor): Retire group description pinning in favour of the inline card` — `0689e785f6`.

---

### Task 6: Verify against the frames in the running app

Verified live on 2026-09-04 against the user's dev servers (built backend on 5678, `vite dev` on 8080) in a fresh workflow.

- [x] **Frame 1** — toolbar: +, search, **add-group square**, sticky, side panel, AI (the prototype's pen icon is out of scope per the user). Clicking the square creates a card at the canvas centre and opens the rename modal.
- [x] **Frame 7** — three cards Start / Middle / End: bold title, EMPTY badge, description (italic placeholder, or real text wrapping under the title), centered "+", grey handle dots at the card's vertical middle. Handle-to-handle edges Start → Middle → End.
- [x] **Frame 8** — Middle's "+" opens the node creator in replacement mode ("Replace this step"); picking Edit Fields swaps the placeholder for the node inside Middle's frame. Start's edge now enters the node, the node's edge exits to End. Start and End stay EMPTY.
- [x] **Frame 9** — collapsing Middle gives the same card shape as an empty group with the chevron in the right slot and no "+"; edges attach to its handle dots.
- [x] **Frame 2** — selection thickens the card border (existing selected ring).
- [x] **Undo** — one cmd+z removes a new group and its placeholder together.
- [x] Description editing: click the text → in-place editor; Enter saves, Escape cancels; Build on empty groups.

**Found and fixed during verification (`9261c50d89`):** the first group added after page load rendered as a bare placeholder node with no card. VueFlow 1.48 pauses its props→store sync for a tick after every store echo and vueuse's `watchPausable` drops changes that arrive in that window; `addEmptyGroup` mutated the store twice a microtask apart. Both mutations now run in one synchronous block so the mapping emits a single VueFlow update. The same hazard exists for any two canvas updates a microtask apart — see Known gaps.

**Noted, not changed:** the toolbar always inserts at the canvas centre, like sticky notes, so successive groups stack until dragged. The placeholder node's *name* is deduplicated by `addNode` against earlier placeholders (e.g. "Group " after "Group 1"/"Group 2" exist); it is hidden on the canvas but visible in execution logs.

## Self-review checklist

- One source of truth for card height; component reads it, never computes it.
- Expanded groups render pixel-identical to before except the inline description clamp.
- Handles are dots on every collapsed card; connectable only on empty.
- No `ponytail:` markers except the mock generator.
- i18n for every string; tokens for every style.

## Known gaps after this plan

- **VueFlow drops a nodes update that lands in the tick after a store echo** (`watchNodesValue` in @vue-flow/core 1.48 + vueuse `watchPausable`). `addEmptyGroup` avoids it by mutating in one flush; the fill path (`addNodesAndConnections` → `replaceNode`) and mock generation still mutate across awaits and worked in the live check, but they sit on the same hazard. A guard in `Canvas.vue` that re-applies `props.nodes` when the store lags would close it for every flow.

- Collapsed card width stays `GROUP_HEADER_WIDTH_COLLAPSED` (400). The prototype's cards read narrower; tune the constant once the layout engine's push tests are re-baselined.
- Drag-drop of an existing on-canvas node into an empty card (free drag into frame) is still separate work.
- Real Instance AI generation, nesting, triggers-in-groups, publish-time warning, telemetry filtering — deferred from the original POC.
