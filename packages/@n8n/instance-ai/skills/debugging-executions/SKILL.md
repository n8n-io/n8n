---
name: debugging-executions
recommended_mode: debug
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

## Confirming a fix on the node that failed

`executions(action="debug")` tells you what the node received. It does not tell
you whether your fix works. To learn that, run the node itself:

```
executions(action="run-step", workflowId, nodeName, reuseExecutionId=<the failed execution>)
```

`reuseExecutionId` replays the data the node really received and re-runs only
that node, so the fix meets the same input that broke it. This is the right
first move whenever the user is debugging a **read** node that already failed a
real execution: the node ran for real once already, and a mock-only check is
what sends the user back for a second session.

The action refuses a replay that would re-run a node above the target: an
unpinned one the execution never reached, one that failed there, or a loop
that did not finish. Pick another execution, or tell the user which node would run again.

### Decide whether the node is safe to run first

A step run is a real run. The node uses the user's real credentials and reaches
the user's real systems, on the user's real data. Check what the node does
before you reach for `run-step`:

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
`debug`, inspect the resolved parameters with
`get-resolved-node-parameters`, and explain the fix. That is usually enough,
because a write node's failures are nearly always in its input or its
parameters, both of which you can see without sending anything.

If you genuinely cannot resolve it without a real run, say plainly what the
node will do to the user's data, and let the user choose. The approval prompt
alone is not consent: the user sees a node name, not "this posts to your
#general channel".

**"It already ran anyway" is not a reason.** It holds only for a node that
errored outright and changed nothing. A node that partly succeeded before it
failed — a send that delivered some messages and then hit a rate limit — will
deliver them again.

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

Keep the claim at the level of the evidence. A mocked run shows the node
handles the input you gave it; it shows nothing about what the chain really
produces. The result carries `inputMode: "mocked"` and a `mockedNodeNames`
list — report the node's behaviour, not the workflow's.

Mocked input does **not** make a write node safe. The node still runs for real
against the user's systems; only its input is invented, which makes the effect
less predictable, not more.

### Running a tool

A tool never runs on its own. n8n runs it through the node that owns it —
usually the Agent. A step run on a tool therefore behaves like a step run on
that Agent:

- `mockInput` feeds the **Agent's** input, not the tool's arguments.
- `reuseExecutionId` replays the nodes above the **Agent**.
- A chain run (neither option) runs every node above the Agent for real. Give
  one of the two options when a node up there writes.
- `ranThroughNodeNames` lists **every** node that can run the tool, not the one
  that ran it. A tool on several agents lists them all: the engine picks one,
  and it does not report which. Do not name a single Agent to the user when
  this field holds more than one.
- A tool on two Agents where one runs above the other is refused. Run the
  upper Agent, then read the tool with `executions(action="get-node-output")`.

The tool's own arguments come from `toolArguments` — the values the agent would
normally decide:

```
executions(action="run-step", workflowId, nodeName="Search Tickets Tool",
           reuseExecutionId=<the failed execution>,
           toolArguments={"query": "login fails", "status": "open"})
```

The example targets a **read** tool on purpose. The write rule above holds here
too, and a tool hides the write behind a friendly name: a step run on a "Create
Ticket" tool creates the ticket again, and `toolArguments` does not change that.
Only run one when the user has accepted a second write.

Use the argument names from the node's `$fromAI` calls, which
`workflows(action="get-as-code")` shows. Pass a plain string instead for a tool
that takes one free-text input (Wikipedia, Code Tool, a vector store used as a
tool).

A tool that declares `$fromAI` arguments is refused without them: it would
otherwise fail for a reason that has nothing to do with the user's problem, and
you would report that as the defect. A node that holds several tools is refused
outright, because nothing here can name one of its tools the way the agent
does: the "MCP Client Tool" node, and every node the MCP registry added, whose
type is `@n8n/mcp-registry.<server slug>`. Run the Agent for those, and read
the node's output from that execution.

A sub-node that is not a tool — a model, memory, embeddings — cannot be run this
way at all. Run the Agent, and read the sub-node with
`executions(action="get-node-output")` on **that** execution: n8n records every
call a sub-node made while the Agent ran.

## Successful execution with wrong or empty value

When `debug` doesn't apply because nothing errored, call
`executions(action="get-resolved-node-parameters", executionId, nodeName)` on the
node whose output looks off — **do this unprompted**, don't ask the user for
permission first. It's a cheap read-only inspection and the only reliable way to
confirm whether an empty value came from an expression silently resolving to
nullish. Check `emptyResolutions` first; most "this parameter is empty" cases are
expressions resolving to `null`/`undefined`/`""`, not thrown errors.
