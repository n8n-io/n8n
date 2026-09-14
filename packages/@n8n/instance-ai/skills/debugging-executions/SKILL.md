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

## Confirming a fix on the node that failed

`executions(action="debug")` tells you what the node received. It does not tell
you whether your fix works. To learn that, run the node itself:

```
executions(action="run-step", workflowId, nodeName, reuseExecutionId=<the failed execution>)
```

`reuseExecutionId` replays the data the node really received and re-runs only
that node, so the fix meets the same input that broke it. This is the right
first move whenever the user is debugging a node that already failed a real
execution: the node ran for real once already, and a mock-only check is what
sends the user back for a second session.

Use `mockInput` only when the upstream nodes cannot run. It proves the node
accepts the input you invented, nothing more — the result carries
`inputMode: "mocked"` and a `fabricatedNodeNames` list, and you must say so
instead of reporting the workflow as working.

A node that only partly succeeded before it failed — a send that delivered some
messages and then hit a rate limit — will repeat that effect. Prefer
`get-resolved-node-parameters` there, and ask the user before you re-run it.

## Successful execution with wrong or empty value

When `debug` doesn't apply because nothing errored, call
`executions(action="get-resolved-node-parameters", executionId, nodeName)` on the
node whose output looks off — **do this unprompted**, don't ask the user for
permission first. It's a cheap read-only inspection and the only reliable way to
confirm whether an empty value came from an expression silently resolving to
nullish. Check `emptyResolutions` first; most "this parameter is empty" cases are
expressions resolving to `null`/`undefined`/`""`, not thrown errors.
