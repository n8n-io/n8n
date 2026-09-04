---
title: The workflow model
audience: Backend engineers new to n8n
tier: 3
reading_time: 8 min
last_reviewed: 2026-09-02
owner: "@n8n-io/catalysts"
---

# The workflow model

Read this when you need to know what a workflow, a node, an item, or run data is in code, or where the graph traversal helpers live.

## What it is

`n8n-workflow`, at `packages/workflow`, defines what a workflow is: the node and connection types, the item and execution data shapes, the node type contract, and the `Workflow` class that indexes a graph for traversal and parameter resolution. It has no runtime dependency on a database, Express, or the filesystem. It builds to both CommonJS and ES modules, so the same code runs in the main process, workers, task runners, and the browser editor. Every other package imports its interfaces.

## How it works

A stored workflow is `nodes: INode[]` plus `connections: IConnections`. Connections are keyed by **source** node name, then by connection type such as `main` or `ai_tool`, then by output index, giving an array of `{ node, type, index }` targets. To find parents you must invert the map. `mapConnectionsByDestination()` in `packages/workflow/src/common/` does that, and root `AGENTS.md` asks you to use the helpers there instead of your own traversal.

`new Workflow({ id, name, nodes, connections, active, nodeTypes, staticData, settings, pinData })` builds the in-memory graph. The constructor looks up each node's implementation through `nodeTypes.getByNameAndVersion(node.type, node.typeVersion)` and skips unknown node types instead of throwing. It fills default parameter values and indexes nodes by name. It computes the connections by destination. It wraps static data in an observable object so that callers can tell whether it changed. It creates a `WorkflowExpression`. Graph queries such as `getChildNodes`, `getParentNodes`, `getTriggerNodes`, and `getPollNodes` live on the class as thin wrappers over the pure functions in `src/common`.

The **node type contract** is `INodeType`: a `description` plus optional `execute`, `poll`, `trigger`, `webhook`, `supplyData`, and `methods` for load options, list search, credential test, and resource mapping. The description declares `version`, `inputs`, `outputs`, `properties`, `credentials`, `webhooks`, `polling`, and for declarative nodes `requestDefaults`. A node exports one `INodeType` whose version is a number or an array, or a `VersionedNodeType` that maps each version to an implementation. `INode.typeVersion` on a node instance selects the implementation, which is how a workflow saved against version 2 keeps version 2 behavior after version 3 ships.

An **item** is `INodeExecutionData { json, binary?, pairedItem? }`. Binary data holds references, not bytes, when the bytes live in external storage. `pairedItem` links an output item to the input item it came from. One node run is `ITaskData`, keyed by connection type with one array per output index. `IRunData` maps node name to an array of runs, indexed by `runIndex`.

`IRunExecutionData` is the versioned record that holds everything needed to execute a workflow and to restart it: `resultData` with the run data, pinned data, and the error, and `executionData` with the engine state, the node execution stack, and the waiting inputs of multi-input nodes. It is branded, so you build it with `createRunExecutionData` from `run-execution-data-factory.ts`, and `migrateRunExecutionData` upgrades old records read from the database.

## Where to look

| Path | What |
|---|---|
| `packages/workflow/src/interfaces.ts` | `INode`, `IConnections`, `INodeExecutionData`, `ITaskData`, `IRunData`, `INodeType`, `INodeTypeDescription`, `IWorkflowSettings` |
| `packages/workflow/src/workflow.ts` | The `Workflow` class |
| `packages/workflow/src/common/` | `getParentNodes`, `getChildNodes`, `mapConnectionsByDestination` |
| `packages/workflow/src/run-execution-data/` | The versioned run data record |
| `packages/workflow/src/node-helpers.ts` | `getNodeParameters`, `getVersionedNodeType`, input and output helpers |
| `packages/workflow/src/versioned-node-type.ts` | `VersionedNodeType` |
| `packages/workflow/src/execution-context.ts` | The list of execution modes |

## What it owns

Nothing persistent. Workflow JSON and run data are stored by `@n8n/db` entities. No Redis.

## Flags

None defined here. Per-workflow settings steer behavior: `executionOrder` (`v0` or `v1`), `engineType` (`v1` or `v2`), `timezone`, `errorWorkflow`, `executionTimeout`, and the save settings.

## Per mode

The same code runs in every process. The browser builds the same `Workflow` class with a stub node types provider that returns descriptions only, so the editor can compute graph shape and preview expressions without node implementations.

## Was, is, goes

**Was.** Files were PascalCase until May 2025. Older PRs still say `Interfaces.ts`. **Is.** The `src/common` traversal helpers exist since July 2025 so that the frontend can traverse without a `Workflow` instance. Run data gained versions in November 2025. **Goes.** `IWorkflowSettings.engineType` is the hook for Engine 2.0, which converts this model through `@n8n/node-engine-compatibility`. One `@tech_debt` note remains in `workflow.ts`: the id is still optional in the type. A plain comment a few lines below says that unknown node types do not throw.

## Terms

- **typeVersion**: the version stored on a node instance. Fractional values such as 3.5 are normal.
- **main connection**: the item-carrying edge. Other connection types attach sub-nodes to AI nodes.
- **runIndex**: the position of one run of a node. A node inside a loop has several.
- **itemIndex**: the position of an item within one output array.
- **pairedItem**: which input item an output item derives from.
- **pinData**: fixed items that replace real output during manual execution.
- **staticData**: per-workflow storage saved with the workflow, such as webhook ids and poll cursors.
- **nodeExecutionStack**: the nodes waiting to run, with their input items.
- **destinationNode**: the target of a partial execution, inclusive or exclusive.
- **executionOrder v0 and v1**: legacy breadth-first order, or the current depth-first, top-left-first order.

## Read more

- Root `AGENTS.md`, section "Workflow Traversal Utilities"
- [The v1 execution engine](execution-engine.md)
- docs.n8n.io: data structure and item linking pages
