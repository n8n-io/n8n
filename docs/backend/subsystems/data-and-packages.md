---
title: Data tables, packages, and indexes
audience: Backend engineers new to n8n
tier: 3
reading_time: 6 min
last_reviewed: 2026-09-02
owner: "@n8n-io/catalysts"
---

# Data tables, packages, and indexes

Read this when you touch data tables, community package installation, the `.n8np` package format, deduplication, or the workflow dependency index.

## What it is

**Data tables** give each project small user-defined tables with string, number, boolean, and date columns, which nodes read and write through a proxy, backed by one physical SQL table per data table. The **community packages** module installs npm packages of nodes into the instance and tracks them in the database. **n8n packages** is the `.n8np` import and export format that the public API, the CLI, and git connections use to move projects and workflows. **Deduplication** persists "already processed" keys per workflow so that nodes can skip repeats. The **workflow index** tracks each workflow's dependencies on credentials, data tables, sub-workflows, node types, and webhook paths.

## How it works

**Data tables.** The module registers two entities, `DataTable` and `DataTableColumn`, and hands a proxy service to the execution engine through `context()`. A DDL service creates, renames, and drops the per-table physical table named `<prefix>data_table_user_<id>`. In core, the data table helper functions read the proxy from the additional data, and the proxy allows only the data table and evaluation node types, so a Code node cannot use it. A size validator enforces `N8N_DATA_TABLES_MAX_SIZE_BYTES`, 200 megabytes by default. REST lives under projects with `dataTable:*` project scopes, plus a global list route and a CSV upload route.

**Community packages.** The module exposes entities, settings for the editor, commands, and a node loader per installed package. Installation runs under a mutex, downloads with npm from the configured registry, and, when a checksum is supplied, verifies integrity against the registry metadata. Unverified packages can be blocked by configuration. A verified list is fetched from an n8n API. Installs and uninstalls are broadcast to other mains through pubsub. A non-default registry requires `feat:communityNodes:customRegistry`. `@n8n/scan-community-package` is a standalone tool that checks npm provenance and runs static analysis. Nothing in the server imports it.

**n8n packages.** The service orchestrates exporters for projects, workflows, folders, credentials, data tables, variables, and tags into a tar or a directory, and importers that parse a manifest and dispatch to a project or a workflow importer. Size and entry limits protect the import. The module's `CLAUDE.md` states the rule: the feature is public-API-first, and the CLI wraps the API. A single option lives in up to four layers across three packages, so a change must propagate through all of them.

**Deduplication.** `DeduplicationHelper` implements the core interface and persists to `processed_data`, keyed by context and workflow, holding either a set of entries or a latest incremental key. The Remove Duplicates node is the built-in consumer.

**Workflow index.** `WorkflowIndexService` subscribes to server start and workflow events and writes `workflow_dependency` rows for draft and published versions in batches. A query service answers dependency counts and details. It sits in the modules folder but is not a module: it has no entrypoint, is wired from `server.ts`, and cannot be disabled, because import and query services depend on it.

## Where to look

| Path | What |
|---|---|
| `packages/cli/src/modules/data-table/` | Module, proxy, DDL, rows repository, controllers, size validator |
| `packages/core/src/execution-engine/node-execution-context/utils/data-table-helper-functions.ts` | The engine side |
| `packages/cli/src/modules/community-packages/` | Service, config, verified list, controllers |
| `packages/@n8n/scan-community-package/` | The standalone scanner |
| `packages/cli/src/modules/n8n-packages/` | Exporters, importers, manifest schema, `CLAUDE.md` |
| `packages/cli/src/deduplication/`, `packages/core/src/data-deduplication-service.ts` | Deduplication |
| `packages/cli/src/modules/workflow-index/` | The index service and query service |

## What it owns

`data_table` and `data_table_column`, plus one physical table per data table. `installed_packages` and `installed_nodes`. `processed_data`. `workflow_dependency`. n8n packages owns no table.

## Flags

`N8N_DATA_TABLES_MAX_SIZE_BYTES` and its warning threshold. `N8N_COMMUNITY_PACKAGES_ENABLED`, `N8N_COMMUNITY_PACKAGES_REGISTRY`, `N8N_UNVERIFIED_PACKAGES_ENABLED`, `N8N_VERIFIED_PACKAGES_ENABLED`, and `N8N_COMMUNITY_PACKAGES_PREVENT_LOADING`. Package import limits in the n8n packages config. The license flag `feat:communityNodes:customRegistry`. Data tables have no license flag.

## Per mode

Data tables and deduplication run wherever executions run. Community package installation is a REST operation on a main, propagated by pubsub. The index runs on the main. No cloud branch in code.

## Was, is, goes

**Was.** Data tables were named Data Store until August 2025. Community package logic lived in `services` until modularized in August 2025. **Is.** n8n packages arrived in May 2026 and is now the engine behind git connections. **Goes.** A v3 rule changes the default so that unverified community packages stop loading unless explicitly allowed. The workflow index has no written reason for not being a module.

## Terms

- **data table proxy**: the object the engine hands to allowed nodes to read and write rows.
- **verified package**: a community package on n8n's verified list.
- **`.n8np`**: the package format for moving projects and workflows.
- **processed data**: the persisted set of keys a workflow has already handled.
- **workflow dependency**: an indexed link from a workflow to a credential, data table, sub-workflow, node type, or webhook path.

## Read more

- `packages/cli/src/modules/n8n-packages/CLAUDE.md`
- `packages/@n8n/scan-community-package/README.md`
- docs.n8n.io: data tables and community nodes pages
