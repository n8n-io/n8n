# AGENTS.md

Extra information specific to the `@n8n/db` package.

## TypeORM boundary

This package **is** the persistence layer, so importing `@n8n/typeorm` here is
expected. The convention for the rest of the codebase — business logic must not
import `@n8n/typeorm` — is in the root [AGENTS.md](../../../AGENTS.md)
("Persistence layer & the TypeORM boundary"), along with the anti-patterns
reviewers reject.

When you add a repository method for a consumer, name it for the use case and
type its parameters and return value in **domain terms** — don't surface
`FindOptionsWhere` / entity-`Repository` methods across the boundary, and don't
add generic `find(options)` passthroughs. This keeps operators and query
construction inside the persistence layer where they belong.

Repositories in this package follow the same rule as everywhere else: compose a
file-private `BaseRepository` subclass (the table), do not extend it. Otherwise
every injecting service inherits the full TypeORM surface and the boundary is
gone. `src/repositories/deployment-key.repository.ts` is the in-package example;
the root AGENTS.md "Repositories compose, they don't extend" bullet has the
rules. Do not add new `extends BaseRepository` repositories.

## Transactions

Both transaction primitives live here: the deprecated `withTransaction` helper
(`src/utils/transaction.ts`) and the `TransactionRunner` port
(`src/services/transaction.ts`). New code uses `TransactionRunner`; see the root
and `packages/cli` AGENTS.md for which to use and why.

## Database migrations

For full guidance on authoring migrations — scaffolding, the pre-flight
checklist the `@n8n-io/migrations-review` team enforces, the
`MigrationContext` API reference, the DSL type mapping, and the detailed
rule catalogue — use the **`n8n:db-migrations`** skill.

Source-of-truth files the skill defers to:
- `packages/@n8n/db/src/migrations/migration-types.ts` — `MigrationContext`, `ReversibleMigration`, `IrreversibleMigration`
- `packages/@n8n/db/src/migrations/dsl/` — schema builder DSL
- `packages/@n8n/backend-test-utils/MIGRATION_TESTING.md` — migration testing helpers
