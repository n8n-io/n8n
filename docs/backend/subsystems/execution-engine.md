---
title: The v1 execution engine
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# The v1 execution engine

Read this when you need to know how a workflow runs node by node, or how partial executions pick their start nodes. It also covers pinned data, retries, and continue on fail.

## What it is

The v1 engine is the in-process interpreter in `packages/core/src/execution-engine`. One class, `WorkflowExecute`, holds a stack of pending node runs and a map of node results. It pops the stack until the stack is empty. Each node runs inside a **context** object that gives it input items, parameters, credentials, and helpers. [Life of a webhook execution](../life-of-a-webhook-execution.md) shows the loop step by step.

## Why it has this shape

**The engine knows nothing about HTTP, Redis, or the database.** `packages/cli` wraps it and passes in lifecycle hooks. Every persistent effect, such as saving run data or starting an error workflow, happens in a hook. This keeps the engine usable on mains, workers, and in tests without a server.

**The engine branches on execution mode, not on process role.** In `manual` mode the engine runs poll and trigger functions itself. In production the poller or trigger already ran, so the engine passes their data through. The process role only changes which hooks `packages/cli` attaches.

**Two execution orders.** `executionOrder: 'v1'` is the default for new workflows. It puts children at the front of the stack, top-left first, which gives depth-first order. The legacy `v0` appends children and runs breadth-first. Old workflows keep `v0` so that their behavior does not change.

**Multi-input nodes wait.** A node such as Merge is parked in `waitingExecution` until every input has data. When the stack is empty, the loop runs the parked nodes.

**Partial executions re-run only stale nodes.** The editor sends a destination node and the existing run data. `runPartialWorkflow2()` builds a `DirectedGraph`, cuts the subgraph from the trigger to the destination, and finds the earliest **dirty** nodes. Then it rebuilds the stack from the existing run data. A dirty node has an error, or has neither run data nor pinned data. Two more checks in `isDirty`, for changed properties and a disabled parent, are stubs that return false.

**Pinned data replaces a node's output.** `getPinnedOutput()` returns the pinned items, and the node function is not called. `packages/cli` passes pinned data only in `manual` and `evaluation` modes, so production runs ignore it.

**Retries are bounded.** `getRetryParams()` clamps `maxTries` to 2 through 5 and `waitBetweenTries` to 0 through 5000 milliseconds. A node with `onError` set to continue passes its items on, or sends failed items to an extra error output.

**Agents run their tools as real nodes.** An AI agent can return an `EngineRequest` instead of items. The engine schedules the requested tool nodes, then runs the agent again with the results.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| The loop | `packages/core/src/execution-engine/workflow-execute.ts` | `WorkflowExecute.processRunExecutionData` |
| Full and partial entry points | `packages/core/src/execution-engine/workflow-execute.ts` | `WorkflowExecute.runPartialWorkflow2` |
| Node dispatch | `packages/core/src/execution-engine/workflow-execute.ts` | `WorkflowExecute.runNode` |
| Partial execution graph | `packages/core/src/execution-engine/partial-execution-utils/directed-graph.ts` | `DirectedGraph` |
| Start node search | `packages/core/src/execution-engine/partial-execution-utils/find-start-nodes.ts` | `findStartNodes` |
| Node contexts | `packages/core/src/execution-engine/node-execution-context/execute-context.ts` | `ExecuteContext` |
| Declarative nodes | `packages/core/src/execution-engine/routing-node.ts` | `RoutingNode` |
| The hook bus | `packages/core/src/execution-engine/execution-lifecycle-hooks.ts` | `ExecutionLifecycleHooks` |
| Agent requests | `packages/core/src/execution-engine/requests-response.ts` | `isEngineRequest` |
| Error workflows | `packages/cli/src/execution-lifecycle/execute-error-workflow.ts` | `executeErrorWorkflow` |

## What is moving

`IWorkflowSettings.engineType` can route a workflow to engine v2. `WorkflowRunner.run` makes that choice before this engine starts. The v1 engine stays the default path. See [Engine v2](engine-2.md).

## Read more

- [The workflow model](workflow-model.md)
- [Manual executions](manual-executions.md)
- [Scheduling and waiting](scheduling-and-waiting.md) for executions that pause
- The `DirectedGraph` header comment and the `findStartNodes` doc comment
- docs.n8n.io: error handling, item linking, and execution order pages
