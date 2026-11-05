---
title: The workflow model
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# The workflow model

Read this when you need to know what a workflow, a node, an item, or run data is in code. It also says where the graph traversal helpers live.

## What it is

`n8n-workflow`, at `packages/workflow`, defines what a workflow is. It holds the node and connection types, the item and run data shapes, the node type contract, and the `Workflow` class. That class indexes a graph for traversal and parameter resolution. Every other package imports these interfaces.

A stored workflow is a list of nodes plus a connections map. An **item** is one unit of data that flows between nodes, with `json`, optional `binary`, and optional `pairedItem`. **Run data** maps each node name to an array of runs. `IRunExecutionData` holds everything that the engine needs to run a workflow and to restart it.

## Why it has this shape

**No runtime dependencies.** The package has no database, Express, or filesystem code. It builds to both CommonJS and ES modules. The same code runs in the main process, workers, task runners, and the browser editor.

**Connections are keyed by source node.** The map goes from source node name to connection type, such as `main` or `ai_tool`, to output index. This is the natural shape for "run the children next". To find parents, you must invert the map with `mapConnectionsByDestination()`. Root `AGENTS.md` asks you to use the helpers in `packages/workflow/src/common/` instead of your own traversal. They exist so that the frontend can traverse a graph without a `Workflow` instance.

**Unknown node types do not throw.** The `Workflow` constructor skips a node whose type it cannot find. A comment there says that throwing breaks expression resolution even when the unknown node is not used.

**`typeVersion` pins behavior.** A node instance stores the version it was saved with. A node type maps each version to an implementation, often through `VersionedNodeType`. A workflow saved against version 2 keeps version 2 behavior after version 3 ships. Fractional versions such as 3.5 are normal.

**Paired items.** `pairedItem` links an output item to the input item it came from. Expressions such as `$('Node').item` walk these links back through the runs. A broken chain is a common source of user errors.

**Run data has versions.** `IRunExecutionData` is a branded type. You build it with `createRunExecutionData`. `migrateRunExecutionData` upgrades old records that come from the database, in code and not in SQL.

**Static data is observable.** The `Workflow` class wraps static data in an observable object. Callers can then tell whether a trigger changed it and must save it.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Core interfaces | `packages/workflow/src/interfaces.ts` | `INodeType` |
| Workflow settings | `packages/workflow/src/interfaces.ts` | `IWorkflowSettings` |
| The graph class | `packages/workflow/src/workflow.ts` | `Workflow` |
| Inverted connections | `packages/workflow/src/common/map-connections-by-destination.ts` | `mapConnectionsByDestination` |
| Parent traversal | `packages/workflow/src/common/get-parent-nodes.ts` | `getParentNodes` |
| Run data factory | `packages/workflow/src/run-execution-data-factory.ts` | `createRunExecutionData` |
| Run data migration | `packages/workflow/src/run-execution-data/run-execution-data.ts` | `migrateRunExecutionData` |
| Versioned node types | `packages/workflow/src/versioned-node-type.ts` | `VersionedNodeType` |
| Node parameter helpers | `packages/workflow/src/node-helpers.ts` | `getNodeParameters` |
| Execution modes | `packages/workflow/src/execution-context.ts` | `WorkflowExecuteModeList` |

## What is moving

`IWorkflowSettings.engineType` selects `v1` or `v2`. Engine v2 converts this model through `packages/@n8n/node-engine-compatibility`. See [Engine v2](engine-2.md).

## Read more

- Root `AGENTS.md`, section "Workflow Traversal Utilities"
- [The v1 execution engine](execution-engine.md)
- [Nodes loading and node types](nodes-loading.md)
- docs.n8n.io: data structure and item linking pages
