# Hackmation ideas

Four ideas to prototype. Each is scoped as an independent, incremental
improvement — no dependency between them. Written up so any of them can be
picked up and continued across sessions without re-deriving context.

## 1. AI-generated publish description

**Problem:** The "publish workflow" modal requires the user to manually type
a description of what changed. In practice this field is either left empty
or filled with something low-effort ("fixes", "updates"), so the workflow
history/version list ends up with little useful information about what
actually changed between publishes.

**Idea:** Generate a draft description by diffing the current (draft)
workflow against the last published version, and having an LLM summarize
the meaningful changes (nodes added/removed/reconfigured, connections
changed, trigger changed, etc.) into a human-readable summary.

**Prior art / motivation:** A past team shipped something like this
(AI-drafted commit/PR-style descriptions from a diff) and it was one of the
more popular AI features in that product — low effort for the user, high
perceived value, and it's an easy "wow" moment. Worth treating as a
reasonably high-confidence bet, not just a experiment.

**UX open question:** auto-populate on modal open vs. explicit "Generate
with AI" button/CTA next to the field.
- Auto-populate is more magical but costs an LLM call on every modal open
  (including when the user was going to write their own description anyway),
  and risks feeling like it's putting words in the user's mouth.
- A button is cheaper (opt-in cost), more predictable, and matches patterns
  elsewhere in the product where AI assistance is invoked explicitly rather
  than run eagerly.
- Leaning towards the button for a first pass — auto-populate could be a
  fast-follow if usage data shows people always click it anyway.

**Relevant code to start from:**
- Publish modal:
  `packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowPublishModal.vue`
- Publish action/composable:
  `packages/frontend/editor-ui/src/app/composables/useWorkflowActivate.ts`
- Workflow history / version diffing context (for "what changed since last
  publish"):
  `packages/frontend/editor-ui/src/features/workflows/workflowHistory/`
- Existing pattern for calling out to an LLM from the editor-ui:
  `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.api.ts`
  and `instanceAi.store.ts` — check `packages/@n8n/instance-ai`'s `CLAUDE.md`
  for the backend architecture before building a new call path from scratch.

**Confirmed: how to make the actual LLM call.** Checked whether this should
reuse the Instance AI *sandbox* (Daytona / n8n-sandbox) — it should not. The
sandbox is specifically the isolated code-execution container used to
compile/validate TypeScript workflow-builder source
(`N8N_INSTANCE_AI_SANDBOX_ENABLED`, see
`packages/@n8n/instance-ai/docs/sandboxing.md`); pulling that in for a
single text-summarization call would be the wrong tool entirely.

What *should* be reused is a separate, lighter pattern already used twice in
the codebase for one-off completions that skip the whole
orchestrator/tool-loop/SSE-streaming machinery:
- Thread title generation —
  `packages/@n8n/instance-ai/src/memory/title-utils.ts` calling into
  `packages/@n8n/agents/src/runtime/memory/title-generation.ts`. Resolves a
  model, calls `generateText()` once, sanitizes output, fails soft (`null`
  on any error, never breaks the caller).
- Model connection verification —
  `packages/cli/src/modules/instance-ai/instance-ai-verification.service.ts:81-109`
  (`verifyModel`). The most minimal precedent, no thread/memory concept at
  all:
  ```ts
  const modelConfig = await this.modelService.resolveAgentModelConfig(user);
  const { createModel } = await import('@n8n/agents');
  const { generateText } = await import('ai');
  await generateText({
    model: createModel(modelConfig, createAiProxyFetch(this.outboundHttp)),
    prompt: '...',
  });
  ```

This second one is the closest shape for idea #1: a small dedicated method,
likely living beside `InstanceAiVerificationService` or on `InstanceAiService`
in `packages/cli/src/modules/instance-ai/` — not new logic inside the
`@n8n/instance-ai` core package, which is meant for the agent itself rather
than one-off adjacent features.

Two things this surfaces for the design:
- **Model resolution isn't a constant.** `InstanceAiModelService
  .resolveAgentModelConfig(user)` already picks between instance settings,
  per-user preference, env var fallback, and (on cloud) a proxy-routed model
  with its own token manager. Reusing it means this feature automatically
  respects whatever model/connection the instance has configured for
  Instance AI, instead of inventing a separate config path.
- **Availability gets tied to Instance AI being enabled** — there is no
  "just an LLM, no agent" credential path elsewhere in the codebase; every
  existing one-off call resolves its model through Instance AI. So this
  feature would only work when Instance AI is configured
  (`N8N_INSTANCE_AI_MODEL` set). That seems like the right tradeoff given the
  ask to reuse the existing mechanism, but it's a product decision to be
  explicit about, not an incidental side effect.

**Things to figure out before building:**
- What counts as a meaningful diff for summarization purposes — full JSON
  diff is noisy; probably want a semantic diff (nodes added/removed/renamed,
  parameter changes, connection changes) rather than raw JSON.
- Where the diff + summarization call should live: client-side (diff in the
  browser, call LLM) vs. a backend endpoint that does both. Backend probably
  makes more sense to keep the workflow JSON (which may include sensitive
  parameter values) out of a third-party LLM call path — and is also where
  `resolveAgentModelConfig` naturally lives.
- **Credit metering is unresolved.** Cloud/proxy-routed calls elsewhere get
  reported via `InstanceAiCreditService.claimRunUsage` so they count against
  the user's AI quota (see call sites in `instance-ai.service.ts`).
  `verifyModel` notably does *not* call it — need to establish why (maybe
  trivial pings are deliberately exempt) before deciding whether a
  publish-description generation call should be metered or free.
- i18n for any new UI copy (required per project conventions).

## 2. AI-generated sticky notes from selected nodes

**Problem:** Sticky notes are a common way to document sections of a
workflow, but they're entirely manual today — a user has to write the note
themselves. The only "AI writes a sticky note" path currently is going
through the AI agent/assistant chat, which is a big detour for something
that should be a lightweight, direct action on the canvas.

**Confirmed: Instance AI already has this capability, gated behind explicit
user request.** Checked this before assuming it'd need to be built from
scratch:
- `@n8n/workflow-sdk` (the DSL the builder writes workflow code against) has
  a `sticky()` node builder — sticky notes are a first-class node type the
  SDK/builder already understands (see the explicit sticky-note special-casing
  in `packages/@n8n/instance-ai/src/tools/workflows/preserve-node-positions.ts`
  and `classify-node-destructiveness.service.ts`).
- There's a dedicated lint rule, `SDK_UNSOLICITED_STICKY`
  (`packages/@n8n/workflow-sdk/src/lint/sdk/workflow-sdk-lint.ts:251-262`),
  that fires whenever generated builder code calls `sticky()` and blocks
  `build-workflow` until it's resolved. Its message: *"Do not add `sticky()`
  / stickyNote nodes unless the user explicitly asked for canvas notes. Put
  explanations in the chat reply instead."*
- The workflow-builder skill
  (`packages/@n8n/instance-ai/skills/workflow-builder/SKILL.md:471-477`) and
  the guardrails reference
  (`packages/@n8n/instance-ai/knowledge-base/reference/workflow-builder-guardrails.md:7-10`)
  both restate this as a standing constraint the agent must satisfy before
  saving a build.

So this is a deliberate product decision, not a gap: unsolicited sticky
notes were presumably judged as clutter/noise when the agent free-lances
them during normal workflow building. That doesn't block idea #2 — it
actually strengthens it. The "summarize selected nodes into a sticky note"
capability already exists and is proven inside Instance AI; what's missing
is a fast, *explicit* trigger for it that doesn't require typing a chat
prompt. A canvas context-menu entry is exactly that explicit ask — it sidesteps
the guardrail by construction (the user directly requested a note for these
nodes), and reuses the existing summarization behavior rather than
reinventing it. Worth checking whether there's an existing internal
tool/prompt path for "summarize these nodes into a sticky note" that the new
context-menu action could call directly, rather than building a fresh LLM
call from the frontend.

**Idea:** Add a new context-menu entry, directly below the existing "Add
sticky note" entry, that appears when one or more non-sticky nodes are
selected. Clicking it:
1. Reads the selected node(s) — their type(s), configured parameters, and
   how they connect to each other.
2. Calls an LLM to summarize what the selected nodes do, in the same
   register as a human-written sticky note (short, descriptive).
3. Creates a sticky note with that summary, positioned near the selected
   nodes (e.g. immediately above or behind the bounding box of the
   selection) rather than at a default canvas position.

**Relevant code to start from:**
- Context menu item registration (this is where `add_sticky` is defined —
  the new item should sit right below it, likely gated on the same
  "something other than only stickies is selected" condition already used
  nearby):
  `packages/frontend/editor-ui/src/features/shared/contextMenu/composables/useContextMenuItems.ts`
  (see `add_sticky` around line 423, and the selection-type checks around
  line 277).
- Context menu composable/state (for wiring up the new action and reading
  current selection):
  `packages/frontend/editor-ui/src/features/shared/contextMenu/composables/useContextMenu.ts`
- Sticky note node type / rendering, useful for understanding how sticky
  notes are created and positioned programmatically:
  `packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/nodes/render-types/CanvasNodeStickyNote.vue`
  and `CanvasNodeStickyColorSelector.vue`.
- Node selection / bounding box utilities: check `Canvas.vue` and
  `CanvasSelectionToolbar.vue` in
  `packages/frontend/editor-ui/src/features/workflows/canvas/components/`
  for existing selection-bounds logic (likely already computed for the
  selection toolbar's own positioning — reuse rather than reimplement).
- LLM call pattern: same Instance AI references as idea #1 above.

**Things to figure out before building:**
- Placement algorithm: needs to avoid overlapping existing nodes/stickies.
  Simplest first pass is probably "place above the selection's bounding box,
  sized to span its width," with collision-avoidance (nudge down/right if
  occupied) as a fast-follow rather than a blocker.
- What context to send the LLM: node type + display name + parameters is
  probably enough for a good first pass; probably don't need full
  credentials or resolved expression values (and shouldn't send credential
  values regardless).
- How this interacts with multi-node selections that span very different
  concerns (e.g. two unrelated branches) — one sticky per selection, or
  should it be smart about clustering? Start with one sticky for the whole
  selection; leave clustering as a future refinement if it comes up.
- Menu copy/i18n and where exactly it should sit relative to other
  selection-based context menu entries (copy/duplicate/etc.).

## 3. Data profiling for node output ("column stats")

**Status: not started.** Ideas #1 and #2 shipped on this branch
(publish-description generation, AI sticky notes). This one is a fresh
capture — no code written yet.

**Problem:** When a node's output is a list of items — the typical shape
for anything hitting an API or a database — the run-data panel (Table /
JSON / Schema tabs in the NDV) shows you the raw values but not the shape
of the data as a whole: how many distinct values a field takes, whether a
boolean is mostly `true`, what the spread of a numeric field looks like.
Today that requires exporting the data or eyeballing a JSON dump.

**Idea:** A "Profile" view (alongside the existing Table/JSON/Schema/Binary
tabs) that, once the item count crosses a threshold (e.g. >10), profiles
each scalar field it can find in the data:
- **Number:** frequency of each distinct value if the value set is small
  (e.g. a rating 1–5, an HTTP status code); a binned histogram otherwise
  (raw per-value frequency breaks down once values are mostly unique, e.g.
  prices or timestamps — the initial framing of "how often each number
  appears" only holds for low-cardinality numerics).
- **String:** if the field has up to ~10 distinct values across the whole
  dataset, show a frequency breakdown per value (a category/enum-like
  field). Above that, it's probably free text — cardinality alone is worth
  surfacing, but per-value frequency isn't useful.
- **Boolean:** true/false counts.

**The hard part is finding "the list to profile", not the profiling math.**
A node's output is always technically a list of items, but the
interesting list for profiling purposes might not be that top-level list:
- The top-level items themselves might already be the record set to
  profile (e.g. an HTTP Request node returning one n8n item per API
  record) — simplest case.
- The list of interest might be nested inside a single item's JSON (e.g.
  one item with `json.results = [...]`).
- The list of interest might be the *same field path repeated across every
  item* (e.g. every item has a `json.tags` array) — profiling this
  correctly means pooling values from that path across all items, not just
  looking at one item's local array.

Any real implementation has to walk the schema and decide which of these
patterns applies (possibly offering more than one candidate list to
profile when several exist), before the per-field stats logic even runs.

**Prior art already in the codebase — reuse before rebuilding:**
- **Schema detection.** `packages/frontend/editor-ui/src/app/composables/useDataSchema.ts`
  (`getSchema` / `getSchemaForExecutionData`) already walks execution data
  recursively — including through arrays and nested objects — merging keys
  across items into one representative shape (`Schema` tree of
  `{ type, value, path, key }`). It doesn't currently retain *all* the
  values at a path (it merges shape, not values), so profiling needs
  something that walks the same way but collects a value list per path
  instead of collapsing to one example — but the traversal/merge logic is
  the right starting point rather than writing array-walking from scratch.
  `VirtualSchema.vue` / `VirtualSchemaItem.vue` / `useDataSchema.ts`'s
  `useFlattenSchema()` render that tree today (the existing "Schema" tab).
- **View-mode tab switcher.** `IRunDataDisplayMode` in
  `packages/frontend/editor-ui/src/Interface.ts` is the closed set
  `'table' | 'json' | 'binary' | 'schema' | 'html' | 'ai'` — a `'profile'`
  member slots in alongside them. The tab UI itself is
  `packages/frontend/editor-ui/src/features/ndv/runData/components/RunDataDisplayModeSelect.vue`
  (conditionally adds tabs based on data shape, e.g. `binary` only when
  `hasBinaryData` — a `profile` tab would follow the same pattern, shown
  only when a profilable list is detected). `RunData.vue` is where each
  mode actually renders (`v-else-if="displayMode === 'schema'"` etc.,
  around line 1883) and where the already-loaded `inputData` /`jsonData`
  computeds live (~line 502-507) — the dataset a profile view would consume
  is already sitting in memory there, no new data fetch needed.
- **Aggregation vocabulary.** The `Summarize` node
  (`packages/nodes-base/nodes/Transform/Summarize/utils.ts`) already
  implements `count` / `countUnique` and friends as first-class concepts in
  the product — not directly reusable client-side (it runs server-side as
  part of workflow execution), but confirms this kind of aggregation
  already has an established shape/vocabulary in n8n rather than needing
  to be invented.
- **Charting.** `chart.js` + `vue-chartjs` are already dependencies of
  `editor-ui` and already used for real charts — see
  `packages/frontend/editor-ui/src/features/execution/insights/` (the
  Insights dashboard) and `app/plugins/chartjs.ts` for how Chart.js gets
  registered. Note only `LineController` is registered there today, not
  `BarController` — profiling's histograms/frequency bars would need that
  added. **When actually building the chart UI, load the `dataviz` skill
  first** (color palette, accessibility, chart-form guidance) rather than
  designing bars/histograms from scratch.

**Things to figure out before building:**
- **List-detection algorithm and its UX.** Concretely: walk the schema,
  find every array-typed path; for each, decide whether it's "the items
  list itself" or a nested/repeated field, and whether it clears the >10
  threshold once pooled across items. If more than one candidate list
  exists, does the user pick which one to profile (a dropdown), or do we
  show one profile block per candidate?
- **Numeric distinct-value cutoff for histogram vs. frequency table** —
  the doc above assumes a similar ~10-distinct-value cutoff to the string
  case, switching to binning above that, but the right cutoff and bin
  count need tuning against real data, not guessing.
- **Cardinality overflow for strings** — above ~10 distinct values, do we
  show nothing, just a count ("47 distinct values"), or top-N + "N
  others"?
- **Performance / data volume.** Run data can be thousands of items.
  Profiling should be computed lazily (only when the Profile tab is
  opened, not eagerly for every output pane) and probably capped/sampled
  for very large item counts — needs a concrete cap, not an assumption
  that it'll be fine.
- **Null/missing/mixed-type handling** — a field present on some items and
  absent on others, or typed inconsistently across items (string on one,
  number on another), needs a defined behavior before the type-dispatch
  logic can be written.
- i18n for any new UI copy (required per project conventions).

## 4. AI-generated node rename

**Status: not started.** Fresh capture, sibling to idea #2 — no code written
yet, but the sticky-note feature (see #2 above, now implemented on this
branch) is a working blueprint for the whole thing: same UI pattern (a
context-menu entry with the AI `sparkles` icon), same backend pattern (a
small service resolving the Instance AI model and doing one `generateText()`
call), same data shape sent to the LLM (node name/type/parameters).

**Problem:** Default node names (`HTTP Request1`, `HTTP Request2`, `IF1`, …)
carry no information about what a node actually does once its parameters are
configured. Renaming is manual today — the user has to look at the node's
configuration and think of a short, meaningful name themselves.

**Idea:** Add a new context-menu entry directly below the existing "Rename"
entry (single non-sticky node selected), using the same AI `sparkles` icon
as idea #2's "Generate sticky note" entry. Clicking it:
1. Reads the selected node — its type, current parameters, and disabled
   state, the same way idea #2's `onGenerateStickyNote` does via
   `workflowDocumentStore.value.getNodeById(nodeId)` (no need for
   connections/neighbors — unlike the sticky note case, this is about what
   the node itself does, not how it fits into a surrounding flow).
2. Calls an LLM to produce a very short, descriptive name (a few words, in
   the same register as a well-named node a human would write —
   `Filter active users`, not `This node filters the incoming user list to
   only include users who are active`).
3. Applies the name the same way a manual rename does, so undo/history and
   name-uniqueness handling stay identical to typing a name in by hand.

**Relevant code to start from:**
- Context menu item registration — the existing `rename` entry
  (`packages/frontend/editor-ui/src/features/shared/contextMenu/composables/useContextMenuItems.ts:543-549`,
  single-node, non-sticky, gated on `isReadOnly`) is exactly where the new
  entry should be inserted below. Idea #2's `generate_sticky_note` entry
  (same file, ~line 335, gated on `!onlyStickies && instanceAi.value`) is
  the closest precedent for wiring a *new* AI action into this same menu —
  reuse its `instanceAi.value` gate and `icon: 'sparkles'` styling for the
  new `auto_rename` (or similar) entry. Add the new id to the
  `ContextMenuAction` union at the top of the file alongside `rename` /
  `generate_sticky_note`.
- Action dispatch — context menu actions are switched on in
  `packages/frontend/editor-ui/src/features/workflows/canvas/components/Canvas.vue`.
  `case 'rename'` (line 1476) emits `update:node:name`, handled in
  `NodeView.vue` (`onOpenRenameNodeModal`, wired at `NodeView.vue:2093`),
  which calls `renameNode(currentName, newName, opts)` from
  `packages/frontend/editor-ui/src/app/composables/useCanvasOperations.ts:420`
  — this is the function an auto-rename action should call directly with
  the LLM-generated name (skipping the modal/prompt), the same way
  `case 'generate_sticky_note'` (`Canvas.vue:1529`) emits
  `generate:sticky-note`, handled in `NodeView.vue` around line 1097, which
  calls `workflowsStore.generateStickyNoteContent(...)`.
- LLM call pattern — reuse idea #2's plumbing wholesale rather than
  reinventing it:
  - Frontend store method:
    `packages/frontend/editor-ui/src/app/stores/workflows.store.ts:389`
    (`generateStickyNoteContent`) takes
    `Array<Pick<INodeUi, 'name' | 'type' | 'disabled' | 'parameters'>>` and
    POSTs to `/workflows/:id/generate-sticky-note`. An equivalent
    `generateNodeName(id, node)` would POST a single node to a new
    `/workflows/:id/generate-node-name` endpoint with the same node shape.
  - Backend controller:
    `packages/cli/src/workflows/workflows.controller.ts:564-572`
    (`generateStickyNote`, `@ProjectScope('workflow:read')`) — add a sibling
    endpoint the same way.
  - Backend service — `WorkflowStickyNoteService.generateContent`
    (`packages/cli/src/workflows/workflow-sticky-note.service.ts`) is the
    exact template: resolves the model via
    `InstanceAiModelService.resolveAgentModelConfig(user)`, builds a prompt
    from `node.name` / `node.type` / `node.disabled` /
    `JSON.stringify(node.parameters)`, calls `generateText()` with a token
    cap (`400` for the sticky note; a rename needs far fewer — a handful of
    words) and a timeout (`30_000`ms), fails via `OperationalError` if the
    model returns nothing. A `WorkflowNodeRenameService` (or a method on the
    sticky note service, if it gets renamed to something more general) can
    copy this structure almost verbatim, swapping the prompt.
  - DTO: `packages/@n8n/api-types/src/dto/workflows/generate-sticky-note.dto.ts`
    (`GenerateStickyNoteDto`) is the shape to mirror for a
    `GenerateNodeNameDto`.

**Things to figure out before building:**
- **Output constraints.** Node names have display/width constraints on the
  canvas — the prompt should push for something short (a handful of words)
  and the response probably needs trimming/truncation as a safety net rather
  than trusting the model to always stay brief.
- **Name uniqueness.** n8n auto-suffixes duplicate node names
  (`HTTP Request`, `HTTP Request1`, …) — confirm whatever `renameNode` does
  today for a manually-typed duplicate name also fires correctly when the
  name comes from the LLM instead of a text input, so two auto-renamed nodes
  of the same type don't collide silently.
- **Multi-node selection.** Idea #2 explicitly supports multi-select;
  renaming is inherently a single-node action (`rename` itself is only
  offered in `singleNodeActions`, not the multi-select action list) — should
  the new menu item simply not appear when more than one node is selected,
  matching `rename`'s own gating, or would a "batch rename" one-call-per-node
  version be worth offering as a fast-follow?
- **Sensitive parameter values.** Same caveat as idea #2: node parameters may
  contain values that shouldn't be sent to an LLM verbatim (e.g. anything
  resolved from credentials) — needs the same scrubbing/allow-list thinking
  before wiring the real prompt, not just "send `node.parameters` as-is"
  because that's what the sticky note code currently does.
- Menu copy/i18n for the new entry label.

## Status

All four ideas are documented. Ideas #1 and #2 are implemented on this
branch. Ideas #3 and #4 are pre-implementation — no code written yet. This
doc exists so any of them can be picked up in a later session without
re-deriving the above context.
