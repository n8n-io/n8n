---
title: Engine v2
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: mfsiega
---

# Engine v2

The engine that ran your Day 1 workflow is the v1 engine in `n8n-core`. A team is building its successor, Engine v2, in `packages/@n8n/engine/`. Engine v2 is in development and not ready for users. Read this page when you see `engine-v2` in the code, or when you change the v1 engine and want to know what comes next.

## Data plane

Engine v2 models a run as a graph of steps, and workers take the steps from work queues. Its state lives in its own PostgreSQL database, which the code calls the **data plane**. `packages/cli/` acts as its **control plane**. That name has nothing to do with the Cloud control plane.

A workflow opts in with its `engineType` setting. The runner then sends the manual, webhook, and trigger runs of that workflow to Engine v2. No v1 code runs, and no row in `execution_entity` exists. `@n8n/node-engine-compatibility` converts the workflow into a graph and runs the existing nodes as steps.

## Design rules

The two planes talk over HTTP, also inside one process. That contract lets the data plane move to its own process later without a change to the callers. `N8N_ENGINE_MODE=remote` already runs it as the command `n8n engine`.

The core of the engine gets every effect, such as storage or time, through an interface that the caller injects. It does not import `n8n-workflow`, not even its types. All adaptation to v1 goes into the compatibility package.

A workflow that opts in never falls back to v1. If Engine v2 cannot run it, the run fails with a reason for the user.

A handler moves a run forward through several separate writes, so a crash can leave a run half done. The planned answer is a layer that finds and repairs such runs, not transactions across stores. Reviewers give this answer often.

The engine has no queue mode yet. Its work queues live in memory, and the module refuses to start in queue mode.

`packages/@n8n/engine/AGENTS.md` states the current design, and `packages/@n8n/engine/docs/adr/` holds its decisions.

## Quiz

1. A workflow opts in to Engine v2, but Engine v2 cannot run it. What happens?
   - A. The run fails with a reason for the user.
   - B. The run falls back to the v1 engine.
   - C. The run waits until Engine v2 supports it.
   - D. n8n turns off the opt-in.
2. Does an Engine v2 run create a row in `execution_entity`?
   - A. Yes, as every execution does.
   - B. Only for manual runs.
   - C. Only after the run ends.
   - D. No. Engine v2 keeps its state in its own database.
3. Where does code go that adapts Engine v2 to v1 nodes and types?
   - A. Into the core of the engine.
   - B. Into `n8n-workflow`.
   - C. Into the compatibility package.
   - D. Into the control plane in `packages/cli/`.
4. An instance runs in queue mode. What does the Engine v2 module do?
   - A. It sends its steps to the Bull queue.
   - B. It refuses to start.
   - C. It runs only on workers.
   - D. It runs only on the leader.

<details>
<summary>Answers</summary>

1. A. A workflow that opts in never falls back to v1.
2. D. No v1 code runs for a workflow that opts in.
3. C. The core of the engine does not import `n8n-workflow`, not even its types.
4. B. The engine has no queue mode yet, and its work queues live in memory.

</details>
