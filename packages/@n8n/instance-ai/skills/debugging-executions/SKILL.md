---
name: debugging-executions
description: >-
  Debug failed or wrong-output workflow executions with executions tools. Load
  when user reports execution failures, unexpected node output, empty
  parameter values after successful run, or node showing red/failed expression
  error. Also load when live run you started for user fails with node or
  external service error (e.g. 401), before explaining cause.
recommended_tools:
  - workflow_builder_executions
  - workflow_builder_workflows
---
# Debugging Executions

Use skill when debugging workflow execution failures or successful runs with wrong/empty values.

## When the user reports it still fails

Re-run failing path with `workflow_builder_executions(action="run")` (or `workflow_builder_verify_built_workflow`), inspect real result before responding. Don't restate workflow "fixed", "verified", or "working"; don't blame test-harness artifact, stale state, or "it works in production" without re-run against failing path. Live signals real: execution error, partial coverage (`nodesNotReached`), empty node, missing node = real defect to investigate, not explain away. Truly can't re-run failing path? Say so plainly, name what unconfirmed, don't repeat success claim.

## Before you name a cause

Say what you checked before why it failed. Don't lead with unchecked cause. Plausible guess first reads as finding; user acts on it.

Check n8n side first. Checks read-only — run unprompted:

- **Auth errors (401, 403, "unauthorized", "invalid key").** Confirm credential exists (`list_credentials`, with `ids` for specific credential), node uses it (node's `credentials` in `workflow_builder_workflows(action="get")`; resolved parameters show only auth type, not bound credential), and what `test_credential` reports. Generic credential (e.g. Header Auth) can pass test without calling service, so pass ≠ service accepts it. Say so when reporting check.
- **Other node errors.** Start from `workflow_builder_executions(action="debug")` and failed node's resolved parameters.

Report checks + results, only then give cause. Can't read stored secret, so cause about its format/value = hypothesis: label it, name confirming check. Don't blame user's account, billing, credit, plan, quota unless error says so.

Cause outside workflow ≠ workflow correct. Before saying workflow wired/configured correctly, read expression parameters of every node on failing path, not just failed node. Expression reading wrong field, or literal placeholder where expression belongs, = defect even when different error stopped run. Report each defect separately from failed-run cause.

## Draft versus live

Published workflow runs published version, not draft you edit. Save creates draft; draft not live until someone publishes. So fix to live workflow changes nothing in production alone.

Two consequences when user reports live workflow failing:

- **Read the version each execution ran.** `workflow_builder_executions(action="list", workflowId)` returns `workflowVersionId` per row, plus `workflow.activeVersionId` (published) and `workflow.draftVersionId`. Only row whose `workflowVersionId` equals `workflow.activeVersionId` ran published code. Draft run proves nothing about production. `workflow.draftVersionId` differing from `workflow.activeVersionId` = latest changes, incl. fix you just made, not live.
- **Name the version when you invite a retest.** Say whether user tests draft or published. "Try it again" after draft-only fix sends user to broken published version; fix looks failed.

Don't report fix live until published version is fixed one. Ask whether to publish instead. After publish, new live run confirms fix — earlier execution ran old version.

## Testing event-triggered workflows

Use `workflow_builder_executions(action="run")` with `inputData` matching trigger's output shape — don't rebuild with Manual Trigger. For trigger `inputData` shapes, read workspace file `knowledge-base/reference/trigger-input-data-shapes.md` when sandbox workspace available.

## Failed execution

`workflow_builder_executions(action="debug")` already includes `failedNode.resolvedParameters` — start there. Bundle has `parameters` (raw, expressions intact), `resolved` (substituted), `failedExpressions` (threw), `emptyResolutions` (silently resolved to `null`/`undefined`/`""`). Offending expression usually visible without follow-up call. Entries in either list tagged `reason: "unreconstructable-context"` NOT real bugs — reference variables not reconstructed in replay (`$vars`, `$secrets`, `$response`, `$request`, `$pageCount`, `$ai`). Value existed at execution time; just unavailable here.

## Confirming a fix on the node that failed

`workflow_builder_executions(action="debug")` shows what node received, not whether fix works. To learn that, run node itself:

```
workflow_builder_executions(action="run-step", workflowId, nodeName, reuseExecutionId=<the failed execution>)
```

`reuseExecutionId` replays data node really received, re-runs only that node, so fix meets same input that broke it. Right first move whenever user debugging **read** node that already failed real execution: node ran for real once already; mock-only check sends user back for second session.

Action refuses replay that would re-run node above target: unpinned one execution never reached, one that failed there, or unfinished loop. Pick another execution, or tell user which node would run again.

### Decide whether the node is safe to run first

Step run = real run. Node uses user's real credentials, reaches user's real systems, on user's real data. Check what node does before `run-step`:

- **Safe to run.** Read (`get`, `getAll`, `search`, `list`, `download`, GET HTTP Request), or transform touching nothing outside workflow (Set, IF, Filter, Code without network/filesystem access). Run these.
- **Do not run for real.** Write (`create`, `update`, `upsert`, `delete`, `send`, `append`, non-GET HTTP Request). Running sends message, charges card, deletes row — again, for real. User asked to debug node, not perform its effect.
- **Unsure?** Treat as write. Lost debugging shortcut recoverable; un-asked write to user's data not.

For write node, debug without running: read failed execution with `debug`, inspect resolved parameters with `get-resolved-node-parameters`, explain fix. Usually enough — write node failures nearly always in input or parameters, both visible without sending anything.

If truly can't resolve without real run, say plainly what node will do to user's data, let user choose. Approval prompt alone not consent: user sees node name, not "this posts to your #general channel".

**"It already ran anyway" is not a reason.** Holds only for node that errored outright and changed nothing. Node that partly succeeded before failing — send that delivered some messages then hit rate limit — delivers them again.

### Studying a node on its own with `mockInput`

`mockInput` runs node on items you supply, skips everything above. Good way to study one node alone, normal while debugging:

- probe edge case workflow rarely produces — empty list, missing field, zero/negative amount;
- hold input still when upstream data changes between runs, so attempts comparable;
- separate "this node is wrong" from "this node gets the wrong input".

Use whenever question about node. Use `reuseExecutionId` or chain run when question about workflow.

Keep claim at evidence level. Mocked run shows node handles given input; shows nothing about what chain really produces. Result carries `inputMode: "mocked"` and `mockedNodeNames` list — report node's behaviour, not workflow's.

Mocked input does **not** make write node safe. Node still runs for real against user's systems; only input invented, making effect less predictable, not more.

### Running a tool

Tool never runs alone. n8n runs it through owning node — usually Agent. Step run on tool behaves like step run on that Agent:

- `mockInput` feeds **Agent's** input, not tool's arguments.
- `reuseExecutionId` replays nodes above **Agent**.
- Chain run (neither option) runs every node above Agent for real. Give one of two options when node up there writes.
- `ranThroughNodeNames` lists **every** node that can run tool, not one that ran it. Tool on several agents lists all: engine picks one, doesn't report which. Don't name single Agent to user when field holds more than one.
- Tool on two Agents where one runs above other is refused. Run upper Agent, then read tool with `workflow_builder_executions(action="get-node-output")`.

Tool's own arguments come from `toolArguments` — values agent would normally decide:

```
workflow_builder_executions(action="run-step", workflowId, nodeName="Search Tickets Tool",
           reuseExecutionId=<the failed execution>,
           toolArguments={"query": "login fails", "status": "open"})
```

Example targets **read** tool on purpose. Write rule above holds here too; tool hides write behind friendly name: step run on "Create Ticket" tool creates ticket again, `toolArguments` doesn't change that. Only run one when user accepted second write.

Use argument names from node's `$fromAI` calls, shown by `workflow_builder_workflows(action="get-as-code")`. Pass plain string instead for tool taking one free-text input (Wikipedia, Code Tool, vector store used as tool).

Tool declaring `$fromAI` arguments refused without them: otherwise fails for reason unrelated to user's problem, and you'd report that as defect. Node holding several tools refused outright, since nothing here can name one of its tools like agent does: "MCP Client Tool" node, and every node MCP registry added, type `@n8n/mcp-registry.<server slug>`. Run Agent for those, read node's output from that execution.

Non-tool sub-node — model, memory, embeddings — can't run this way at all. Run Agent, read sub-node with `workflow_builder_executions(action="get-node-output")` on **that** execution: n8n records every call sub-node made while Agent ran.

## Successful execution with wrong or empty value

When `debug` doesn't apply because nothing errored, call `workflow_builder_executions(action="get-resolved-node-parameters", executionId, nodeName)` on node whose output looks off and nodes feeding it — **do this unprompted**, don't ask permission first. Cheap read-only inspection, only reliable way to confirm whether empty value came from expression silently resolving to nullish. Check `emptyResolutions` first; most "this parameter is empty" cases are expressions resolving to `null`/`undefined`/`""`, not thrown errors.