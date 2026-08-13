# Canvas nodes as AI Assistant chat context — Frontend design (ADO-5773)

**Tickets:** [ADO-5773](https://linear.app/n8n/issue/ADO-5773) (this, frontend) ·
parent [ADO-5770](https://linear.app/n8n/issue/ADO-5770) ·
backend [ADO-5772](https://linear.app/n8n/issue/ADO-5772) / PR
[#36039](https://github.com/n8n-io/n8n/pull/36039)

## Goal

Select nodes on the canvas and add them as removable **context chips** in the
Instance AI (AIA) composer, so the user can point the assistant at specific
nodes instead of describing them. Nothing is sent automatically — the user
still writes and sends their own message.

## Surface (verified against master, not assumed)

- **Instance AI** = `features/ai/instanceAi/`, a full-page route at
  `/assistant/:threadId` (`INSTANCE_AI_THREAD_VIEW`). `InstanceAiThreadView.vue`
  renders the composer (`InstanceAiInput.vue`) on the left and a workflow
  preview on the right. That preview (`InstanceAiWorkflowPreview.vue` →
  `WorkflowCanvasHost` → `WorkflowCanvasHostBody` → NodeView/Canvas) is the
  **real interactive canvas** — selection, `CanvasSelectionToolbar.vue`, and
  the context menu are all live (read-only only while the agent is editing).
- This is a **different system** from the legacy assistant
  (`features/ai/assistant/`, the docked "n8n AI · Ask/Build" pane via
  `chatPanelStore`). We build against Instance AI only and must not touch the
  legacy `focus_ai_on_selected` / `focusedNodes.store` path.

### Two trigger contexts

| Context | Where | Composer available? |
|---|---|---|
| **A** | Inside `/assistant/:threadId` (embedded canvas) | Yes — stage directly |
| **B** | Standalone workflow editor (`/workflow/:id`), AIA not open | No — must open a thread first |

Context B has no "open pane" toggle: the only path to AIA from the editor is
`useInstanceAiHandoff.startThread`, which **mints a thread and sends
immediately**. There is no existing "open a thread with an unsent, pre-staged
draft." We add that primitive (see Phase 4).

## Data model (draft-side)

The composer's not-yet-sent state ("draft") stages, per workflow, a list of
sets. Each set stores only what the chip needs to render — no graph-derived
positional data:

```ts
type DraftNodeSet = {
  nodeIds: string[];                       // canvas node ids — membership source of truth
  nodes: Array<{ id: string; name: string; type: string }>; // label + type icon
  canvasGroupId?: string;                  // set once at creation, only when the whole set shares one group
  canvasGroupName?: string;
};
```

- Removing a chip/node mutates `nodeIds`/`nodes` only.
- `inputNode`/`outputNode` are **not** stored in the draft. They are descriptive
  context (the backend renders them into a sentence for the agent —
  `"…preceded by X, followed by Y…"`) and depend on set membership + the live
  graph. They are **recomputed at send time** by the Phase-1 pure function from
  current membership. This eliminates the plan's "recompute on middle-node
  removal" open question: there is nothing to patch mid-edit; send always
  recomputes correctly.
- `canvasGroupId/Name` are stable membership facts, kept as-is through to send.

## Chip kinds (three, from parent spec + ADO-5772 addendum + screenshots)

| Kind | When | Label | Expandable list? | Remove |
|---|---|---|---|---|
| **Named node** | set size 1, no group | node name + type icon | no | removes the set |
| **Bundled** | set size ≥ `SINGLE_SET_NODE_EXPANSION_THRESHOLD` (=4), or any set when 2+ sets staged | `N nodes` + caret | **yes** — caret opens a manually-closed panel listing node names | removes the whole set |
| **Group** | set has `canvasGroupId` (whole set shares one group) | group name + group icon | **no** (graphically one node) | removes the whole set |

Granularity rule (non-group sets), verbatim from the plan:

- **Exactly one set staged**, size `< SINGLE_SET_NODE_EXPANSION_THRESHOLD` → one
  chip **per node**, each individually removable.
- **Exactly one set staged**, size `>=` threshold → one bundled `N nodes` chip.
- **2+ sets staged** → **one chip per set** regardless of individual size
  (size-1 → named chip; larger → bundled `N nodes`). Never explode into per-node
  chips here.

A set is a **group chip** only when `resolveSetCanvasGroup` returned a
`canvasGroupId`, which per Phase 1 happens only when **every** node in the set
belongs to the same canvas group. Mixed/partial/ungrouped → `undefined` → falls
through to the named/bundled rules above.

**Group selection → expanded member ids.** When the user selects a canvas group
(e.g. `Prepare ticket`), the trigger passes the group's **member node ids**
(not the synthetic canvas-group-node id) to the builder — via `Canvas.vue`'s
existing `selectedNodeIdsWithGroupMembers` / `getGroupById(id).nodeIds`. The
members then resolve to one set with `canvasGroupId` → a single group chip.

**Sub-nodes are not auto-included.** Selecting an AI root (Agent/Chain) does
**not** pull in its `ai_*` sub-nodes (model/tools) — the Phase-1 partitioner
walks `'main'` connections only. Sub-nodes join a set only if the user also
selects them. The agent resolves its own sub-nodes via its tools.

**Trigger label:** always count-based — "Add node to chat" (1) / "Add N nodes to
chat" (N). No node-kind-specific wording (no "agent" variant).

Additional visuals from screenshots: every chip carries the node's **type icon**;
a `⌘↵` keyboard shortcut adds the current selection ("Add N nodes to chat"); when
many per-set chips overflow, a **Collapse / expand** toggle appears.

Screenshot example decoded — `[Fetch API Data] [7 nodes] [My group 1]` = a
size-1 set (named), a ≥4 set (bundled with list), and a group set (name-only).

## Cross-cutting facts (must respect)

- **id ↔ name split.** Canvas selection and node groups
  (`IWorkflowGroup.nodeIds`) are keyed by node **id**; `workflow.connections`
  (`IConnections`) is keyed by node **name**. Phase 1 traversal runs in
  name-space; translate via `workflowDocumentStore.getNodeById(id).name`.
- **Node groups** live in `IWorkflowBase.nodeGroups?: IWorkflowGroup[]` (an
  `{id, name, nodeIds[]}` structure), not a field on the node. Reverse index
  `nodeIdToGroupId` and `getGroupForNode(id)` exist on the workflow document
  store (`useWorkflowDocumentNodeGroups`).
- **Feature flag** `CANVAS_NODE_CONTEXT_FLAG` — full plumbing merged to master
  via PR #35986 (ADO-5771): the constant, the `N8N_INSTANCE_AI_NODE_CONTEXT_ENABLED`
  env override, and the posthog `applyEnvOverrides` wiring. Read on the FE via
  `usePostHog().isFeatureEnabled(CANVAS_NODE_CONTEXT_FLAG)`. The backend bakes the
  env override into the delivered flag value — no special-casing needed. **All
  trigger entry points must gate on this flag** (backend re-checks per-user and
  silently drops the attachment when off). Base this frontend work on master.

## Schema dependency

`instanceAiNodesAttachmentSchema` / `InstanceAiNodesAttachment` (and their
addition to the `instanceAiResourceAttachmentSchema` / `instanceAiAttachmentSchema`
unions) live on the backend branch, **not master**. We hand-apply the identical
schema block to our branch, clearly commented as landing via PR #36039 (do NOT
cherry-pick — that would conflict when the backend merges to master; an identical
hand-applied block resolves as a no-op). Phase 1 imports and validates against it.

Backend `nodes` shape (target for Phase 1 output):

```ts
{ type: 'nodes', workflowId, sets: Array<{
    nodes: Array<{ id, name? }>;   // ordered input→output; length 1 = loose node, >1 = chain
    inputNode?: { id, name? };
    outputNode?: { id, name? };
    canvasGroupId?: string;
    canvasGroupName?: string;
}> }
```

Verified backend-contract facts the FE must respect (from PR #36039):

- **`id` is required on every node ref; `name` is optional.** The backend reads
  `node.name ?? node.id` everywhere (`buildNodesAttachmentLine`), so always send
  `id`; send `name` too (we have it) for readable agent context.
- **Neighbors/group are descriptive prose only.** `buildNodesAttachmentLine`
  renders each set to a sentence (`Node "X"` / `A chain of connected nodes:
  A → B → C`, `preceded by "…"`, `followed by "…"`, `part of canvas group "…"`).
  The agent never executes from this — confirms the send-time-compute decision.
- **Schema limits:** `sets` max 50; `nodes` per set max 50 (both `min(1)`). See
  Phase 1 over-limit handling below.
- **Per-user flag re-check on the backend.** If a `nodes` attachment arrives but
  the flag is off for that user, the backend **silently drops it**
  (`canvasNodeContextFlagGate.isEnabled`). So the FE must gate the *trigger* on
  the same `CANVAS_NODE_CONTEXT_FLAG` — otherwise a flag-off user builds chips
  that vanish server-side with no feedback.
- **History round-trip needs no FE work beyond rendering.** The FE POSTs
  structured `attachments: [...]` (`instanceAi.api.ts`); the backend owns the
  persistence encoding (`EDITOR_CONTEXT_JSON`) and reconstructs on load via
  `extractEditorContextResourceAttachments` (its schema now includes `nodes`).
  `InstanceAiMessage.vue` passes every stored attachment (all types) to
  `AttachmentPreview` unfiltered with `is-removable="false"`. So "draft ==
  history" holds automatically **once `AttachmentPreview` handles `type: 'nodes'`**
  (Phase 3). The FE must NOT try to replicate the text encoding.

## Phases

Each phase is TDD (tests before implementation), stops for explicit human
confirmation, and ends with `pnpm typecheck` + `pnpm lint` clean in
`packages/frontend/editor-ui`.

### Phase 1 — Pure attachment builder

New `src/features/ai/instanceAi/utils/buildNodesAttachment.ts` (+ test). Three
small pure functions composed by a top-level `buildNodesAttachment`:

1. `partitionSelectionIntoSets(selectedNodeNames, connections)` — connected
   components using only connections where **both endpoints are selected**; use
   `mapConnectionsByDestination` / `getParentNodes` / `getChildNodes` from
   `n8n-workflow`. Order each set input→output for simple chains; BFS from the
   selected node with no selected predecessor otherwise (documented,
   deterministic).
2. `resolveSetNeighbors(set, connections)` — nearest selected-set-external
   `inputNode` / `outputNode`, or undefined at workflow edges.
3. `resolveSetCanvasGroup(set, workflow)` — `canvasGroupId`/`Name` only if the
   whole set shares one group (via `nodeIdToGroupId` / `getGroupForNode`);
   mixed/partial/none → undefined.

`buildNodesAttachment(workflowId, selectedNodeIds, workflow)` translates
id→name, composes the three, returns the backend `nodes` shape. Also used at
**send time** to recompute neighbors from current draft membership.

**Over-limit handling (cap + toast).** The schema caps `sets` at 50 and `nodes`
per set at 50. A large selection can exceed these. `buildNodesAttachment` caps
to the limits (keep the first N sets; within an over-large set keep the first N
nodes in traversal order) and returns a flag/count so the caller shows a
non-blocking toast (e.g. "Only the first 50 nodes were added to the chat"). The
returned attachment is always schema-valid — never emit a payload the backend
would 400. Caps are two plain consts (`MAX_SETS = 50`, `MAX_NODES_PER_SET = 50`);
the `safeParse` test guards against drift from the schema.

Tests: the 8 cases in the plan (chain→1 set ordered; disjoint→2 sets;
trigger+terminal fine; neighbor resolution incl. edges; group same/mixed/none;
end-to-end fixture; **`safeParse` against `instanceAiNodesAttachmentSchema`**;
empty selection → explicit `null`/return, tested); **plus over-limit: a
selection exceeding 50 sets and a set exceeding 50 nodes each cap to a valid
attachment and signal truncation.**

### Phase 2 — Bridge state + composer draft

- `instanceAi.store.ts`: `pendingComposerAttachments` ref +
  `stageNodeSets(workflowId, newSets)` that **appends** to any existing `nodes`
  attachment for the same workflow (never replaces) + `consumePendingAttachments()`
  (returns and clears).
- `InstanceAiInput.vue`: new `attachedResources` draft ref (holds `DraftNodeSet[]`
  as the `nodes` attachment), consumed from the store on mount/update, merged
  into the submit `attachments` array in `handleSubmit`, **preserving typed text**.
  Add an expose method to stage directly (Context A).

Tests: append-not-replace (guarded loudly); consume-once; consume clears store;
component picks up staged attachment; **typed text preserved** across staging.

### Phase 3 — Chip rendering

Reordered ahead of the trigger UI: after Phases 1+2 there is already a
build→stage path, so chips can be rendered and exercised now — the visible,
subjective part of the feature — before investing in trigger + navigation
plumbing. This is also where the plan's deferred question (what removing a
middle per-node chip should feel like) is settled against a working UI rather
than on paper.

Extend `AttachmentPreview.vue` (or a small sibling) to render a `nodes`
attachment's sets per the chip-kinds + granularity rules above. New
`SINGLE_SET_NODE_EXPANSION_THRESHOLD = 4` constant (defined once, never inlined;
not the legacy `CHIP_BUNDLE_THRESHOLD`). Type icons; bundled-chip caret opens a
manually-closed node-name panel; `Collapse`/expand for overflow; name truncation
(reference legacy `truncatedName`, don't copy). Resource chips need a remove
path (today only binary-file chips are removable). Renders identically in the
draft composer and in already-sent history messages.

The real entry points don't exist until Phase 4, so this phase assumes the
composer already holds staged sets and only renders/exercises them. Component
tests mount the component with a `nodes` attachment fixture (or one staged via
Phase 2's `stageNodeSets()` in the test setup) and assert the chips. No trigger
of any kind is needed here.

Tests: the 8 plan cases (size-1 named; size-3 exploded/removable; ≥threshold
bundled; two-sets→two-chips-never-exploded guard; per-node remove; bundled
remove-whole-set; caret panel stays open until closed; draft == history render).

### Phase 4 — Trigger UI + open-pane + staged-draft primitive

Wires the real entry points to the now-working chip UI — the first place a
user-facing trigger appears.

- **Staged-draft primitive** (new, mirrors the existing
  `stashPendingFirstMessage`/`consume` localStorage pattern in
  `useInstanceAiHandoff`): `stashPendingDraftAttachment(threadId, sets)` /
  `consumePendingDraftAttachment(threadId)`. `InstanceAiThreadView` consumes it
  on mount into the composer draft **without sending**.
- **Context A** (inside thread): build (Phase 1) → `stageNodeSets` → composer
  picks up directly. Then ensure the composer ("Ask anything…" input,
  `InstanceAiInput.vue`) is visible and focused, reusing existing primitives in
  `InstanceAiThreadView.vue`: set `isPreviewExpanded.value = false` (a plain
  `ref`, already force-reset this way at lines 452/478 — un-expands the canvas
  if it was covering the chat) then `nextTick(() => chatInputRef.value?.focus())`
  (the exposed `focus()`, already called at lines 277/617). No new mechanism.
- **Context B** (standalone editor): build → mint/resolve thread →
  `stashPendingDraftAttachment` → navigate to `/assistant/:threadId` → thread
  view consumes into the draft, unsent.
- **Entry points**, all gated by `isFeatureEnabled(CANVAS_NODE_CONTEXT_FLAG)`:
  - new `N8nIconButton` in `CanvasSelectionToolbar.vue` (alongside group/extract,
    visible when `selectedNodeIds.length > 1` — the floating selection toolbar
    only appears for multi-selections, so single-node support comes via the
    context menu, not here); `⌘↵` shortcut, "Add N nodes to chat" tooltip.
  - a **new** `ContextMenuAction` in `useContextMenuItems.ts` +
    `onContextMenuAction` (do not touch legacy `focus_ai_on_selected`), shown for
    **1 or more** selected nodes (`nodes.length >= 1`) — this is the single-node
    path in the screenshots. **Count-aware label** via i18n `adjustToNumber`:
    "Add node to chat" (1) / "Add N nodes to chat" (N). `⌘↵` shortcut.

Tests: toolbar button visibility (flag on + >1 selected); context-menu item
presence by flag (legacy entry untouched); handler stages via Phase 2 and, when
in Context B, stashes + navigates; Context A stages directly without navigation
and calls `focus()` on the composer with `isPreviewExpanded` reset to `false`;
`stash`/`consume` round-trips a multi-set draft through localStorage and clears
after one consume. Then manually verify end-to-end in the running app against a
backend with the backend plan deployed: select nodes → trigger → chips → send →
chips survive a reload.

## Out of scope (this pass)

- Prompt-suggestion shortcut chips ("Explain this", etc.).
- Cross-workflow set merging (canvas is single-workflow at a time).
- Full handling of a node renamed/deleted between staging and send — best-effort
  only; deeper handling is a known later edge case.

## Shipping note

Frontend can merge/deploy before the backend is live; keep it behind
`CANVAS_NODE_CONTEXT_FLAG` in production until the backend
(PR #36039) is confirmed deployed, or the send will 400.
