# Empty Node Groups — Prototype Alignment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the empty-node-groups POC in line with the design prototypes: an empty group shows an EMPTY badge, title, description placeholder, a center "+" that opens node search to fill it, and a description editor with Save and Build. Build the real add-node-into-group path so a group can be filled by hand, not only by AI. Keep the connection-inheritance behavior the prototypes show.

**Architecture:** Unchanged from the POC (approach B). An empty group is a normal node group whose only member is a hidden no-op `groupPlaceholder` node, rendered as a chip. Filling a group replaces the placeholder with real nodes and hands the placeholder's boundary connections to the section entry and exit. This plan is UI and interaction work on top of that model. No backend, validator, or DB change.

**Tech Stack:** Vue 3, VueFlow, Pinia, Vitest. Frontend only.

**Spec:** The prototype frames shared in conversation (empty group at rest with EMPTY badge / "+" / description; description editor with Save + Build; filled group inheriting connections; Start → Middle → End where Middle is generated and Start/End stay empty). Plus the design comparison at https://claude.ai/code/artifact/cd467833-505c-4944-bec6-e1cc3d67bf13 (approach B, with the build-status section).

## Current state (already built and verified live on branch feat/empty-node-groups-poc)

- Placeholder node type `n8n-nodes-base.groupPlaceholder`, hidden from the node creator, forwards items.
- Store helpers `isEmptyGroup(groupId)` / `getEmptyGroupPlaceholder(groupId)`.
- Empty group renders as a chip; placeholder node hidden.
- Chip handles are visible and grabbable (`handleConnectable` class); connections translate onto the placeholder. Verified: node → group and group → group both land on the placeholder as real connections.
- "Add empty group" context-menu action; rename via modal; description stored (cap 1000).
- Delete last real node → group returns to empty (placeholder re-inserted, boundary connections kept). Undo is clean.
- Description always shown on any collapsed group that has one (empty or filled).
- Mock Generate: when the AI builder is disabled, the sparkles button drops Extract → Transform → Load into the group and moves the boundary connections onto the first and last. Real builder path used when AI is enabled. Verified: connection inheritance works (upstream edge reattaches to the section entry).
- Collapse / expand works on a filled group (normal chevron).

## Global Constraints

- Always use `pnpm`; run tests from the package directory.
- No `any`; no `as` outside tests.
- All UI text through `@n8n/i18n` (`en.json`).
- CSS: semantic tokens from `@n8n/design-system`, never hardcoded px for spacing/colors. Use the `n8n:design-system` skill when reviewing `.vue`/SCSS.
- Icons: keys from `updatedIconSet` only (`@n8n/design-system/.../icons.ts`).
- Mark deliberate shortcuts with a `// ponytail:` comment naming the upgrade path.
- Do not regress normal (non-empty) groups: every change is gated on `isEmptyGroup` or on "has a description".

## File map

| File | Responsibility |
|---|---|
| `.../canvas/components/elements/groups/CanvasNodeGroupTitleBar.vue` | EMPTY badge, dashed border on empty, center "+", description editor Save/Build buttons, new emits. |
| `.../canvas/canvas.types.ts` | (if needed) any new field on `CanvasGroupNodeData`. |
| `packages/cli`/editor `app/views/NodeView.vue` | Handle `add-node` and `build` emits; open node creator scoped to the group; wire generate. |
| `app/composables/useCanvasOperations.ts` | `fillEmptyGroupWithNode(groupId, newNodeId)`: replace placeholder, hand over connections, keep group. |
| `features/shared/nodeCreator/nodeCreator.store.ts` (read only) | Reuse `openNodeCreatorForConnectingNode` / an add-into-group entry. |
| `@n8n/i18n/src/locales/en.json` | New strings: EMPTY badge, "Add a description...", Save, Build, "+" aria-label. |
| Scratchpad `empty-node-groups.html` | Keep the build-status section current (done outside this plan's tasks as work lands). |

---

### Task 1: EMPTY badge and dashed border on an empty group chip

**Files:**
- Modify: `CanvasNodeGroupTitleBar.vue` (template near the collapsed header ~line 520; styles near `.wrapper.collapsed`)
- Modify: `@n8n/i18n/src/locales/en.json`
- Test: `CanvasNodeGroupTitleBar.test.ts`

**Interfaces:**
- Consumes: `isEmptyGroup` computed (already present).
- Produces: an `EMPTY` badge element with `data-test-id="canvas-node-group-empty-badge"`, shown only when `isEmptyGroup`.

- [ ] **Step 1: i18n**

```json
"canvas.nodeGroup.emptyBadge": "Empty",
```

- [ ] **Step 2: Failing test** — assert the badge renders when `data.isEmptyGroup` is true and is absent when false. Reuse the file's group fixture.

- [ ] **Step 3: Template + style** — add the badge in the collapsed header row, right-aligned:

```vue
<span v-if="isEmptyGroup" :class="$style.emptyBadge" data-test-id="canvas-node-group-empty-badge">
  {{ i18n.baseText('canvas.nodeGroup.emptyBadge') }}
</span>
```

Style with tokens (uppercase, letter-spaced, muted):

```scss
.emptyBadge {
  font-size: var(--font-size--3xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color--text--tint-1);
}
```

The dashed border already exists for empty groups via `canvas-node-border(dashed)` — confirm it applies to the empty chip; if the empty chip currently renders solid, add the dashed border under a `.wrapper.collapsed` + empty selector. (The empty group is force-collapsed, so gate on `isEmptyGroup`, not just collapsed.)

- [ ] **Step 4: Run test, typecheck, lint. Commit** `feat(editor): Show EMPTY badge on empty group chips`.

---

### Task 2: Center "+" that opens node search to fill the group

**Files:**
- Modify: `CanvasNodeGroupTitleBar.vue` (add the "+" button in the chip body; new emit `add-node`)
- Modify: `Canvas.vue` (forward emit) and `NodeView.vue` (handler)
- Modify: `useCanvasOperations.ts` (add `fillEmptyGroupWithNode`)
- Modify: `en.json`
- Test: `useCanvasOperations.test.ts`

**Interfaces:**
- Consumes: `getEmptyGroupPlaceholder`, `replaceNodeInGroup` (store, exists at useCanvasOperations.ts:901 pattern), `nodeCreatorStore.openNodeCreatorForConnectingNode`, `mapConnectionsByDestination`.
- Produces:
  - Title bar emit `add-node: [groupId: string]`.
  - Canvas emit `add-node-to-group: [groupId: string]`.
  - `fillEmptyGroupWithNode(groupId: string, newNodeId: string): void` in useCanvasOperations — replaces the placeholder with an existing node id, moving the placeholder's main boundary connections onto the new node (in on index 0, out on index 0), then removes the placeholder. Group membership preserved.

- [ ] **Step 1: i18n**

```json
"canvas.nodeGroup.addNode": "Add a node",
```

- [ ] **Step 2: Button** — in `CanvasNodeGroupTitleBar.vue`, render a centered "+" button in the chip body, only for empty groups, `data-test-id="canvas-node-group-add-node"`, emitting `add-node` with the group id. Use `N8nIconButton` with `icon="plus"`.

- [ ] **Step 3: `fillEmptyGroupWithNode`** — write the failing test first (group with placeholder + upstream/downstream edges; call fill with a new node id; assert the new node is the sole member, placeholder gone, and the boundary edges now attach to the new node). Then implement, reusing the connection-move logic from `replaceLastGroupMemberWithPlaceholder` (its inverse). Wrap in a history bulk.

- [ ] **Step 4: Wire the node creator** — in `NodeView.vue`, on `add-node-to-group`, open the node creator scoped so the chosen node is added and then passed to `fillEmptyGroupWithNode`. Reuse `openNodeCreatorForConnectingNode` where the placeholder acts as the connecting node, or add nodes then call fill. Match how the "+" endpoint on a node opens the creator (NodeView.vue:808).

- [ ] **Step 5: Manual + unit verify.** Commit `feat(editor): Fill an empty group with a node from the plus button`.

---

### Task 3: Description editor with Save and Build

**Files:**
- Modify: `CanvasNodeGroupTitleBar.vue` (description editor actions ~line 674 `descriptionPanelActions`)
- Modify: `NodeView.vue` (build handler)
- Modify: `en.json`
- Test: `CanvasNodeGroupTitleBar.test.ts`

**Interfaces:**
- Consumes: existing `isEditingDescription`, `onDescriptionUpdate`, the `generate` emit (already wired to `onGenerateGroup` / mock).
- Produces: in the description editor, a **Save** button (commits the text, closes the editor) and a **Build** button (saves the text, then emits `generate`). Build = save + generate.

- [ ] **Step 1: i18n**

```json
"canvas.nodeGroup.saveDescription": "Save",
"canvas.nodeGroup.build": "Build",
```

- [ ] **Step 2: Failing test** — editing an empty group's description shows Save and Build; clicking Build emits `update:description` with the typed text AND `generate` with the group id; clicking Save emits only `update:description`.

- [ ] **Step 3: Template** — in `descriptionPanelActions`, when editing, render Save (default) and Build (sparkles icon). Build calls a handler that emits `update:description` then `generate`. Keep the existing separate toolbar sparkle OR remove it in favor of Build-in-editor — the prototype shows Build in the description editor, so remove the standalone toolbar generate button for empty groups to avoid two Build affordances. (Leave the toolbar sparkle logic for non-empty groups untouched.)

- [ ] **Step 4: Build handler in NodeView** — `onBuildGroup(groupId)` just calls the existing `onGenerateGroup(groupId)` (which already does save-independent generation; the description is already saved by the emit). No new generation logic.

- [ ] **Step 5: Test, typecheck, lint. Commit** `feat(editor): Add Save and Build to the empty group description editor`.

---

### Task 4: Verify connection inheritance against the Start → Middle → End scenario

**Files:**
- Test only: extend `useCanvasOperations.test.ts` (or a focused test) to lock the inheritance contract.

**Interfaces:**
- Consumes: `fillEmptyGroupWithNode` (Task 2), mock/real generate (existing).

- [ ] **Step 1: Test** — three empty groups chained Start → Middle → End (placeholder-to-placeholder connections). Fill Middle with a node (Task 2 path). Assert: Start's outgoing edge now targets Middle's node; Middle's node outgoing edge targets End's placeholder; Start and End remain empty groups; no dangling placeholder edges. This is the exact prototype behavior.

- [ ] **Step 2: Run, typecheck. Commit** `test(editor): Lock empty group connection inheritance on fill`.

---

## Self-review checklist

- Every new affordance is gated on `isEmptyGroup` (or "has description" for the collapsed description) — no regression to normal groups.
- No standalone Build button AND editor Build button both showing on an empty group.
- `fillEmptyGroupWithNode` mirrors `replaceLastGroupMemberWithPlaceholder` and is history-wrapped.
- i18n keys added; no hardcoded UI strings.
- Tokens used for all new CSS.

## Known gaps left after this plan

- Drag-drop of an existing on-canvas node into a group (this plan does the "+" node-creator path and keeps drop-onto-handle; free-drag-into-frame is separate).
- The real Instance AI generation tool (still a prompt / mock).
- Nesting (`parentId`), triggers-in-groups validator relaxation, publish-time warning, hiding placeholders from logs/telemetry — all deferred from the original POC.
- Decision still open per user: keep the dedicated `groupPlaceholder` node type vs reuse No-Op + an `isEmpty` flag on the group.
