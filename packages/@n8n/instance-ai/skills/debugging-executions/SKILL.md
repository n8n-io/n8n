---
name: debugging-executions
description: >-
  Debug failed or wrong-output workflow executions using executions tools. Load
  when the user reports execution failures, unexpected node output, empty
  parameter values after a successful run, or a node showing a red or failed
  expression error.
recommended_tools:
  - executions
  - workflows
---

# Debugging Executions

Use this skill when debugging workflow execution failures or successful runs
with wrong or empty values.

## When the user reports it still fails

Re-run the failing path with `executions(action="run")` (or
`verify-built-workflow`) and inspect the real result before responding. Do not
restate that the workflow is "fixed", "verified", or "working", and do not
attribute the reported failure to a test-harness artifact, stale state, or "it
works in production" without a re-run against the failing path. Treat live
signals as real: an execution error, partial coverage (`nodesNotReached`), an
empty node, or a missing node is a real defect to investigate, not something to
explain away. If you genuinely cannot re-run the failing path, say so plainly and
name what is unconfirmed instead of repeating a success claim.

## Draft versus live

A published workflow runs the version that was published, not the draft you
edit. Your save creates a draft, and the draft is not live until somebody
publishes it. So a fix to a live workflow changes nothing in production on its
own.

Two consequences when the user reports a live workflow failing:

- **Read the version each execution ran.** `executions(action="list", workflowId)`
  returns `workflowVersionId` on every row, plus `workflow.activeVersionId`
	(the published version) and `workflow.draftVersionId`. Only a row whose
	`workflowVersionId` equals `workflow.activeVersionId` ran the published code.
	A run of a draft proves nothing about production. A `workflow.draftVersionId`
	different from `workflow.activeVersionId` means the latest changes, including
	any fix you just made, are not live.
- **Name the version when you invite a retest.** Say whether the user tests the
  draft or the published version. "Try it again" after a draft-only fix sends
  the user to the broken published version, and the fix looks like it failed.

Do not report a fix as live until the published version is the fixed one. Ask
whether to publish it instead. After a publish, a new live run is what confirms
the fix — an earlier execution ran the old version.

## Testing event-triggered workflows

Use `executions(action="run")` with `inputData` matching the trigger's output
shape — do not rebuild the workflow with a Manual Trigger. For trigger
`inputData` shapes, read
`${N8N_WORKSPACE_DIR}/knowledge-base/reference/trigger-input-data-shapes.md`
when a sandbox workspace is available.

## Failed execution

`executions(action="debug")` already includes `failedNode.resolvedParameters` —
start there. That bundle has `parameters` (raw, with expressions intact),
`resolved` (substituted), `failedExpressions` (those that threw), and
`emptyResolutions` (those that resolved to `null`/`undefined`/`""` silently).
The offending expression is usually visible without a follow-up call. Entries in
either list tagged with `reason: "unreconstructable-context"` are NOT real bugs —
they reference variables we don't reconstruct in replay (`$vars`, `$secrets`,
`$response`, `$request`, `$pageCount`, `$ai`). The value existed at execution
time; we just don't have it here.

## Successful execution with wrong or empty value

When `debug` doesn't apply because nothing errored, call
`executions(action="get-resolved-node-parameters", executionId, nodeName)` on the
node whose output looks off — **do this unprompted**, don't ask the user for
permission first. It's a cheap read-only inspection and the only reliable way to
confirm whether an empty value came from an expression silently resolving to
nullish. Check `emptyResolutions` first; most "this parameter is empty" cases are
expressions resolving to `null`/`undefined`/`""`, not thrown errors.
