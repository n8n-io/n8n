---
name: n8n:db-migrations
description: Authors n8n database migrations. Use when creating or modifying files under packages/@n8n/db/src/migrations/, when the user asks to add a column, table, index, foreign key, or backfill, or when the user mentions DB migrations or TypeORM migrations.
---

# Write n8n DB migrations

**Rule of thumb:** the `@n8n-io/migrations-review` team gates every migration PR. The fixes they ask for are predictable — work through the checklist below before requesting review.

## Scaffolding

Use the generator — it picks a safe timestamp (strictly greater than every existing migration), writes the scaffold, and registers the migration in the right `index.ts`:

```sh
pnpm --filter=@n8n/db migration:new <PascalCaseName> [--folder=common|postgresdb|sqlite]
```

`--folder` defaults to `common`; use `postgresdb` or `sqlite` only for dialect-specific migrations. See `packages/@n8n/db/AGENTS.md` for the full rationale (timestamp invariants, the `migration-timestamp` lint rule that enforces them, and the do-not-use-`autoGenerate2`-on-UUIDs rule).

```
packages/@n8n/db/src/migrations/
├── common/        # default — DSL handles SQLite + Postgres
├── postgresdb/    # Postgres-only behavior (e.g. ALTER COLUMN TYPE)
├── sqlite/        # SQLite-only override (subclass + withFKsDisabled)
└── mysqldb/       # do NOT add new files here (MySQL/MariaDB support is deprecated)
```

After a rebase, re-run the generator's logic to bump the timestamp so the migration stays the newest; the lint rule will flag any drift.

## Which directory?

```
single schema change, DSL covers it       → common/
Postgres-only feature (gen_random_uuid,
  ALTER COLUMN TYPE, partial expr index)  → postgresdb/
SQLite needs different recipe or to skip
  CASCADE on table recreate               → sqlite/ (subclass common/, set withFKsDisabled = true as const)
```

If only Postgres needs the change, put the file under `postgresdb/` only — don't write a no-op SQLite migration with `if (isPostgres)` guards.

## Class shape

```ts
import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddFooBar1700000000000 implements ReversibleMigration {
  async up({ schemaBuilder: { addColumns, column, createIndex }, escape }: MigrationContext) {
    // ...
  }

  async down({ schemaBuilder: { dropIndex, dropColumns } }: MigrationContext) {
    // ...
  }
}
```

- `ReversibleMigration` (default) requires both `up` and `down`.
- `IrreversibleMigration` only when `down()` would lose data unrecoverably. Don't use it to skip writing `down()`.
- `withFKsDisabled = true as const` only in `sqlite/` subclasses that recreate FK-referenced tables (otherwise SQLite's CASCADE eats data).
- Use the schema builder DSL — see `MigrationContext` in `packages/@n8n/db/src/migrations/migration-types.ts`. Drop to `runQuery` only for DB-specific features the DSL can't express.

## Pre-flight checklist

Run through this before requesting review. Each item is a real, recurring reviewer flag.

- [ ] Migration was scaffolded with `pnpm --filter=@n8n/db migration:new` (timestamp + registration are then automatic; the `migration-timestamp` lint rule catches drift).
- [ ] Identifiers go through **`escape.tableName(...)` / `escape.columnName(...)`**. Never hand-write `n8n_table` prefixes.
- [ ] **Match column type to value semantics.** Native `uuid` for UUIDs, `timestampTimezone()` for timestamps, a numeric type (`int`/`bigint`/etc.) for numbers, `bool` for booleans, `json` for structured data. Never `varchar` as a catch-all for non-string values — it loses sort order, range queries, and aggregations.
- [ ] **Pick the narrowest sane type within that category:** `int`/`smallint` not `bigint` when range allows; `text` not `varchar(255)` for unbounded strings; never `double` for version numbers (floating-point precision).
- [ ] **Default `notNull`**, relax only when justified. PK is implicitly NOT NULL — don't repeat. Migration's `notNull` matches the entity's nullability.
- [ ] **Enum-like columns** carry `.withEnumCheck([...])` AND `.comment('explains values')`. Opaque IDs / unix timestamps / JSON shapes also get `.comment()`.
- [ ] **Every reference column has an explicit FK** with deliberate `onDelete`. Name FKs explicitly when SQLite recreate cycles risk duplicating them. (For broader design guidance on polymorphic `(typeCol, idCol)` patterns, see `reference.md` section N.)
- [ ] **Indexes match real query patterns.** Don't add indexes "in case." A unique constraint already creates an index; a composite PK indexes its prefix columns. Mirror `withIndexOn(...)` to entity `@Index(...)`.
- [ ] **Sparse-unique columns:** use a partial index `WHERE col IS NOT NULL` to exclude NULL rows. Smaller index and no uniqueness checks against the NULL bucket.
- [ ] **Composite index column order** matches your actual `WHERE` / `ORDER BY` usage; an index on `(A, B)` serves `WHERE A` and `WHERE A AND B`, not `WHERE B` alone.
- [ ] **Entity ↔ migration parity**: column types, `notNull`, defaults, FKs, `@Index` decorators all match. Drift here causes silent runtime bugs.
- [ ] **No live-app imports** in the migration body. Duplicate types/utility code locally — the migration must produce the same result a year from now even if app code drifts.
- [ ] **`async down()` was tested locally**: `pnpm start && pnpm start -- db:revert && pnpm start` on **both** SQLite and Postgres. The revert command lives at `packages/cli/src/commands/db/revert.ts`.
- [ ] **One logical change per migration**; split unrelated table changes into separate files.

If any item fails, fix it before opening review.

## Data migrations / backfills

- Push the work into **a single SQL statement** (`INSERT ... SELECT ...`, `UPDATE ... FROM ...`) — don't load the whole table into Node memory.
- Use `runInBatches(query, op, limit?)` only when SQL alone cannot express the transformation.
- **Filter early in SQL** with `LIKE`/`WHERE` to reduce parsing work on the Node side.
- **Always handle NULL/empty source values** explicitly. If the column being backfilled is nullable, decide what to do for NULL and empty rows.
- When two columns are denormalized/duplicated across tables, **keep them in sync** during the backfill or the data goes inconsistent.
- Verify row counts before swapping/dropping a temp table; throw on mismatch.
- Avoid `WHERE jsonblob LIKE '%foo%'` scans on hot tables (e.g. `execution_entity`) — add a real marker column or a marker table instead.

## Deletion-style backfills

For deletion-style backfills (move data from old location A to new location B, then delete from A), **don't delete A in the same migration**. Self-hosted instances have data shapes the team never sees, and if the transformation is partial for some user, the old data is the only recovery path. Default to two-release expand-contract:
- **Release N (this migration):** write the new location, leave the old in place.
- **Release N+1 (separate follow-up migration, after the new code has been observed in production):** drop the old location.

Exceptions: the old location is genuinely throwaway (e.g. a temp table this same migration created), or compliance requires immediate deletion — in which case mark the migration `IrreversibleMigration` and call out the trade-off in the PR description.

## Testing

- Test file: `packages/cli/test/migration/{timestamp}-{kebab-name}.test.ts`.
- Use `initDbUpToMigration(name)` + `runSingleMigration(name)` from `@n8n/backend-test-utils`. Full API: `packages/@n8n/backend-test-utils/MIGRATION_TESTING.md`.
- Insert fixtures via **raw SQL** with `context.escape.tableName(...)` and `context.runQuery(sql, namedParams)`. **Never** through TypeORM repositories — they evolve with the schema and break old tests over time.
- Assert via raw SQL too. Branch on `context.isPostgres` / `context.isSqlite` for DB-specific assertions (e.g. `PRAGMA table_info` vs `information_schema`).
- Cover the data-migration edge cases: NULLs, duplicates, invalid rows, rows already in target shape.
- Read a recent test file from `packages/cli/test/migration/` for the full shape.

## After authoring

1. Run `pnpm typecheck` and `pnpm lint` in `packages/@n8n/db` and `packages/cli`.
2. Run the migration test: `pushd packages/cli && pnpm test test/migration/{your-test}.test.ts && popd`.
3. Manual smoke test on both DBs: `pnpm start && pnpm start -- db:revert && pnpm start`.

## More

- **Full rule catalogue** (sections A–N): [reference.md](reference.md)
- **Real migrations to read for patterns**: browse `packages/@n8n/db/src/migrations/common/` (sort by timestamp for recent examples) — far more useful than synthetic templates.
- **UUID PK guidance**: `packages/@n8n/db/AGENTS.md` (don't use `autoGenerate2` on UUID PKs — generate at app level with `randomUUID()`)
- **Test API**: `packages/@n8n/backend-test-utils/MIGRATION_TESTING.md`
- **Source of truth for `MigrationContext`**: `packages/@n8n/db/src/migrations/migration-types.ts`
- **Schema DSL**: `packages/@n8n/db/src/migrations/dsl/`
