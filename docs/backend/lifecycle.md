---
title: Lifecycle
last_reviewed: 2026-11-06
contact: ivov
---

# Lifecycle

[How n8n runs](how-n8n-runs.md) named the three roles of an n8n process: main, worker, and webhook process. This page explains how a process starts, which modules it starts, how it loads nodes, and how it stops.

## Startup

Every role runs the `n8n` command, from the [`n8n` npm package](https://www.npmjs.com/package/n8n).

Three subcommands start a role, and the process keeps running: `n8n start` for a main, `n8n worker`, and `n8n webhook`. Most other subcommands, e.g. `n8n export:workflow`, do one job and exit.

Every role starts in this order:

1. Load configuration and modules.
2. Load nodes and credential types.
3. Connect to the database, and run pending [migrations](how-to/write-a-database-migration.md#how-n8n-runs-migrations).
4. Start modules.
5. Start the role, e.g. a main starts serving requests, and a worker dequeues jobs.

A process creates its services with the dependency injection container at `@n8n/di`. The container creates one instance of each `@Service()` class.

Decorators from `@n8n/decorators`, e.g. `@RestController()` or `@SystemTask()`, only record metadata. At startup, n8n reads this metadata and registers routes and tasks. A new route or task therefore needs no registration code.

Configuration comes from env vars, through `@Config` classes at `@n8n/config`. The container creates each `@Config` class once, at startup. Some settings also have a value in the database, which the owner or an admin saves in the UI.

> [!IMPORTANT]
> **A setting that an admin saves in the UI overrides its env var.** For example, the Assistant sandbox stays off after an admin turns off the sandbox, even when `N8N_INSTANCE_AI_SANDBOX_ENABLED` is `true`.

Each process has a **host ID**, e.g. `main-6bf523178bc6`. A pubsub message names its sender by host ID. Do not confuse the host ID with the **instance ID**, which identifies the whole deployment. Telemetry and the license rely on the instance ID.

## Modules

A **module** is a feature that n8n starts or skips as one unit. n8n starts a module when all of these are true:

1. The module is in the module list: default modules, plus `N8N_ENABLED_MODULES`, minus `N8N_DISABLED_MODULES`.
2. The role of the process is in the `instanceTypes` of the module. A module without `instanceTypes` starts on every role.
3. The license has the `licenseFlag` of the module, if the module sets one.

n8n checks these conditions only at startup. A module that does not start still has its tables, because n8n runs all migrations. [Build a backend module](how-to/build-a-backend-module.md#set-license-and-instance-types) shows how to set `instanceTypes` and `licenseFlag`.

A module that starts can still keep parts of its feature off, with a [license check on a route](licensing.md#license-checks) or a [PostHog flag](how-to/roll-out-a-change.md).

## Loading of node and credential types

Node types and credential types are classes in npm packages:

- `n8n-nodes-base`
- `@n8n/n8n-nodes-langchain`
- community packages

A node type name starts with the package name, e.g. `n8n-nodes-base.webhook`. A credential type name has no prefix, e.g. `slackApi`. Every process loads these packages.

At startup, a process reads only the list of node types and credential types in each package. The process loads a class only when n8n first needs it.

n8n has two ways to block a node type:

- With `NODES_EXCLUDE`, no process loads the node type, so a workflow that uses the node fails.
- With a [policy](authorization.md#policies), the node type stays loaded, and n8n refuses the action on the workflow. A policy can also block a credential type.

## Shutdown

When a process stops, n8n calls the `@OnShutdown()` methods of its services, by priority. The start and worker commands also call the `shutdown()` method of a few services directly. New cleanup belongs in an `@OnShutdown()` method, so that it runs in the shutdown sequence.

Before a worker exits, the worker waits for its running jobs, up to 30 seconds by default. With `N8N_WORKER_SUSPEND_EXECUTIONS_ON_SHUTDOWN=true`, the worker instead pauses each production execution at the next node, and another worker resumes the execution.

## Quiz

1. A worker starts after a release that adds a migration. What does it do before it dequeues jobs?
   - A. Nothing. Only mains migrate.
   - B. It waits until a main has migrated.
   - C. It runs pending migrations itself.
   - D. It reads the schema from Redis.
2. `N8N_INSTANCE_AI_SANDBOX_ENABLED` is `true`, but an admin turned off the sandbox in the Assistant settings. Is the sandbox on?
   - A. Yes. The env var wins.
   - B. No. The saved value wins.
   - C. It depends on the license.
   - D. Only on mains.
3. `N8N_DISABLED_MODULES` names a module. Does the database have the tables of the module?
   - A. Yes. n8n runs all migrations.
   - B. No. n8n skips the migrations of the module.
   - C. Only after the module starts once.
   - D. Only on the leader.
4. You add a `shutdown()` method to a service, without a decorator. When does it run?
   - A. When the process stops.
   - B. Never.
   - C. When the container removes the service.
   - D. On the leader only.

<details>
<summary>Answers</summary>

1. C. Every process runs pending migrations at startup.
2. B. The env var gives only the default. The value in the database wins.
3. A. A module that does not start still has its tables.
4. B. n8n calls only the methods that `@OnShutdown()` marks.

</details>
