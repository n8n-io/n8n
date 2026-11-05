---
title: Lifecycle and governance
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: kgrhartlage
---

# Lifecycle and governance

Read this when you touch Environments (source control or promotions), variables, workflow reviews, version history, the migration report, or the export and import commands.

## What it is

This area covers how workflows move between instances and how teams control change.

- **Environments** connects an instance to git. Two generations exist. Environments v1 is the `source-control` module, which syncs the whole instance with one git branch. Environments v2 is the `promotions` module, which promotes team projects as packages between environments.
- **Variables** are instance or project values that workflows read.
- **Workflow reviews** put an approval step in front of publishing.
- **Instance version history** records which n8n versions the instance has run.
- **Breaking changes** produces the migration report before a major upgrade.
- The **export and import** CLI commands move workflows, credentials, or whole tables as JSON.

## Why it has this shape

- **Two Environments generations.** Each instance has an `environmentsVersion` in its source control preferences. An instance that was already connected to git keeps `v1`. A new instance gets `v2`. The value is written once, so that a later v1 disconnect does not move the instance to v2.
- **Promotions reuse the package format.** Environments v2 exports and imports through the n8n packages pipeline (`.n8np`), not through the source control exporters. Git hosts are adapters, so that promotion logic has no branch per host. A short-lived "git connections" feature came first. The promotions tables replaced it before release.
- **Source control is instance-wide.** A push or a pull runs under a mutex on one work folder. A read-only branch makes the whole instance read-only.
- **Publish guards through a proxy.** The workflow reviews module registers a publish guard on a proxy in `@n8n/backend-services`. `WorkflowService` calls the proxy, so it does not import the module. A workflow with an open review request then fails to publish with a reason.
- **The migration report is switched by a constant.** The module does nothing when `MIGRATION_REPORT_TARGET_VERSION` is null. It is `v3`. Rules use `@BreakingChangeRule`. Findings are stored in tables and kept current between full scans when workflows change.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Environments v1 push and pull | `packages/cli/src/modules/source-control.ee/source-control.service.ee.ts` | `SourceControlService.pushWorkfolder` |
| Environments version choice | `packages/cli/src/modules/source-control.ee/source-control-preferences.service.ee.ts` | `environmentsVersion` |
| Environments v2 | `packages/cli/src/modules/promotions.ee/promotions.service.ts` | `PromotionsService.promote` |
| Git host adapters | `packages/cli/src/modules/promotions.ee/git-hosts/git-host-clients.ts` | `GitHostClients` |
| Variables | `packages/cli/src/environments.ee/variables/variables.service.ee.ts` | `VariablesService` |
| Review publish guard | `packages/cli/src/modules/workflow-reviews.ee/workflow-review-publish-guard.service.ts` | `WorkflowReviewPublishGuard` |
| Publish guard proxy | `packages/@n8n/backend-services/src/workflows/workflow-publish-guard-proxy.service.ts` | `WorkflowPublishGuard` |
| Version history | `packages/cli/src/modules/instance-version-history/instance-version-history.service.ts` | `InstanceVersionHistoryService` |
| Migration report | `packages/cli/src/modules/breaking-changes/breaking-changes.module.ts` | `MIGRATION_REPORT_TARGET_VERSION` |
| Table dump and restore | `packages/cli/src/commands/export/entities.ts` | `ExportEntitiesCommand` |

## What is moving

Environments v2 is the default for new connections, and v1 stays for instances that already use it. The code does not say when v1 ends. The migration report gets frequent changes for the v3 release. The `import:entities` command prints that it is under development.

## Read more

- `packages/cli/src/modules/source-control.ee/README.md`
- `packages/cli/src/modules/promotions.ee/git-hosts/README.md`
- `packages/cli/src/modules/breaking-changes/README.md`
- [Data tables, packages, and indexes](data-and-packages.md) for the package format
- `.github/DEVELOPING_V3.md`
- docs.n8n.io: source control and environments, and the breaking changes pages
