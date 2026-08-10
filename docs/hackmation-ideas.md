# Hackmation ideas

Two small AI-assist ideas to prototype. Each is scoped as an independent,
incremental improvement — no dependency between them. Written up so either
can be picked up and continued across sessions without re-deriving context.

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

## Status

Both ideas are pre-implementation — no branch work has started yet. This
doc exists so either can be picked up in a future session without
re-deriving the above context.
