---
title: Lifecycle and governance
audience: Backend engineers new to n8n
tier: 3
reading_time: 6 min
last_reviewed: 2026-09-02
owner: "@n8n-io/ligo"
---

# Lifecycle and governance

Read this when you touch source control, variables, git connections, workflow reviews, version history, the breaking-change report, or the export and import commands.

## What it is

This domain covers how workflows and related resources move between instances and how change is controlled. **Source control** syncs an instance with a git branch, the feature users know as Environments. **Git connections** is a newer, public-API-first way to push and pull team projects as packages. **Workflow reviews** gate publishing behind an approval. **Instance version history** records which n8n versions the instance has run. **Breaking changes** produces a pre-upgrade report. The export and import CLI commands move workflows, credentials, or whole databases as JSON.

## How it works

**Source control.** The module loads preferences from `settings` rows: repository URL, branch, read-only flag, and connection type, with the key pair and HTTPS credentials in sibling rows. A git service wraps a git client and points it at n8n's own key. A push runs under a mutex, resolves which files the user may push, writes workflows, credential stubs, projects, tags, folders, variables, and data tables into the work folder, then stages, commits, and pushes. A pull computes status, returns 409 on conflicts unless forced, imports in dependency order, and deletes resources removed from the repository. A read-only branch flips the whole instance to read-only.

**Variables.** The controller and service remain in `packages/cli/src/environments.ee/variables`. A variable is global when it has no project. Writes are licensed and capped by a quota.

**Git connections.** Connections live in `git_connection`, linked to projects. Clone, push, and pull work on a per-connection working copy. Push exports team projects through the n8n packages pipeline. Pull imports with the working copy as the source of truth. It is exposed only through the public API, and the module is opt-in through `N8N_ENABLED_MODULES`.

**Workflow reviews.** The module registers a publish guard with a proxy in the non-module part of `packages/cli`, so that publishing a workflow with an open review request fails with a reason, and a lifecycle service with the mutation hooks proxy. A feature gate checks both the license and an instance policy row that is off by default.

**Instance version history.** On the leader, the service compares the running version with the newest row and inserts one when it changed. Four read endpoints feed the publish timeline in the editor.

**Breaking changes.** The module returns early when the target version constant is null, which it is today. Otherwise rules decorated `@BreakingChangeRule({ version })` register, and a report endpoint runs instance, workflow, and batch rules. A migration registry can apply node migrations to a workflow. Rules for v2 and v3 both exist.

**Export and import.** `export:workflow`, `export:credentials`, `export:nodes`, and the import counterparts operate on JSON files. `export:entities` and `import:entities` dump and restore whole tables, including the data table user tables, with an optional custom encryption key.

## Where to look

| Path | What |
|---|---|
| `packages/cli/src/modules/source-control.ee/` | Service, git service, preferences, export, import, status, controller, README |
| `packages/cli/src/environments.ee/variables/` | Variables controller and service |
| `packages/cli/src/modules/git-connections.ee/` | Connections, plus the public controller under `packages/cli/src/public-api/v1/controllers/` |
| `packages/cli/src/modules/workflow-reviews.ee/` | Requests, feature gate, publish guard, lifecycle service |
| `packages/cli/src/modules/instance-version-history/` | Service and controller |
| `packages/cli/src/modules/breaking-changes/` | Rule engine, registry, migrations, README |
| `packages/cli/src/commands/export/`, `import/`, `packages/cli/src/services/export.service.ts`, `import.service.ts` | The CLI commands |

## What it owns

Source control owns no table. Preferences are `settings` rows. Variables own `variables`. Git connections own `git_connection` and a project join table with one connection per project. Workflow reviews own six tables under `@n8n/db` for requests, reviewers, authors, activity, comments, and the request-to-workflow join. Instance version history owns `instance_version_history`. Breaking changes owns no table.

## Flags

`feat:sourceControl`, `feat:gitConnections`, and `feat:workflowReviews` on their modules. `feat:variables` on variable writes with `quota:maxVariables`. Instance version history and breaking changes have no license flag. `MIGRATION_REPORT_TARGET_VERSION` in `@n8n/api-types` switches the breaking-change report on for a major version.

## Per mode

Main only, except workflow reviews, which declares no instance types and so loads everywhere. Two v2 breaking-change rules skip on Cloud, about file permissions and the runner image, because Cloud controls both. The `import:entities` command prints that it is under development.

## Was, is, goes

**Was.** Source control started as "Version control" in 2023, lived in `environments.ee`, and moved to a module in January 2026. Only variables remain in the old folder. **Is.** Git connections is new in August 2026 and reuses the packages pipeline rather than the source control exporters. Workflow reviews began in July 2026. **Goes.** Whether git connections replaces source control is not stated in code. The breaking-change README describes v2 only, while v3 rules already exist for the October 2026 release.

## Terms

- **environments**: the user-facing name for source control between instances.
- **work folder**: the local checkout the source control service writes to and reads from.
- **git connection**: a per-instance link to a repository for team projects, distinct from source control.
- **review request**: an approval gate on publishing a workflow.
- **breaking-change rule**: a class that inspects the instance or a workflow and reports what a major version changes.

## Read more

- `packages/cli/src/modules/source-control.ee/README.md`
- `packages/cli/src/modules/breaking-changes/README.md`
- `.github/DEVELOPING_V3.md`
- docs.n8n.io: source control and environments, and the breaking changes pages
