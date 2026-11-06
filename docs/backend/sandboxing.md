---
title: Sandboxing
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: despairblue
---

# Sandboxing

Users can write code in n8n in three places:

- Expressions
- Code nodes
- Custom tools of agents

n8n runs arbitrary code in these sandboxes:

- [V8 isolates](https://github.com/laverdet/isolated-vm) for expressions on the backend, and for custom tools of agents
- [QuickJS](https://bellard.org/quickjs/), for expressions in the frontend (in rollout)
- Task runners for Code nodes
- Remote sandboxes for code that the n8n Assistant writes

This page explains how each sandbox protects the n8n process from this code.

## Expressions

By default, n8n runs each expression in a [V8 isolate](https://github.com/laverdet/isolated-vm), i.e. a separate JavaScript heap with its own memory limit. The legacy engine used to run expressions inside the n8n process.

The frontend still evaluates expressions with the legacy engine, but is moving to [QuickJS](https://bellard.org/quickjs/). An expression can therefore give one result in the frontend and another on the backend.

## Code node

A Code node runs JavaScript or Python in a [task runner](https://github.com/n8n-io/task-runner-launcher), i.e. a separate process in a sidecar container, next to the main in regular mode, or next to the worker in queue mode.

The code cannot reach the memory, environment variables, or files of n8n, because the runner is in another container. If the code crashes or runs out of memory, only the runner fails, not the main or the worker.

## Custom tools

A **custom tool** is a function that a user writes for an agent to call. The `agents` module runs each custom tool in a pool of V8 isolates.

Unlike a task runner, an isolate runs inside the n8n process. If a custom tool runs out of memory, n8n discards its isolate, and the main keeps running.

## n8n Assistant

The [n8n Assistant](ai-functionality.md#n8n-assistant) writes the source code of a workflow, and compiles it in a remote sandbox, so that its file writes and commands do not run on the n8n host. Without a sandbox, the Assistant cannot build workflows.

## Quiz

1. A user sees one value in the expression preview, and the backend gives another value. What is a likely cause?
   - A. The frontend evaluates with the legacy engine, and the backend runs the expression in an isolate.
   - B. The frontend caches old run data.
   - C. The task runner changes the value.
   - D. The database rounds the value.
2. In queue mode, where does a Code node run?
   - A. In a task runner next to the main.
   - B. In the isolate pool of the main.
   - C. In a task runner next to the worker.
   - D. Inside the worker process.
3. Where does a custom tool of an agent run?
   - A. In a task runner.
   - B. In an isolate of the `agents` module.
   - C. In the remote sandbox of the n8n Assistant.
   - D. Inside the n8n process.

<details>
<summary>Answers</summary>

1. A. The frontend still uses the legacy engine, and the two engines can give different results.
2. C. A runner sits next to the process that runs the workflow. In queue mode, that process is a worker.
3. B. The `agents` module runs custom tools in a pool of V8 isolates, not in task runners.

</details>
