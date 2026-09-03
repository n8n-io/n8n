---
title: The v1 execution engine
audience: Backend engineers new to n8n
tier: 3
reading_time: 8 min
last_reviewed: 2026-09-02
owner: "@n8n-io/catalysts"
---

# The v1 execution engine

Read this when you need to know how a workflow runs node by node, how partial executions pick their start nodes, or what pinned data, paired items, and continue on fail do inside the engine.

## What it is

The v1 engine is the in-process interpreter in `packages/core/src/execution-engine`. One class, `WorkflowExecute`, holds a stack of pending node runs and a map of node results, and pops the stack until it is empty. Every node runs inside a **context** object that gives it input items, parameters, credentials, and helpers. The engine knows nothing about HTTP, Redis, or the database. `packages/cli` wraps it and feeds it lifecycle hooks, and everything persistent happens in a hook.

## How it works

A full run enters through `run()`, which picks a start node, seeds the stack with one entry for it, and calls `processRunExecutionData()`. That method holds the loop. Each iteration does this:

1. Pop an entry and attach paired item lineage to its input items.
2. Compute the run index, and wait if a multi-input node still lacks data.
3. Fire `nodeExecuteBefore`.
4. Run the node inside a retry loop.
5. Record the result under `resultData.runData[nodeName][runIndex]`.
6. Fire `nodeExecuteAfter` and push the children onto the stack. [Life of a webhook execution](../life-of-a-webhook-execution.md#stage-6-the-engine) shows the loop with excerpts.

**Dispatch.** `runNode()` decides by node shape. A node with `execute` gets an `ExecuteContext`. A `poll` node runs its poll function only in manual mode and passes data through otherwise, because in production the poller already ran. A `trigger` node runs only in manual mode for the same reason. A webhook node passes data through because the webhook service already called it. A **declarative node**, one with `requestDefaults` and no `execute`, goes to `RoutingNode`, which builds HTTP requests from parameter metadata. In the running app, `NodeTypes` in `packages/cli/src/node-types.ts` attaches an `execute` to declarative types up front.

**Order and waiting.** `executionOrder: 'v1'`, the default for new workflows, inserts children at the front of the stack sorted top-left first, which gives depth-first order. The legacy `v0` appends and runs breadth-first. A node with several inputs, such as Merge, is parked in `waitingExecution` until every input has data. When the stack empties, the loop drains the parked nodes one by one.

**Partial executions.** The editor re-runs only what is stale. `runPartialWorkflow2()` converts the workflow to a `DirectedGraph`, finds the trigger, cuts the subgraph between trigger and destination, finds the earliest **dirty** nodes, fixes cycles, drops stale results, rebuilds the stack from existing run data, and then runs the normal loop. The helpers live in `partial-execution-utils/`. The old "partial execution version" switch was deleted in September 2025. One partial-execution setting remains: a destination node is inclusive or exclusive.

**Pinned data** short-circuits a node. `getPinnedOutput()` returns the pinned items for any enabled node that has them, and the node function is never called. The CLI passes pinned data only in `manual` and `evaluation` modes, so production runs ignore it.

**Errors.** `getRetryParams()` reads `retryOnFail`, clamps `maxTries` to 2 through 5, and `waitBetweenTries` to 0 through 5000 milliseconds. A node continues on error when `continueOnFail` is true or `onError` is `continueRegularOutput` or `continueErrorOutput`. Then the input items pass through, or failed items go to an extra error output. Otherwise the engine records the error and stops. Error workflows are not part of `core`. `packages/cli/src/execution-lifecycle/execute-error-workflow.ts` starts one from the `workflowExecuteAfter` hook.

**Waiting.** A node that calls `putExecutionToWait()` sets `waitTill`. The loop re-pushes the node, breaks, and returns the run as `waiting`. On resume, `handleWaitingState()` clears `waitTill` and disables the node at the head of the stack so that it does not run twice. See [Scheduling and waiting](scheduling-and-waiting.md).

**AI agents** can return an `EngineRequest` instead of items. `handleEngineRequest` schedules the requested tool nodes and re-queues the agent so that it resumes with an `EngineResponse`. This is how an agent's tools run as real nodes.

## Where to look

| Path | What |
|---|---|
| `packages/core/src/execution-engine/workflow-execute.ts` | `WorkflowExecute`: `run`, `runPartialWorkflow2`, `processRunExecutionData`, `runNode`, `addNodeToBeExecuted` |
| `packages/core/src/execution-engine/partial-execution-utils/` | `DirectedGraph`, `findStartNodes`, `findSubgraph`, `recreateNodeExecutionStack`, `cleanRunData`, `handleCycles` |
| `packages/core/src/execution-engine/node-execution-context/` | `ExecuteContext`, `TriggerContext`, `PollContext`, `WebhookContext`, `SupplyDataContext`, `LoadOptionsContext` |
| `packages/core/src/execution-engine/routing-node.ts` | Declarative nodes |
| `packages/core/src/execution-engine/execution-lifecycle-hooks.ts` | The hook bus the engine calls |
| `packages/core/src/execution-engine/requests-response.ts` | `EngineRequest` handling for agents |
| `packages/workflow/src/workflow-data-proxy.ts` | Paired item resolution behind `$('Node').item` |

## What it owns

No tables and no Redis keys. Its run data is serialized by `packages/cli` into `execution_data`. The v0 to v1 shape migration of that JSON happens in code, in `migrateRunExecutionData()`, not in SQL.

## Flags

`EXECUTIONS_TIMEOUT` and `EXECUTIONS_TIMEOUT_MAX` bound a run. The `EXECUTIONS_DATA_SAVE_*` variables are defaults for the save settings applied by the hooks. `NODES_ERROR_TRIGGER_TYPE` names the error trigger. Per workflow: `executionOrder`, `errorWorkflow`, `executionTimeout`. Per node: `retryOnFail`, `maxTries`, `waitBetweenTries`, `alwaysOutputData`, `executeOnce`, `onError`, `continueOnFail`. No license flags.

## Per mode

The engine branches on the **execution mode**, not on the process role. The modes are `cli`, `error`, `integrated`, `internal`, `manual`, `retry`, `trigger`, `webhook`, `evaluation`, `chat`, and `agent`. Manual mode runs poll and trigger functions and uses pinned data. The process role only changes which hooks `packages/cli` attaches. Engine 2.0 is chosen before this engine is reached, in `WorkflowRunner.run`.

## Was, is, goes

**Was.** `workflow-execute.ts` traces back to the first public commit in 2019. Partial executions v2 landed in September 2024 and the version switch was deleted a year later. **Is.** The loop was refactored into named steps on 2026-08-31, so the method names in this document are recent. **Goes.** `IWorkflowSettings.engineType` routes a workflow to Engine 2.0, which will take over routed workflows while v1 stays the default path. Eight `TODO` markers remain in the file. Two more sit in `find-start-nodes.ts`, where the `isDirty` checks for changed properties and disabled parents are stubs that return false.

## Terms

- **runData**: node name to an array of runs.
- **runIndex**: the position of a run. Set explicitly by engine requests, otherwise the count of prior runs.
- **executionIndex**: a global counter across nodes, used to restore order after partial runs.
- **IExecuteData**: one stack entry: node, input items per connection type, and source.
- **waitingExecution**: inputs collected so far for a multi-input node that cannot run yet.
- **dirty node**: a node whose result is stale and must re-run. It has an error, or it has neither run data nor pinned data. Changed properties and a disabled parent are meant to count too, but those checks are stubs today.
- **start node**: where a partial execution starts.
- **root node**: an AI node whose sub-nodes attach through non-main connections.
- **EngineRequest**: actions a node asks the engine to fulfill, then call back with results.
- **closeFunction**: a cleanup callback registered by a node and run when the execution ends or is cancelled.

## Read more

- [The workflow model](workflow-model.md)
- [Manual executions](manual-executions.md)
- The `DirectedGraph` header comment and the `findStartNodes` doc comment
- docs.n8n.io: error handling, item linking, execution order pages
