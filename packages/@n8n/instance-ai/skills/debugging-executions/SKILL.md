---
name: debugging-executions
description: >-
  Debug failed or wrong-output workflow executions using executions tools. Load
  when the user reports execution failures, unexpected node output, empty
  parameter values after a successful run, or a node showing a red or failed
  expression error. Also load when a live run you started for the user fails
  with an error from a node or an external service (for example a 401), before
  you explain the cause to the user.
recommended_tool_groups:
  - executions
  - workflows
---

# Debugging Executions

Use this skill when debugging workflow execution failures or successful runs
with wrong or empty values.

## When the user reports it still fails

Re-run the failing path by running `run_workflow` (or
`workflow_builder_verify_built_workflow`) through `call_tool`, and inspect the real result before responding. Do not
restate that the workflow is "fixed", "verified", or "working", and do not
attribute the reported failure to a test-harness artifact, stale state, or "it
works in production" without a re-run against the failing path. Treat live
signals as real: an execution error, partial coverage (`nodesNotReached`), an
empty node, or a missing node is a real defect to investigate, not something to
explain away. If you genuinely cannot re-run the failing path, say so plainly and
name what is unconfirmed instead of repeating a success claim.

## Before you name a cause

Say what you checked before you say why it failed. Do not lead with a cause
that you did not check. A plausible guess presented first reads as a finding,
and the user acts on it.

Check what you can see on the n8n side first. These checks are read-only, so
run them unprompted:

- **Auth errors (401, 403, "unauthorized", "invalid key").** Confirm that the
  credential exists (`list_credentials`, with `ids` for a specific credential),
  that the node uses it (the node's `credentials` in
  `get_workflow`; resolved parameters show only the
  auth type, not which credential is bound), and what
  `test_credential` reports. A generic credential,
  such as Header Auth, can pass its test without a call to the service, so a
  pass does not show that the service accepts it. Say so when you report the
  check.
- **Other node errors.** Start from `debug_execution` and the
  resolved parameters of the failed node.

Then report the checks and their results, and only after that give a cause.
You cannot read a stored secret, so a cause about its format or value is a
hypothesis: label it as one, and say which check would confirm it. Do not blame
the user's account, billing, credit, plan, or quota unless the error says so.

A cause outside the workflow does not mean that the workflow is correct. Before
you say that the workflow is wired or configured correctly, read the expression
parameters of every node on the failing path, not only the node that failed. An
expression that reads the wrong field, or a literal placeholder where an
expression belongs, is a defect even when a different error stopped the run.
Report each defect separately from the cause of the failed run.

## Draft versus live

A published workflow runs the version that was published, not the draft you
edit. Your save creates a draft, and the draft is not live until somebody
publishes it. So a fix to a live workflow changes nothing in production on its
own.

Two consequences when the user reports a live workflow failing:

- **Read the version each execution ran.** `list_executions( workflowId)`
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

Run `run_workflow` through `call_tool` with `inputData` matching the trigger's output
shape — do not rebuild the workflow with a Manual Trigger. For trigger
`inputData` shapes, read the workspace file
`knowledge-base/reference/trigger-input-data-shapes.md`
when a sandbox workspace is available.

## The run the user is looking at

A message about a failed run often names its execution, for example "currently
viewing its execution `<id>`". Read that execution by its id. Do not pick a run
by running `list_executions` through `call_tool` instead: `list_executions` can return an older run, and it does not show a
manual run that n8n did not save.

When saving manual executions is turned off, n8n can keep a finished manual run
for a short time, only for the user who ran it. n8n saves every run you start.

## Failed execution

`debug_execution` already includes `failedNode.resolvedParameters` —
start there. That bundle has `parameters` (raw, with expressions intact),
`resolved` (substituted), `failedExpressions` (those that threw), and
`emptyResolutions` (those that resolved to `null`/`undefined`/`""` silently).
The offending expression is usually visible without a follow-up call.

## Confirming a fix on the node that failed

`debug_execution` tells you what the node received. It does not tell
you whether your fix works. To learn that, run the node itself:

```
run_workflow_step(workflowId, nodeName, reuseExecutionId=<the failed execution>)
```

`reuseExecutionId` replays the data the node really received and re-runs only
that node, so the fix meets the same input that broke it. This is the right
first move whenever the user is debugging a **read** node that already failed a
real execution: the node ran for real once already, and a mock-only check is
what sends the user back for a second session.

### Decide whether the node is safe to run first

A step run is a real run. The node uses the user's real credentials and reaches
the user's real systems, on the user's real data. Check what the node does
before you reach for `run_workflow_step`:

- **Safe to run.** A read (`get`, `getAll`, `search`, `list`, `download`, a GET
  HTTP Request), or a transform that touches nothing outside the workflow (Set,
  IF, Filter, Code without network or filesystem access). Run these.
- **Do not run for real.** A write (`create`, `update`, `upsert`, `delete`,
  `send`, `append`, a non-GET HTTP Request). Running one sends the message,
  charges the card, or deletes the row — again, and for real. The user asked
  you to debug the node, not to perform its effect.
- **Unsure?** Treat it as a write. Losing a debugging shortcut is recoverable;
  an un-asked write to the user's data is not.

For a write node, debug without running it: read the failed execution with
`debug_execution`, inspect the resolved parameters with
`get_resolved_node_parameters`, and explain the fix. That is usually enough,
because a write node's failures are nearly always in its input or its
parameters, both of which you can see without sending anything.

If you genuinely cannot resolve it without a real run, say plainly what the
node will do to the user's data, and let the user choose. The approval prompt
alone is not consent: the user sees a node name, not "this posts to your
#general channel".

**"It already ran anyway" is not a reason** to re-run a write node.

### Studying a node on its own with `mockInput`

`mockInput` runs the node on items you supply and skips everything above it.
This is a good way to study one node by itself, and a normal thing to do while
debugging:

- probe an edge case the workflow rarely produces — an empty list, a missing
  field, a zero or negative amount;
- hold the input still when the upstream data changes between runs, so two
  attempts are comparable;
- separate "this node is wrong" from "this node gets the wrong input".

Reach for it whenever the question is about the node. Use `reuseExecutionId` or
a chain run when the question is about the workflow.

### Running a tool

A tool never runs on its own. n8n runs it through the node that owns it,
usually the Agent, so a step run on a tool behaves like a step run on that
Agent. The tool's own arguments come from `toolArguments`:

```
run_workflow_step(workflowId, nodeName="Search Tickets Tool",
                  reuseExecutionId=<the failed execution>,
                  toolArguments={"query": "login fails", "status": "open"})
```

The example targets a **read** tool on purpose. The write rule above holds here
too, and a tool hides the write behind a friendly name: a step run on a "Create
Ticket" tool creates the ticket again, and `toolArguments` does not change that.
Only run one when the user has accepted a second write.

## Successful execution with wrong or empty value

When `debug_execution` doesn't apply because nothing errored, call
`get_resolved_node_parameters(executionId, nodeName)` on the
node whose output looks off and on the nodes that feed it —
**do this unprompted**, don't ask the user for permission first. It's a cheap
read-only inspection and the only reliable way to confirm whether an empty value came
from an expression silently resolving to nullish. Check `emptyResolutions` first; most "this parameter is empty" cases are
expressions resolving to `null`/`undefined`/`""`, not thrown errors.
