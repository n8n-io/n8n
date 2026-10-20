---
name: planned-task-runtime
description: >-
  Handles system follow-up turns: planned-task-follow-up (synthesize, replan,
  build-workflow, checkpoint), background-task-completed, running-tasks
  context, workflow_builder_create_tasks silence rules. Load whenever any of
  these tags appear or after calling workflow_builder_create_tasks.
recommended_tools:
  - workflow_builder_create_tasks
  - workflow_builder_complete_checkpoint
  - workflow_builder_build_workflow
  - workflow_builder_task_control
  - workflow_builder_workflows
  - workflow_builder_verify_built_workflow
  - workflow_builder_executions
---
# Planned Task Runtime

Load skill when current message contains `<planned-task-follow-up>`,
`<background-task-completed>`, `<running-tasks>`, or right after calling
`workflow_builder_create_tasks`. Before calling `workflow_builder_create_tasks`, load via `load_tool` if not visible (search "create tasks" if needed).

## Silence after spawning tasks

**After calling `workflow_builder_create_tasks`**: write no text. Task card or approval card shows user what built/done; restating redundant. Do NOT summarize plan, list credentials, describe agent work, or add status details. Progress already visible real time.

When `workflow_builder_create_tasks` returns after approval, tasks already running. No summary or status text — user approved plan, checklist shows progress. Wait for `<planned-task-follow-up>`; no invented synthetic follow-up turns.

## Never poll

**Never poll, never sleep.** Background tasks settle via
`<planned-task-follow-up>` turns arriving automatically when work finishes.
After spawn or acknowledge, end turn. Do not call
`workflow_builder_workflows(action="list")`, `workflow_builder_executions(action="list")`, or any shell command to check progress — follow-up turn arrives moment task settles.
Task looks stuck → tell user and stop; no self-detecting completion. Do not re-dispatch build whose task ID already visible in
`<running-tasks>`.

When `<running-tasks>` context present, use only to reference active task IDs for cancellation or corrections.

User sends correction while build running → call
`workflow_builder_task_control(action="correct-task")` with task ID and correction.

## Synthesize follow-up

When `<planned-task-follow-up type="synthesize">` present, all planned tasks succeeded and unsettled runtime verification obligations already handled. Before final message, inspect workflow task outcomes:
workflow still has `verificationReadiness.status === "needs_setup"` → call
`workflow_builder_workflows(action="setup")` for that workflowId; has
`verificationReadiness.status === "not_verifiable"` → include readiness guidance as clear warning/manual-test note, do not call it verified. Verified workflow drafts = finished deliverables, ready to use. If original user request explicitly asked to run/execute workflow after build, call `workflow_builder_executions(action="run")` once for built workflow; checkpoint verification not satisfy user-requested run. Otherwise write concise completion message naming each delivered artifact (data tables, workflows) and summarizing what it does, using user's time zone for scheduled timings. No hedging like "ready to go live" or "let me know when you're ready" — work done. Any workflow unpublished → state plainly as one-line next-step note ("Publish when you want it live —
you can do that from the workflow editor."), not gating condition. No new plan.

## Replan follow-up

When `<planned-task-follow-up type="replan">` present, planned task failed, graph in `awaiting_replan`. MUST act this same turn —
handle single simple task directly (matching tool: `workflow_builder_build_workflow`,
`data_tables`, etc.), load `workflow_builder_create_tasks` via `load_tool` if needed and call
`workflow_builder_create_tasks` with
`planningContext.source: "replan"` for multiple dependent tasks, or explain blocker to user if nothing sensible remains. Do NOT reply with acknowledgement or status update alone — scheduler fires no further follow-up until you act; thread silently stalls.

Replan routing (no re-plan from scratch):

- One simple task remains (single data-table op, credential setup, single-workflow patch) → handle directly with matching tool.
- Multiple dependent tasks need scheduling → load `workflow_builder_create_tasks` via
  `load_tool` if needed, then call `workflow_builder_create_tasks` with
  `planningContext.source: "replan"`.
- Nothing sensible remains → explain blocker to user.

## Build-workflow follow-up

When `<planned-task-follow-up type="build-workflow">` present, load
`workflow-builder` skill and build exactly `buildTask` in payload. If
`buildTask.workflowId` present, update that workflow; else create new. If `buildTask.isSupportingWorkflow === true`, pass `isSupportingWorkflow:
true` to `workflow_builder_build_workflow`; saved supporting workflow is task's final deliverable. Save with `workflow_builder_build_workflow`, stop after successful save — no verify, credential setup, publish, `workflow_builder_complete_checkpoint` call, new plan, or user-facing message. If `workflow_builder_build_workflow` returns fixable validation errors, patch same turn and save again. Build blocked → explain blocker briefly; planned task finalizer marks task failed.

## Checkpoint follow-up

When `<planned-task-follow-up type="checkpoint">` present, block contains exactly one checkpoint task (`checkpoint.id`, `checkpoint.title`,
`checkpoint.instructions`, and `checkpoint.dependsOn` — prior task outcomes, incl. workflow build outcomes with `outcome.workItemId` /
`outcome.workflowId`). **Always require structured verification evidence —
never trust builder prose.** Before completing checkpoint, inspect each dependent persisted workflow with `workflow_builder_workflows(action="get-as-code", workflowId)` or bound workspace source file, compare actual graph to build task and checkpoint goal. Build/save success not proof of workflow quality. Saved workflow only draft, lacks requested outcome, or weak verification evidence → patch same workflow this checkpoint turn and re-read/re-verify. If dependency outcome has successful `outcome.verification` tool evidence (`attempted: true`,
`success: true`, an `executionId`, and executed-node evidence) and persisted-workflow inspection agrees requested outcome present, use that evidence without re-running verification. Otherwise execute
`checkpoint.instructions` with tools — typically `workflow_builder_verify_built_workflow`
with workflow ID and, when available, work item ID from build outcome. Use `fixtureOverrides` for alternate deterministic scenarios. Use
`workflow_builder_executions(action="run")` only for workflow not built through workflow loop or when user explicitly requested live run. Verification succeeds and any verified workflow dependency outcome has
`outcome.setupRequirement.status === "required"` → call
`workflow_builder_workflows(action="setup")` with that workflowId before `workflow_builder_complete_checkpoint`;
inline setup card appears automatically in n8n Assistant panel, so do not tell user to open editor, use canvas, or click Setup button. Setup returns `deferred: true`, or reports `skippedByUser` → respect it, still complete checkpoint with result saying setup deferred — never call setup again for credential user skipped. Do not call
`workflow_builder_credentials(action="setup")` or `workflow_builder_apply_workflow_credentials` for workflow setup. Then call `workflow_builder_complete_checkpoint(taskId, status, result)` **exactly once**
to report outcome (`status: "succeeded"` on pass, `"failed"` on verification failure). No new plan, no user-facing message — checkpoint card in plan checklist is user-visible surface. End turn as soon as `workflow_builder_complete_checkpoint` returns.

**If verification surfaced bug patchable in place** (e.g., Code-node shape issue), load `workflow-builder` skill and call `workflow_builder_build_workflow`
directly this checkpoint turn, passing existing `workflowId` and dependency `workItemId`. Then re-verify same checkpoint turn. Keep patch count small: issue not narrowed within two rounds → call
`workflow_builder_complete_checkpoint(status="failed", error=...)` with summary of what remains, let replan take over.

## Background task completed

When `<background-task-completed>` present, detached background task finished. `result` field holds task's authoritative summary of what actually done. **When writing user-facing recap, take factual details —
model IDs, node names, resource IDs, parameter values — directly from this
`result` text.** No substituting values from conversation history or training priors: if `result` says `gpt-5.4-mini`, write `gpt-5.4-mini`, not "GPT-4o
mini" or other name associated with provider. Task spec describes intent; `result` describes what actually happened.