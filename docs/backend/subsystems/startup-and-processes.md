---
title: Startup and process roles
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# Startup and process roles

Read this when you need to know what happens between `n8n start` and the first HTTP request, or which process does what in queue mode.

## What it is

The `n8n` binary is one Node.js entry point. The first CLI argument selects a **process role**. `start` makes a **main**, `worker` makes a **worker**, and `webhook` makes a **webhook process**. Other commands, such as `execute` or `license:info`, run once and exit.

Every role runs one shared sequence in `BaseCommand.init()`. Then the role adds its own steps. `InstanceSettings` in `n8n-core` holds the process identity: the instance type, a host id for each process, the leader or follower role, and the encryption key.

## Why it has this shape

**One init sequence for all roles.** Mains, workers, and webhook processes must agree on nodes, database schema, and identity. A shared sequence keeps them in step. Each command sets flags such as `needsTaskRunner` to switch optional steps on or off.

**Config loads before entities.** `packages/cli/bin/n8n` loads the config early. TypeORM entity decorators read the database type when they load, so `GlobalConfig` must be ready first.

**Modules load before the database connects.** `CommandRegistry` calls `ModuleRegistry.loadModules()` before `init()`. A module can then add its commands and its entities to the schema before migrations run.

**Only mains get a leader role.** `instanceRole` starts as `unset`. A main becomes `leader` or `follower`. Workers and webhook processes stay `unset`. In regular mode the main marks itself leader at once. In queue mode, `Start.initOrchestration()` sets up pubsub, then runs leader election in multi-main or marks the main leader.

**A custom command registry.** Commands were once built on `oclif`. The current `CommandRegistry` reads `@Command` metadata and parses flags against a zod schema for each command.

**Ordered shutdown.** Services register `@OnShutdown` handlers. `ShutdownService` runs them by priority, and a timer forces the exit if they take too long. A crash journal file exists while a production process runs. If the file is present at boot, the last run did not exit cleanly.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Process entry | `packages/cli/bin/n8n` | `GlobalConfig` |
| Command lookup and lifecycle | `packages/cli/src/command-registry.ts` | `CommandRegistry` |
| Shared init sequence | `packages/cli/src/commands/base-command.ts` | `BaseCommand.init` |
| Main process | `packages/cli/src/commands/start.ts` | `Start.initOrchestration` |
| Worker process | `packages/cli/src/commands/worker.ts` | `Worker` |
| Webhook process | `packages/cli/src/commands/webhook.ts` | `Webhook` |
| Process identity | `packages/core/src/instance-settings/instance-settings.ts` | `InstanceSettings.markAsLeader` |
| Module loading | `packages/@n8n/backend-common/src/modules/module-registry.ts` | `ModuleRegistry.loadModules` |
| Ordered shutdown | `packages/cli/src/shutdown/shutdown.service.ts` | `ShutdownService` |
| Crash detection | `packages/cli/src/crash-journal.ts` | `didLastSessionCrash` |
| Retired settings | `packages/cli/src/deprecation/deprecation.service.ts` | `DeprecationService` |

## What is moving

- The workflow publication service is on by default. At startup the main starts its outbox consumer instead of `ActiveWorkflowManager.init()`. Setting `N8N_USE_WORKFLOW_PUBLICATION_SERVICE` to `false` keeps the old path.
- In queue mode, n8n logs a deprecation warning when `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS` is not set. In v3, manual executions always run on workers.

## Read more

- [Scaling and multi-main](scaling-and-multi-main.md) for leader election and pubsub
- [Patterns](../patterns.md#lifecycle-hooks) for `@OnShutdown` and the other lifecycle hooks
- [Patterns](../patterns.md) for the module lifecycle
- [Build a backend module](../how-to/build-a-backend-module.md)
- `packages/cli/AGENTS.md`
