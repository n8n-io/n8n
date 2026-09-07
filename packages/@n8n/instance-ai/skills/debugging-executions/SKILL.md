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

Inspect the existing execution with `executions(action="debug")` or the
relevant node-output tools first. Use the shared evidence and recovery rules.
Do not repeat a claim that the workflow works when the user reports a failure.
Investigate errors, empty outputs, and unreached required paths. Distinguish an
expected unused branch from a missing required result.

For a workflow built through the workflow loop, use `verify-built-workflow`
for a new verification scenario. Use `executions(action="run")` only for a
user-requested live test or another authorized ad hoc run. If the failing path
cannot be checked, state what remains unconfirmed. Do not blame a harness or
stale state without diagnostic evidence.

## Testing event-triggered workflows

Keep the original trigger. For an authorized live run, pass `inputData` that
matches its output shape. For build verification, use `verify-built-workflow`
with the same trigger. Read
`${N8N_WORKSPACE_DIR}/knowledge-base/reference/trigger-input-data-shapes.md`
when the input shape is unclear and the sandbox workspace is available.

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
