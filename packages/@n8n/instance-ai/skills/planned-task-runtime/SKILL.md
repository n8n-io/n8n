---
name: planned-task-runtime
description: >-
  Handles system follow-up turns: planned-task-follow-up (synthesize, replan,
  build-workflow, checkpoint), background-task-completed, running-tasks context,
  and create-tasks silence rules. Load whenever any of these tags appear or
  after calling create-tasks.
recommended_tools:
  - create-tasks
  - complete-checkpoint
  - build-workflow
  - task-control
  - workflows
  - verify-built-workflow
  - executions
---

# Planned Task Runtime

Load this skill when the current message contains `<planned-task-follow-up>`,
`<background-task-completed>`, `<running-tasks>`, or immediately after calling
`create-tasks`. Before calling `create-tasks`, load it via `load_tool` if it is
not already visible (search "create tasks" if needed).

## Silence after spawning tasks

**After calling `create-tasks`**: do not write any text. The task card or approval card shows the
user what's being built or done; restating it is redundant. Do NOT summarize the
plan, list credentials, describe what the agent will do, or add status details.
Progress is already visible to the user in real time.

When `create-tasks` returns after approval, tasks are already running. Do not
summarize or add status text — the user already approved the plan and the
checklist shows progress. Wait for `<planned-task-follow-up>` to arrive; do not
invent synthetic follow-up turns.

## Never poll

**Never poll and never sleep.** Background tasks settle via
`<planned-task-follow-up>` turns that arrive automatically when work finishes.
After you spawn or acknowledge one, end your turn. Do not call
`workflows(action="list")`, `executions(action="list")`, or any shell command
to check progress — you will receive a follow-up turn the moment the task settles.
If a task appears stuck, tell the user and stop; do not try to detect completion
yourself. Do not re-dispatch a build whose task ID is already visible in
`<running-tasks>`.

When `<running-tasks>` context is present, use it only to reference active task
IDs for cancellation or corrections.

If the user sends a correction while a build is running, call
`task-control(action="correct-task")` with the task ID and correction.

## Synthesize follow-up

When `<planned-task-follow-up type="synthesize">` is present, all planned tasks
completed successfully and any unsettled runtime verification obligations have
already been handled. Before the final message, inspect workflow task outcomes:
if a workflow still has `verificationReadiness.status === "needs_setup"`, call
`workflows(action="setup")` for that workflowId; if it has
`verificationReadiness.status === "not_verifiable"`, include the readiness
guidance as a clear warning/manual-test note and do not call it verified. Treat
the synthesis tag as task completion, not proof that every integration works.
Apply the shared evidence contract to each workflow's current outcome. Name
simulated steps, untested required paths, missing setup, and unpublished state.
If the original user request explicitly asked to run the workflow, use the
supported live-run route and its approval flow. Otherwise report the delivered
artifacts and the scope checked. Use the user's time zone for schedules. Do not
create another plan or offer publication before the post-build publication
condition is met.

## Replan follow-up

When `<planned-task-follow-up type="replan">` is present, a planned task failed
and the graph is in `awaiting_replan`. You MUST take action in this same turn —
handle a single simple task directly (matching tool: `build-workflow`,
`data-tables`, etc.), load `create-tasks` via `load_tool` if needed and call
`create-tasks` with
`planningContext.source: "replan"` for multiple dependent tasks, or explain the
blocker to the user if nothing sensible remains. Do NOT reply with an
acknowledgement or status update alone — the scheduler will not fire another
follow-up until you act, and the thread will silently stall.

Replan routing (do not re-plan from scratch):

- One simple task remains (single data-table op, credential setup, single-workflow
  patch) → handle directly with the matching tool.
- Multiple dependent tasks still need scheduling → load `create-tasks` via
  `load_tool` if needed, then call `create-tasks` with
  `planningContext.source: "replan"`.
- Nothing sensible remains → explain the blocker to the user.

## Build-workflow follow-up

When `<planned-task-follow-up type="build-workflow">` is present, load the
`workflow-builder` skill and build exactly the `buildTask` in the payload. If
`buildTask.workflowId` is present, update that workflow; otherwise create a new
one. If `buildTask.isSupportingWorkflow === true`, pass `isSupportingWorkflow:
true` to `build-workflow`; that saved supporting workflow is the task's final
deliverable. Save with `build-workflow` and stop after a successful save — do not
verify, set up credentials, publish, call `complete-checkpoint`, create a new
plan, or write a user-facing message. If `build-workflow` returns fixable
validation errors, patch in the same turn and save again. If the build is
blocked, explain the blocker briefly; the planned task finalizer will mark the
task failed.

## Checkpoint follow-up

When `<planned-task-follow-up type="checkpoint">` is present, the block contains
exactly one checkpoint task (`checkpoint.id`, `checkpoint.title`,
`checkpoint.instructions`, and `checkpoint.dependsOn` — the outcomes of prior
tasks, including workflow build outcomes with their `outcome.workItemId` /
`outcome.workflowId`). **Always require structured verification evidence —
never trust builder prose.** Before completing the checkpoint, inspect each
dependent persisted workflow with `workflows(action="get-as-code", workflowId)` or
the bound workspace source file, and compare the actual graph to the build task
and checkpoint goal. Build/save
success is not proof of workflow quality. If the saved workflow is only a draft,
lacks the requested outcome, or verification evidence is weak, patch the same
workflow in this checkpoint turn and re-read/re-verify it. If a dependency outcome
contains successful `outcome.verification` tool evidence (`attempted: true`,
`success: true`, an `executionId`, and executed-node evidence) and your
persisted-workflow inspection agrees the requested outcome is present, use that
evidence without re-running verification only when it covers the current
material changes and the claimed paths. Otherwise execute
`checkpoint.instructions` using your tools — typically `verify-built-workflow`
with the workflow ID and, when available, the work item ID from the build
outcome. Use `fixtureOverrides` for alternate deterministic scenarios. Use
`executions(action="run")` only for a workflow that was not built through the
workflow loop or when the user explicitly requested a live run. If verification
succeeds and any verified workflow dependency outcome has
`outcome.setupRequirement.status === "required"`, call
`workflows(action="setup")` with that workflowId before `complete-checkpoint`;
the inline setup card appears automatically in the AI Assistant panel, so do not
tell the user to open the editor, use the canvas, or click a Setup button. If
setup returns `deferred: true`, or reports `skippedByUser`, respect it and still
complete the checkpoint with a result that says setup was deferred — never call
setup again for a credential the user skipped. Do not call
`credentials(action="setup")` or `apply-workflow-credentials` for workflow
setup. Then call `complete-checkpoint(taskId, status, result)` **exactly once**
to report the outcome (`status: "succeeded"` on pass, `"failed"` on a verification
failure). Do not create a new plan, do not write a user-facing message — the
checkpoint card in the plan checklist is the user-visible surface. End your turn
as soon as `complete-checkpoint` returns.

**If your verification surfaced a bug you can patch in place** (e.g., a Code-node
shape issue), load the `workflow-builder` skill and call `build-workflow`
directly during this checkpoint turn, passing the existing `workflowId` and the
dependency `workItemId`. Then re-verify in the same checkpoint turn. Keep the
patch count small: if the issue cannot be narrowed within two rounds, call
`complete-checkpoint(status="failed", error=...)` with a summary of what remains
and let replan take over.

## Background task completed

When `<background-task-completed>` is present, a detached background task
finished (for example eval setup). The `result` field holds the task's
report of the task outcome. Check its claims against available structured
results. **When you write the user-facing recap, take reported details —
model IDs, node names, resource IDs, parameter values — directly from this
`result` text.** Do not substitute values from conversation history or training
priors: if the `result` says `gpt-5.4-mini`, write `gpt-5.4-mini`, not "GPT-4o
mini" or any other name you associate with the provider. The task spec describes
intent; the `result` reports what happened. Do not promote unsupported prose
to verified completion.
