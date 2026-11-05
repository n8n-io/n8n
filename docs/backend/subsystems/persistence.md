---
title: Persistence
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# Persistence

Read this when you add a table or a column, write a query, store execution data, or touch binary files.

## What it is

Persistence stores n8n state in SQLite or PostgreSQL through a forked TypeORM, `@n8n/typeorm`. It also covers the blob stores that keep execution data and binary files outside the database. The `@n8n/db` package owns the entities, the repositories, the `DbConnection` service, and the migrations.

Execution rows always live in the database. The execution data bundle and binary files can go to the database, the filesystem, S3, or Azure. Two separate mode settings choose where.

## Why it has this shape

**The schema is the migrations.** Entities run with `synchronize: false`, so a change to an entity does nothing until a migration makes the same change. `docs/db.md` states this rule and points to the generated schema docs in `docs/generated/`. Module entities join through `ModuleRegistry.entities`, but their migrations still live in `@n8n/db`. Most migrations sit in `packages/@n8n/db/src/migrations/common/` and use a small DSL that works on both databases.

**Mains can boot at the same time.** On PostgreSQL, `DbConnection.migrate()` runs the migrations under an advisory lock, so two mains do not migrate at once.

**TypeORM stays in the persistence layer.** Business logic must not import `@n8n/typeorm`. The Code Health rule `typeorm-persistence-boundary` fails CI on a new import, with old call sites in a shrink-only baseline. Services call use-case-named repository methods. For a unit of several writes, they inject the abstract `TransactionRunner` and thread its `ctx` into each repository call.

**Repositories compose, they do not extend.** A new repository holds a private `BaseRepository` subclass for its table and exposes only named methods. Repositories that extend `BaseRepository` are legacy. Root `AGENTS.md` explains why and names a worked example.

**Each execution remembers where its data is.** `ExecutionPersistence` stamps each new row with `storedAt`, the current storage mode tag. Reads follow the row's own `storedAt`, so a change of mode does not orphan old rows.

**Binary data moves to the database in queue mode.** Items hold only binary data ids. The default binary mode is `filesystem` in regular mode and `database` in queue mode, because workers and mains do not share a disk. S3 and Azure need a license.

**Pruning has two steps.** Prunable executions are soft-deleted first. Soft-deleted rows and their blobs are hard-deleted after a buffer. Both steps are cluster system tasks. They run on the leader's timer until the durable scheduler takes over system tasks. See [Scheduling and waiting](scheduling-and-waiting.md).

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Connect and migrate | `packages/@n8n/db/src/connection/db-connection.ts` | `DbConnection.migrate` |
| Connection options | `packages/@n8n/db/src/connection/db-connection-options.ts` | `DbConnectionOptions` |
| PostgreSQL version policy | `packages/@n8n/db/src/connection/postgres-version-policy.ts` | `OLDEST_SUPPORTED_POSTGRES_MAJOR` |
| Repository base | `packages/@n8n/db/src/repositories/base-repository.ts` | `BaseRepository.managerFor` |
| Transactions | `packages/@n8n/db/src/services/transaction.ts` | `TransactionRunner` |
| Composed repository example | `packages/cli/src/modules/inbound-auth-core/database/repositories/trusted-source.repository.ts` | `TrustedSourceRepository` |
| Execution rows and bundles | `packages/cli/src/executions/execution-persistence.ts` | `ExecutionPersistence` |
| Execution data mode | `packages/core/src/storage.config.ts` | `modeTag` |
| Binary data | `packages/core/src/binary-data/binary-data.service.ts` | `BinaryDataService` |
| Binary data mode | `packages/core/src/binary-data/binary-data.config.ts` | `BinaryDataConfig` |
| Soft-delete pruning | `packages/cli/src/services/pruning/execution-pruning-soft-delete.task.ts` | `ExecutionPruningSoftDeleteTask` |
| Crash recovery | `packages/cli/src/executions/execution-recovery.service.ts` | `ExecutionRecoveryService` |

## What is moving

- n8n supports PostgreSQL 17 and newer, and gives version 16 compatibility support. Older versions get a warning at startup, not a refusal.
- The TypeORM boundary work continues. See `legacy-and-new.md`, section "TypeORM into the persistence layer".

## Read more

- `docs/db.md` and `packages/@n8n/db/AGENTS.md`
- Root `AGENTS.md`, section "Persistence layer & the TypeORM boundary"
- [Patterns](../patterns.md#services-repositories-and-the-typeorm-boundary)
- `.agents/skills/db-migrations/SKILL.md`
- `packages/@n8n/backend-test-utils/MIGRATION_TESTING.md`
- `packages/@n8n/blob-storage/README.md` and `packages/@n8n/typeorm/README.md`
