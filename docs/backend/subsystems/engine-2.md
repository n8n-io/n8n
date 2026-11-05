---
title: Engine v2
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# Engine v2

Read this when you see `engine-v2`, `@n8n/engine`, or the control plane and data plane, and you need to know what exists today.

## What it is

Engine v2 is a new workflow execution engine in `packages/@n8n/engine`. The code calls it "engine v2", not "Engine 2.0". It models a run as a graph of steps that workers take from work queues. Its state lives in its own PostgreSQL database, the **data plane**. `packages/cli` is the engine **control plane**. Do not confuse it with the Cloud control plane. `@n8n/node-engine-compatibility` converts v1 workflow JSON into a graph and runs v1 nodes as steps.

A workflow opts in with `settings.engineType` set to `v2`. `WorkflowRunner.run` asks the dispatcher first. For manual, webhook, and trigger runs of such a workflow, no v1 code runs and no control plane execution row exists. The data plane is the source of truth for that run.

## Why it has this shape

- **HTTP between the planes, even in one process.** The comment on `EngineDataPlaneClient` gives the reason. A network-shaped contract lets the engine move out of the process without changes to callers. `N8N_ENGINE_MODE` already selects `in-process` or `remote`. In remote mode, the `n8n engine` command hosts the data plane.
- **A pure core.** The engine copies the modularity blueprint of `packages/@n8n/scheduler`. The core folders `graph/`, `execution/`, and `admittance/` get every effect as an injected interface. The engine does not import `n8n-workflow` at all, not even types. v1 adaptation goes in `@n8n/node-engine-compatibility`.
- **No fallback to v1.** A workflow that opts in never runs on v1. The dispatcher fails with a user-facing reason instead, because a silent fallback runs the workflow on an engine that the user did not pick.
- **Reconciliation, not transactions.** Handlers advance an execution through several separate writes. A crash can leave partial state. The planned answer is a reconciliation layer, not transactions across stores and queues. Reviewers give this answer often.
- **No queue mode.** The in-process engine uses an in-memory queue. Its work is lost when the process ends and other mains or workers cannot share it. The module refuses queue mode for this reason.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Routing decision | `packages/cli/src/services/engine-v2-dispatcher.service.ts` | `EngineV2Dispatcher.routesToEngineV2` |
| Entry from the v1 runner | `packages/cli/src/workflow-runner.ts` | `WorkflowRunner.run` |
| Module, main only | `packages/cli/src/modules/engine-v2/engine-v2.module.ts` | `EngineV2Module` |
| In-process composition root | `packages/cli/src/modules/engine-v2/engine-v2.runtime.ts` | `EngineV2Runtime.init` |
| Indirection between the planes | `packages/cli/src/services/engine-data-plane-proxy.service.ts` | `EngineDataPlaneProxyService` |
| Lifecycle events from the data plane | `packages/cli/src/modules/engine-v2/engine-control-plane-server.ts` | `EngineControlPlaneServer` |
| Engine factory | `packages/@n8n/engine/src/runtime/create-engine-runtime.ts` | `createEngineRuntime` |
| Remote data plane process | `packages/cli/src/commands/engine.ts` | `Engine` |
| v1 graph conversion | `packages/@n8n/node-engine-compatibility/src/v1-workflow-converter.ts` | `V1WorkflowConverter` |
| v1 nodes as steps | `packages/@n8n/node-engine-compatibility/src/v1-step-executor.ts` | `V1StepExecutor` |
| Configuration | `packages/@n8n/config/src/configs/engine.config.ts` | `EngineConfig` |

`N8N_ENABLED_MODULES=engine-v2` loads the module. The configuration comments say "This is in development and not ready for use".

## What is moving

Engine v2 is opt-in and not ready for users. Recent work added waits and resumes through the waiting-webhook routes, and sub-workflows as child executions. The data plane can now reach data tables and credentials. The open items carry ticket ids in the code. Admittance admits every execution (`TODO(CAT-2909)` in `EngineV2Runtime`). The reconciliation layer is still planned. The `@n8n/engine` README still says that the package is not wired into n8n. That statement is out of date.

## Read more

- `packages/@n8n/engine/AGENTS.md`, the current design statement and the rules for the core
- `packages/@n8n/engine/docs/adr/`, the engine decision records
- `packages/@n8n/scheduler/src/__tests__/dependency-purity.test.ts`, the enforcement pattern the engine copies
- [Legacy and new](../legacy-and-new.md#engine-v2)
