---
title: Task runners
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# Task runners

Read this when you touch the Code node, user code isolation, the task broker, or the runner processes.

## What it is

**Task runners** run user code from the Code node, in JavaScript and Python, outside the n8n main or worker process. n8n hosts a **task broker**: an HTTP and WebSocket server on its own port. The broker matches **task requests** from the workflow engine with **task offers** from connected runners.

In `internal` mode, n8n starts the runners as child processes. In `external` mode, a separate launcher starts the runners, and they connect to the broker with a shared token.

## Why it has this shape

**User code runs in another process.** The Code node once ran user code in a sandbox inside the n8n process. A runner process keeps user code apart from n8n, and n8n can stop it. In internal mode, a task that times out also restarts its runner. Runners are always on. The legacy Function nodes still use the in-process sandbox.

**Runners offer, the broker matches.** A runner sends an offer for each free slot, every 250 milliseconds, and each offer expires after about five seconds. `TaskBroker.settleTasks()` pairs a pending request with a matching offer. It is synchronous on purpose. Its comment says "DO NOT MAKE THIS FUNCTION ASYNC", because it relies on never yielding while it walks the two lists.

**The runner asks for the data it needs.** The JavaScript runner parses the code to learn which built-ins it uses, such as `$json`. Then it sends a data request for only that data. A Code node that reads only `$json` does not copy the output of every upstream node.

**Helpers are RPC calls.** Helper calls such as HTTP requests travel through the broker back to n8n, which runs them.

**Python runs natively.** The Python runner forks a subprocess for each task and filters the built-ins. It replaced Pyodide, which had run inside the n8n process.

**Runners live next to the engine.** The runner runs beside the process that runs workflows: the main in regular mode, the worker in queue mode. A main in queue mode skips its runner when manual executions go to workers. Each main in multi-main has its own broker.

**Each child connects with a grant token.** The broker mints a single-use token with a short life. The child uses it once to connect.

**Out-of-memory errors get a clear message.** A disconnect analyzer reads the child's output. When it finds an out-of-memory message, the user sees a memory error instead of a generic disconnect.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Startup | `packages/cli/src/task-runners/task-runner-module.ts` | `TaskRunnerModule.start` |
| Matching and timeouts | `packages/cli/src/task-runners/task-broker/task-broker.service.ts` | `TaskBroker.settleTasks` |
| Broker server | `packages/cli/src/task-runners/task-broker/task-broker-server.ts` | `TaskBrokerServer` |
| Requester side | `packages/cli/src/task-runners/task-managers/task-requester.ts` | `TaskRequester.startTask` |
| Child process, JavaScript | `packages/cli/src/task-runners/task-runner-process-js.ts` | `JsTaskRunnerProcess` |
| Child process, Python | `packages/cli/src/task-runners/task-runner-process-py.ts` | `PyTaskRunnerProcess` |
| JavaScript runner | `packages/@n8n/task-runner/src/task-runner.ts` | `TaskRunner` |
| Runner settings | `packages/@n8n/config/src/configs/runners.config.ts` | `TaskRunnersConfig` |
| The consumer | `packages/nodes-base/nodes/Code/Code.node.ts` | `Code` |

## What is moving

- The default task timeout is 300 seconds. A config comment says v3 reduces it to 60.
- The runner image README labels external mode a preview. A code comment says internal mode is not recommended for production.

## Read more

- `docker/images/runners/README.md`
- `packages/@n8n/task-runner-python/README.md`
- [Life of a webhook execution](../life-of-a-webhook-execution.md) for a node inside a run
- docs.n8n.io: task runners configuration page
