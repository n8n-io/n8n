---
title: Lifecycle
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: ivov
---

# Lifecycle

[How n8n runs](how-n8n-runs.md) named the three process roles: main, worker, and webhook process. Every n8n process, from one main on a laptop to a worker in a cluster, starts the same way and builds its code from the same parts. This page explains how a process starts, which modules it starts, how it loads nodes, and how it stops.

## Startup

Every role uses the same `n8n` binary. The first argument selects the command: `start` for a main, `worker`, or `webhook`. Other commands, such as `export:workflow`, do one job and exit.

All three roles start the same way, so that they agree on nodes, tables, and identity. Each one loads its configuration, then the modules, then connects to the database and runs the pending [migrations](how-to/write-a-database-migration.md#how-n8n-runs-migrations). Then it loads the nodes and credentials, and starts its role.

A process builds its services with the container in `@n8n/di`, which creates one instance of each `@Service()` class. Most backend code also has a decorator from `@n8n/decorators`, such as `@RestController()` or `@SystemTask()`. A decorator only records metadata. n8n reads that metadata at startup and connects the code, so the code needs no explicit registration.

Configuration comes from env vars, through `@Config` classes in `@n8n/config`. The container creates each `@Config` class once, so a process reads its env vars only when it starts. Many features also have a setting that an admin saves in the database. An env var can give the default of that setting, but the saved value wins.

Each process has a **host id** of its own. The **instance id** is the same for every process of one deployment.

## Modules

Most features are modules. n8n starts a module when all of these are true:

1. The module is in the list of modules for the instance. That list is the default modules, plus `N8N_ENABLED_MODULES`, minus `N8N_DISABLED_MODULES`.
2. The process type is in the `instanceTypes` of the module. A module without `instanceTypes` runs on every process type.
3. The license has the `licenseFlag` of the module, if the module sets one.

n8n checks these only at startup. A module that does not start still has its tables, because n8n runs all migrations.

A module that starts can still keep its feature off. The AI modules, for example, also check the license and a setting of the feature. A PostHog flag then turns on or off a part of an AI feature, never the whole feature. [Build a backend module](how-to/build-a-backend-module.md#set-license-and-instance-types) shows the options.

## Node loading

Nodes are classes in npm packages: `n8n-nodes-base`, `@n8n/n8n-nodes-langchain`, and community packages. A node type name has the package as a prefix, for example `n8n-nodes-base.webhook`. Every process loads the same packages.

At startup, a process reads a list of the node types in each package. It loads the class of a node only when a workflow needs it. That keeps the startup fast with more than 600 node types.

A node can say that agents may use it as a tool. n8n then adds a tool version of that node type, which has no class of its own. An admin can install a community package from npm, and an install on one main reaches the other mains through pubsub.

When a saved workflow names a node type that the process does not have, the backend throws `UnrecognizedNodeTypeError`. This happens after an operator excludes a node, or when a community package is missing.

## Shutdown

When a process stops, n8n calls the `@OnShutdown()` methods of its services in order of priority. A method without the decorator does not run at shutdown. A worker waits for its running jobs before it exits, up to a timeout.

## Quiz

1. You change an env var that a `@Config` class reads while the process runs. When does the new value apply?
   - A. At once.
   - B. At the next request.
   - C. After a restart.
   - D. Never.
2. A worker starts after a release that adds a migration. What does it do before it takes jobs?
   - A. Nothing. Only mains migrate.
   - B. It waits until a main has migrated.
   - C. It runs the pending migrations itself.
   - D. It reads the schema from Redis.
3. You add a `shutdown()` method to a service, without a decorator. When does it run?
   - A. When the process stops.
   - B. Never.
   - C. When the container removes the service.
   - D. On the leader only.
4. An admin saved a feature setting as off. Its environment variable says on. Is the feature on?
   - A. Yes. The environment variable wins.
   - B. No. The saved value wins.
   - C. It depends on the license.
   - D. Only on mains.

<details>
<summary>Answers</summary>

1. C. A process reads its env vars when it starts.
2. C. Every process runs the pending migrations at startup.
3. B. n8n calls only the methods that `@OnShutdown()` marks.
4. B. An environment variable gives only the default of a setting.

</details>
