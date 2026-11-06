---
title: User code
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: despairblue
---

# User code

Users write JavaScript in two places: expressions in node parameters, such as `{{ 'Hello, ' + $json.body.name }}` on Day 1, and the code of a Code node. Both are code from a user, so n8n runs both away from the memory of its own process. This page explains how. Read it before you change either one.

## Expressions

`n8n-workflow` evaluates expressions. Nothing evaluates until a node reads the parameter, and then it evaluates for one item at a time. That is why one parameter can give a different value for each item.

The default engine runs each expression in a V8 isolate, a separate JavaScript heap with its own memory limit and timeout. The isolate does not get the item as a copy. It asks the process for each value that the expression reads, such as `$json.body.name`, and nothing else. Each process keeps a pool of ready isolates, because a new isolate takes time to create.

The isolate needs a native module. If that module fails to load, the process stops at startup with a message. It does not fall back to a weaker engine. `N8N_EXPRESSION_ENGINE=legacy` selects the old engine, which runs expressions inside the process. The old engine will go away.

The editor cannot load the native module, so it previews expressions with the old engine. A preview in the editor can therefore differ from a run on the backend.

The helper functions of expressions, such as `.toDateTime()`, exist in two copies: one for the old engine, and one in the code that the isolate loads. A change to one copy needs the same change in the other.

## Code node

A Code node runs JavaScript or Python in a **task runner**, a separate process. A runner sits next to the process that runs workflows: the main on your laptop, the worker in queue mode.

The process that runs the workflow hosts a **task broker** on its own port. When a Code node runs, the engine sends a task to the broker. A runner with a free slot accepts it, and the broker gives the task to that runner.

The JavaScript runner reads the code first, to learn which data it uses. Then it asks for only that data. A Code node that reads only `$json` does not receive the output of every earlier node. When the code calls a helper, such as an HTTP request, the call goes back through the broker to n8n, which runs it.

In `internal` mode, n8n starts the runners as child processes. In `external` mode, a launcher in its own container starts them. The code recommends `external` for production. A task that runs longer than the timeout fails, and in `internal` mode n8n also restarts the runner.

Agents do not use task runners. An agent runs its custom tool code in its own isolate.

## Quiz

1. An expression gives one value in the editor preview and another value in a run. Why can this happen?
   - A. The editor uses the draft, and the run uses a cache.
   - B. The backend evaluates the expression once for all items.
   - C. The editor previews with the old engine, and the backend runs the isolate engine.
   - D. The preview runs on a worker.
2. You change the helper `.toDateTime()`. What else must you change?
   - A. Nothing. One file holds all helpers.
   - B. The second copy of the helper, so that both engines agree.
   - C. The task runner, because it runs all helpers.
   - D. The migration that stores the helpers.
3. The native module of the isolate fails to load. What does the process do?
   - A. It stops at startup with a message.
   - B. It falls back to the old engine.
   - C. It runs without expressions.
   - D. It sends expressions to a task runner.
4. A Code node reads only `$json`. Does its runner get the output of every earlier node?
   - A. Yes. Every task carries all run data.
   - B. Only in queue mode.
   - C. Only for Python code.
   - D. No. The runner reads the code first and asks for only the data that it uses.
5. In queue mode, where does a Code node run?
   - A. In a task runner next to the main that received the request.
   - B. In the isolate pool of the main.
   - C. In a task runner next to the worker that runs the workflow.
   - D. Inside the worker process.

<details>
<summary>Answers</summary>

1. C. The editor cannot load the native module of the isolate, so it uses the old engine.
2. B. The helpers exist in two copies: one for the old engine, and one in the code that the isolate loads.
3. A. The process does not fall back to a weaker engine. `N8N_EXPRESSION_ENGINE=legacy` selects the old engine on purpose.
4. D. The JavaScript runner learns from the code which data it uses.
5. C. A runner sits next to the process that runs workflows. In queue mode, that process is a worker.

</details>
