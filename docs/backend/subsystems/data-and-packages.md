---
title: Data tables, packages, and indexes
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# Data tables, packages, and indexes

Read this when you touch data tables, community package installation, the `.n8np` package format, deduplication, or the workflow dependency index.

## What it is

- **Data tables** give each project small tables that users define. Nodes read and write them through a proxy. Each data table is one physical SQL table.
- **Community packages** installs npm packages of nodes into the instance and tracks them in the database.
- **n8n packages** is the `.n8np` import and export format. The public API, the CLI, and Environments v2 use it to move projects and workflows.
- **Deduplication** stores the keys that a workflow has already processed, so that nodes can skip repeats. The Remove Duplicates node is the built-in consumer.
- The **workflow index** records each workflow's dependencies on credentials, data tables, sub-workflows, node types, and webhook paths.

## Why it has this shape

- **Data tables reach nodes only through a proxy.** The module hands a proxy to the execution engine through its `context()` hook. The proxy accepts only the data table and evaluation node types, so a Code node cannot use it. Each table gets a physical table named `<prefix>data_table_user_<id>`.
- **Data tables are a module package.** Since November 2026, the backend lives in `packages/modules/data-table/backend`, outside `packages/cli`.
- **Package installs change every main.** Installation runs under a mutex and downloads with npm. When the verified list gives a checksum, the install checks it. A main broadcasts installs and uninstalls to the other mains through pubsub. `@n8n/scan-community-package` is a separate tool that checks npm provenance. The server does not import it.
- **n8n packages is public-API-first.** The CLI wraps the API. One import or export option therefore lives in up to four layers. They are the module, the DTO in `@n8n/api-types`, the public controller, and `@n8n/cli`. A new option must pass through all four. Importers plan and decide, and only services touch the database.
- **The workflow index is not a module.** It sits in the modules folder but has no module entry point. `server.ts` wires it, and it cannot be turned off, because import and query services depend on it. The code gives no written reason for this choice.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Data table module | `packages/modules/data-table/backend/src/data-table.module.ts` | `context` |
| Node access to data tables | `packages/modules/data-table/backend/src/data-table-proxy.service.ts` | `ALLOWED_NODES` |
| Engine side of data tables | `packages/core/src/execution-engine/node-execution-context/utils/data-table-helper-functions.ts` | `getDataTableHelperFunctions` |
| Package installation | `packages/cli/src/modules/community-packages/community-packages.service.ts` | `CommunityPackagesService` |
| Package import and export | `packages/cli/src/modules/n8n-packages/n8n-packages.service.ts` | `N8nPackagesService.importPackage` |
| Deduplication | `packages/cli/src/deduplication/deduplication-helper.ts` | `DeduplicationHelper` |
| Workflow index | `packages/cli/src/modules/workflow-index/workflow-index.service.ts` | `WorkflowIndexService` |
| Dependency queries | `packages/cli/src/modules/workflow-index/workflow-dependency-query.service.ts` | `WorkflowDependencyQueryService` |

Data tables and deduplication run wherever executions run. Package installation is a REST operation on a main.

## What is moving

Environments v2 is the main new consumer of n8n packages. Options that only promotions need can stop at the module layer. The module `CLAUDE.md` lists those exceptions.

## Read more

- `packages/cli/src/modules/n8n-packages/CLAUDE.md`, the rules for the package format
- `packages/@n8n/scan-community-package/README.md`
- [Lifecycle and governance](lifecycle-and-governance.md) for Environments v2
- docs.n8n.io: data tables and community nodes pages
