---
title: Engine
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: ivov
---

# Engine

[Workflow execution](../workflow-execution.md) showed the engine run two nodes. This page explains what a workflow is as data, how the engine orders the nodes, and how n8n finds the code of each node. Read it before you change the engine, a manual run, or how nodes load.

## Workflow model

The package `n8n-workflow` defines a workflow. It has no database or HTTP code, because the editor and the task runners use it too.

A saved workflow has a list of nodes and a map of connections. The map is keyed by the node where a connection starts. To find the nodes that come before a node, invert the map with the helpers in `n8n-workflow`. The root `AGENTS.md` shows them.

Each output item remembers the input item that it came from. n8n calls this link a **paired item**. An expression such as `$('Webhook').item` follows the links back to the matching item of an earlier node. A node that breaks the links makes expressions in later nodes fail.

The result of a run is the **run data**: the output of every node, each time it ran. A waiting execution keeps its run data in the database, and the engine continues from it when the execution resumes.

## Node order

The engine runs one branch to its end before it starts the next branch. Workflows from before n8n 1.0 run in the old order, breadth first, because the order is a setting of each workflow. A node with two inputs, such as **Merge**, waits until both inputs have data.

A node can retry after a failure, and it can send failed items to an error output instead of stopping the run. When a run fails, n8n can start an **error workflow** that the user chose.

The **AI Agent** node is a node inside a workflow. It is not the agent of [Agent turn](../agent-turn.md). When the model asks for a tool, the node asks the engine to run the tool nodes that connect to it. The engine runs them, and then it runs the AI Agent node again with the results. The whole loop stays inside one execution.

## Manual runs

A manual run differs from a production run in three ways.

It can be **partial**. When a user runs one node, the editor sends the run data that it already has. The engine then runs only the nodes on the path to that node whose input changed.

It can use **pinned data**. Pinned data replaces the output of a node in manual runs. A user can then test the next nodes without a new call to the service. Production runs ignore pinned data.

It reports to one tab. In queue mode, a worker runs the manual run, and a main relays the progress to the tab. This setup is `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true`, and it is the only supported setup for queue mode.

## Node loading

Nodes are classes in npm packages: `n8n-nodes-base`, `@n8n/n8n-nodes-langchain`, and community packages. A node type name has the package as a prefix, for example `n8n-nodes-base.webhook`. Every process loads the same packages.

At startup, a process reads a list of the node types in each package. It loads the class of a node only when a workflow needs it. That keeps the startup fast with more than 600 node types.

A node can say that agents may use it as a tool. n8n then adds a tool version of that node type. The tool version has no class of its own.

When a saved workflow names a node type that the process does not have, the backend throws `UnrecognizedNodeTypeError`. This happens after an operator excludes a node, or when a community package is missing.

A node type maps each `typeVersion` to its implementation. A saved node keeps its version, so it keeps its behavior after an upgrade. A new behavior therefore goes into a new version. A change to an existing version changes every saved workflow that uses it, and only review catches that.

## Quiz

1. You need the nodes that come before a node. How do you get them from the connections?
   - A. Invert the map with the helpers in `n8n-workflow`, because the map is keyed by the start node.
   - B. Read the map with the node name as the key.
   - C. Query the database for the parents of the node.
   - D. Follow the paired items of the node.
2. A node gives output items without links to its input items. What fails?
   - A. Nothing. The links are only for the editor.
   - B. The node itself, at once.
   - C. The save of the run data.
   - D. Expressions in later nodes that use links, such as `$('Webhook').item`.
3. A saved workflow names a node type that the process does not have. What happens?
   - A. The engine skips the node.
   - B. n8n downloads the missing package.
   - C. The backend throws `UnrecognizedNodeTypeError`.
   - D. The node runs with its last saved output.
4. A node has pinned data. What does a production run do with it?
   - A. It uses the pinned data in place of the node output.
   - B. It ignores it.
   - C. It fails, because pinned data is not allowed in production.
   - D. It uses the pinned data only when the node fails.
5. You change the code of an existing `typeVersion` of a node. What does that change?
   - A. Every saved workflow that uses that version. Only review catches this.
   - B. Only workflows that users save after the release.
   - C. Nothing, because saved workflows keep a copy of the node code.
   - D. Only manual runs.

<details>
<summary>Answers</summary>

1. A. Invert the map with the helpers in `n8n-workflow`, because the map is keyed by the start node. The connections map is keyed by the node where a connection starts. The root `AGENTS.md` shows the helpers.
2. D. Expressions in later nodes that use links, such as `$('Webhook').item`. Each output item remembers its input item. A node that breaks these paired items makes those expressions fail.
3. C. The backend throws `UnrecognizedNodeTypeError`. This happens after an operator excludes a node, or when a community package is missing.
4. B. It ignores it. Pinned data replaces the output of a node in manual runs only.
5. A. Every saved workflow that uses that version. Only review catches this. A new behavior goes into a new version, so that saved nodes keep their behavior.

</details>
