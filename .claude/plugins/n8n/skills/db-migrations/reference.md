# Migration rule catalogue

Detailed rules for n8n migrations, organized by area. Each rule reflects
guidance the migrations-review team enforces on PRs.

---

## A. Schema design — types, sizes, defaults

**A1. Pick the narrowest sane type.**
- `DATE` not `timestamp` when only the date matters.
- `smallint` for small bounded counters/enums; `int` over `bigint` unless overflow is plausible.
- A numeric column type (`bigint` for byte counts and similar measurements) — never `varchar`. Storing numbers as strings loses sort order, range queries, and SUM/AVG aggregations.
- Native `uuid` over `varchar(36)` when the value is actually a UUID. Postgres stores `uuid` as 16 bytes vs ~37 for `varchar(36)`, and the difference compounds across joined tables and indexes.
- Use `bigint` proactively for monotonically-growing counters that can overflow `int` (insights/usage counters).
- Don't use `double` for version-like fields; floating-point precision bites. Use a string or split major/minor.
- `text` over `varchar(255)` for unbounded user-supplied strings unless a real limit applies. SQLite ignores `varchar(N)` length entirely; validate at the app layer if needed.

**A2. `NOT NULL` redundancy & entity parity.**
- A primary key is implicitly `NOT NULL`; don't redeclare.
- Migration's `notNull` must match the entity's nullability annotation. Mismatch causes runtime nulls TypeORM can't reconcile.
- Default to `NOT NULL`; relax only with explicit reasoning ("does this need to be nullable, and when?").

**A3. Comment non-obvious columns with `.comment()`.**
- Enum values, opaque IDs, unix timestamps, JSON shape — annotate the column. The comment ends up in the schema; a code comment doesn't.

**A4. Constrain enum-like strings with `.withEnumCheck()`.**
- For columns holding one of a small set of values, use `.withEnumCheck([...])` on the column.
- When adding a CHECK constraint via raw SQL, name it explicitly.

**A5. Default values reflect realistic initial state.**
- Don't set the default of a `status` column to a terminal value ("running" makes more sense than "done").

**A6. `.timestamp()` is deprecated.**
- Use `.timestampTimezone()` (default 3-ms precision) or `.timestampNoTimezone()` deliberately. The DSL type mapping table in Appendix 2 lists `timestamp` for completeness, but new migrations should use the timezone-explicit variants. Source: `packages/@n8n/db/src/migrations/dsl/column.ts`.

---

## B. Indexes — the most-flagged area

**B1. Don't add an index without a query for it.**
- Think about the query patterns and only add indexes to support those.
- Justify each index in the PR description with the target query.

**B2. A unique constraint already creates an index — don't double up.**
- Composite primary key indexes its prefix columns. A separate index on the prefix is redundant.

**B3. Composite index column order matches query predicates.**
- An index on `(A, B)` serves `WHERE A = ?` and `WHERE A = ? AND B = ?`, **not** `WHERE B = ?`.
- ORDER BY direction in the index must match the query's `ORDER BY` (e.g. `(sessionId, createdAt ASC, id DESC)`).

**B4. Partial unique indexes for sparse-unique columns.**
- Add `WHERE col IS NOT NULL` to exclude NULL rows. Smaller index and no uniqueness checks against the NULL bucket. Use the `whereClause` parameter on `createIndex(table, cols, isUnique, customName, whereClause)`.

**B5. Composite PKs can replace dedicated indexes.**
- Consider whether a surrogate `id` column is needed at all when `(slugA, slugB)` would be a perfectly good PK.

**B6. Mirror DSL indexes onto the entity with `@Index`.**
- The migration creates the runtime index; the entity decorator keeps fresh-DB setups in sync.

**B7. Use `withIndexOn(...)` over separate `createIndex(...)` calls when defining a new table.**

---

## C. Foreign keys, ON DELETE

**C1. FKs are the default; opting out needs justification.**

**C2. Pick `ON DELETE` / `ON UPDATE` deliberately.**
- `RESTRICT` to forbid deleting the parent.
- `CASCADE` when child rows have no meaning without parent.
- `SET NULL` when retaining children is meaningful.
- Answer "what happens when [parent] is deleted?" in the PR description.

**C3. SQLite FK quirks.**
- Dropping/recreating tables can leave duplicated FKs across SQLite up/down cycles. Name FKs explicitly so down migrations can target them.
- Down migrations sometimes fail on engines with FK-protected indexes (`Cannot drop index 'X': needed in a foreign key constraint`). Test both directions on every engine.

**C4. NULL semantics in joins/uniqueness differ across engines.**
- Comparing NULL with non-NULL filters rows on at least SQLite. Partial uniqueness across NULLs differs Postgres vs SQLite.

---

## D. Cross-database compatibility

**D1. No new MySQL/MariaDB migrations.**
- MySQL/MariaDB is unsupported. Don't drop existing `mysqldb/` files unless asked, but don't add new ones. v1 backports are the only exception.

**D2. Prefer `common/`; only split per-DB when SQL truly diverges.**
- If only Postgres needs the change, just put the file in `postgresdb/`; don't write a no-op SQLite migration with `if (isPostgres)`.
- When behavior diverges enough, do split — but that's the exception.
- SQLite no longer needs separate migrations for column adds (the recreate-table path was fixed). Verify before duplicating.

**D3. SQLite supports modern syntax.**
- `UPSERT` / `ON CONFLICT DO NOTHING` works on SQLite — use the same syntax as Postgres rather than `INSERT OR REPLACE`.
- SQLite has a real `JSON` type.
- SQLite supports `ALTER TABLE ... RENAME TO`.

**D4. Postgres-version-aware UUID generation.**
- `gen_random_uuid()` requires Postgres ≥ 13. n8n dropped Postgres 12 — prefer it over `uuid_generate_v4` (which needs the `uuid-ossp` extension and breaks on managed services like Supabase). For UUID PKs, generate at the application level with `randomUUID()` — see `packages/@n8n/db/AGENTS.md`.

**D5. SQLite doesn't enforce `varchar(N)` length.** Validate at app layer if length matters.

**D6. Boolean defaults render differently** across engines (`DEFAULT (false)` vs `DEFAULT 0` vs `DEFAULT FALSE`). Let the DSL handle it.

---

## E. Migration ordering and naming

**E1. Scaffold with the generator.**
- `pnpm --filter=@n8n/db migration:new <PascalCaseName> [--folder=…]` picks the timestamp and registers the migration. After rebase, re-run or bump the timestamp so it's strictly greater than every existing migration; the `migration-timestamp` lint rule in `@n8n/code-health` catches drift.
- **Future-dated head workaround**: the repository currently has migrations stamped at `1784000000008` (≈ 2026-07-14). Until real time passes that, `Date.now()` sorts *before* the head and would run out of order on databases that already applied the later migrations. The generator picks `max + 1` in this window automatically. Don't bypass the generator. Context: [PR #30511](https://github.com/n8n-io/n8n/pull/30511).

**E2. Don't edit a previously merged migration.**
- Once shipped, migrations are immutable. Write a new migration. To remove a column added by an earlier migration, do it in a separate follow-up migration (typically in a later release).

**E3. Don't combine independent schema changes.**
- One logical change per file. Multiple unrelated tables → split. The reviewer line: "the name of the migration is misleading because it does two things."

**E4. Prefer `ALTER` over drop-and-recreate.**
- For renames, use `ALTER TABLE ... RENAME TO`. Faster, atomic, no data-loss risk.

---

## F. Reversibility (down migrations)

**F1. Default to writing a working `async down()` and test it.**
- The pattern: `pnpm start && pnpm start -- db:revert && pnpm start` on every supported DB. The revert command is `packages/cli/src/commands/db/revert.ts`. Down failures often surface as FK-protected indexes blocking column drops.

**F2. Use `IrreversibleMigration` only when the `up()` destroys information a faithful `down()` would need — not as an escape hatch for tedious `down()` code.**

**F3. `down()` must restore the previous schema, not just drop new objects.**
- The down's effect should let `up()` be re-run cleanly afterwards.

**F4. SQLite duplicate-FK accumulation.**
- `pnpm start → db:revert → pnpm start` on SQLite duplicates FKs unless you name them explicitly.

---

## G. Performance / large-instance safety

**G1. Do the transformation in SQL, not Node.**
- Prefer `INSERT … SELECT`, `UPDATE … FROM`, `DELETE … WHERE` over fetching rows to Node and writing them back. Loading whole tables into JS memory is slow and OOM-prone on large instances; the database can do the same work in place much faster.

**G2. Filter early with `LIKE`/`WHERE`.**
- Reduce the row count before parsing on the Node side.

**G3. Use `runInBatches()` for backfills that don't fit one statement.**
- Default limit is 100. A sequential scan on the entire table is very slow on larger instances.

**G4. Don't add JSON-substring scans on hot tables.**
- Add a real column (e.g. `isDraft`, similar to `isArchived`) instead of `WHERE settings::text LIKE '%foo%'`.

**G5. Avoid storing large blobs inline on hot rows.**
- Move opt-out large columns to a side table — backups and read performance both benefit.

**G6. Verify data integrity when copying tables.**
- Count source vs temp before swapping; throw on mismatch.

---

## H. Backfills (data migrations)

**H1. Defend against dirty / legacy data — the #1 source of migration bugs.**
- Wrap JSON parsing in try/catch; log a warning and skip the row rather than crashing the whole migration. Use `parseJson()` from `MigrationContext`, not raw `JSON.parse`.
- Check for `null`/`undefined` before accessing properties; `Array.isArray()` before iterating.
- Account for **all** historical versions of a data structure, not just the current one. A migration shipping today may run on a database last touched two years ago.
- Filter invalid rows out in SQL where you can: `WHERE workflowId IS NOT NULL`.

```typescript
await runInBatches<Row>(selectQuery, async (rows) => {
  for (const row of rows) {
    try {
      const nodes = parseJson(row.nodes);
      if (!Array.isArray(nodes)) continue;            // guard against unexpected shape

      for (const node of nodes) {
        if (!node.type) continue;                     // skip nodes missing required fields
        // ... transform ...
      }

      await runQuery(`UPDATE ${table} SET nodes = :nodes WHERE id = :id`, {
        nodes: JSON.stringify(nodes),
        id: row.id,
      });
    } catch (error) {
      logger.warn(`[${migrationName}] Failed to process row ${row.id}: ${error.message}. Skipping.`);
    }
  }
});
```

**H2. Migrations are frozen artifacts; don't import live app code or values into them.**
- **Value imports** (`import { Entity }` / `import { someHelper }` from `packages/cli/...` or other workspace packages) are forbidden — they couple the migration to entity shapes and helper signatures that change over time. Use raw SQL via `runQuery()` instead of `queryRunner.manager.update(Entity, ...)`.
- **Type-only imports** (`import type { Foo }`) are acceptable for typing query results, but **inline types are still preferred**: `type WorkflowRow = { id: string; nodes: string }` decouples the migration from the entity entirely.
- The same applies to constants from sibling workspace packages — inline small constants rather than importing them. Acceptable exceptions: utilities whose semantics are stable and whose inline implementation would be substantial (e.g. `generateNanoId`).

```typescript
// 🚫 value import; ties migration to current entity shape
import { ApiKey } from '../../entities';
await queryRunner.manager.update(ApiKey, { id }, { scopes });

// ✅ inline row type, raw SQL
type ApiKeyRow = { id: string; scopes: string };
await runQuery(`UPDATE ${table} SET scopes = :scopes WHERE id = :id`, { scopes, id });
```

**H3. For deletions, prefer keeping old rows as a fallback.**
- Self-hosted instances may have unexpected data shapes. If the migration results in missing or inconsistent data, the old row is the only recovery path.
- Default to two-release expand-contract: **Release N** writes the new location and leaves the old in place; **Release N+1** ships a separate follow-up migration that drops the old location, once the new code has been observed in production. Skip the gap only when the old location is genuinely throwaway, or when compliance forces immediate deletion (in which case mark the migration `IrreversibleMigration` and call out the trade-off in the PR description).

**H4. Keep denormalized columns in sync.**
- Where data is duplicated across two tables (e.g. `workflow_entity.nodes` vs `workflow_history.nodes`), the backfill must update both copies.

**H5. `runQuery()` is the default; reach for `queryRunner.query()` only when `runQuery` can't express the operation.**
- `runQuery` binds named parameters consistently, integrates with the migration's logger and error path, and works the same on both engines. `queryRunner.query()` is positional, bypasses the parameter helper, and gives uglier error messages. `queryRunner.manager.*` is worse still — it couples the migration to live TypeORM entity classes (see H2).

**H6. Extract multi-step work into named private methods.**
- A migration class is still a class — `up()` shouldn't be a 200-line procedure. Break logical steps into private methods named for what they do (`backfillSlugs`, `recomputeStatistics`). `up()` then reads as a short list of step calls.
- **Don't extract single-line steps.** A method whose body is one DSL call adds no information — the call site is already self-documenting.

```typescript
// 🚫: everything inline in up()
export class MigrateThing1234567890000 implements IrreversibleMigration {
  async up(ctx: MigrationContext) {
    // 80 lines of mixed DDL, raw SQL, batched updates, logging...
  }
}

// ✅: up() is a table of contents; only multi-step work gets its own method
export class MigrateThing1234567890000 implements IrreversibleMigration {
  async up(ctx: MigrationContext) {
    const { schemaBuilder: { addColumns, column, createIndex } } = ctx;

    // One-liner DSL calls stay inline — naming them adds no information.
    await addColumns('my_table', [column('slug').varchar(255)]);

    // The non-trivial step gets a named method.
    await this.backfillSlugs(ctx);

    await createIndex('my_table', ['slug'], true);
  }

  private async backfillSlugs({ escape, runQuery, runInBatches, logger, migrationName }: MigrationContext) {
    const table = escape.tableName('my_table');
    await runInBatches<{ id: string; name: string }>(
      `SELECT id, name FROM ${table} WHERE slug IS NULL`,
      async (rows) => {
        for (const row of rows) {
          try {
            const slug = row.name.toLowerCase().replace(/\s+/g, '-');
            await runQuery(`UPDATE ${table} SET slug = :slug WHERE id = :id`, { slug, id: row.id });
          } catch (error) {
            logger.warn(`[${migrationName}] Failed to backfill row ${row.id}: ${(error as Error).message}`);
          }
        }
      },
    );
  }
}
```

Why: a migration is read more often than it's written — during review, during incident response, and years later when someone needs to understand why a column exists. Named steps double as documentation. Reversible migrations benefit even more — `down()` can call the same private helpers in reverse.

**H7. Mixed schema + data migrations: one method per concern.**
- When a migration both adds a column and backfills it, separate the two concerns into named methods. The schema change and the data backfill have different failure modes, different transaction implications, and different testing needs.

```typescript
export class AddAndBackfillColumn1234567890000 implements IrreversibleMigration {
  async up(ctx: MigrationContext) {
    await ctx.schemaBuilder.addColumns('my_table', [ctx.schemaBuilder.column('newCol').text]);
    await this.backfillNewCol(ctx);
  }

  private async backfillNewCol({ escape, runQuery, runInBatches }: MigrationContext) {
    const table = escape.tableName('my_table');
    await runInBatches<{ id: string; oldCol: string }>(
      `SELECT id, oldCol FROM ${table}`,
      async (rows) => {
        for (const row of rows) {
          const transformed = transform(row.oldCol);
          await runQuery(`UPDATE ${table} SET newCol = :val WHERE id = :id`, {
            val: transformed,
            id: row.id,
          });
        }
      },
    );
  }
}
```

**H8. Batch operations: never unbounded `SELECT *` on tables that could have millions of rows.**
- Use `runInBatches` (default batch size 100; use 100–500). For row-by-row copies between tables, use `copyTable(from, to, fromFields?, toFields?, batchSize?)`.

---

## I. Naming, conventions, code style

**I1. Constants are camelCase, not SCREAMING_CASE.**

**I2. No `_entity` suffix on new tables.** This is an old convention.

**I3. Column names are camelCase in code.**

**I4. Don't repeat the table name in column names.**

**I5. Always use `escape.tableName(...)` / `escape.columnName(...)` / `escape.indexName(...)`.**
- These handle the configurable `tablePrefix`, dialect-specific quoting (Postgres double-quotes vs SQLite's backticks/quotes), and identifier-length conventions consistently. Hand-rolling `${tablePrefix}my_table` or hardcoding `"model_tmp"` will eventually be wrong on one engine — usually the one you didn't test on locally.

**I6. Set `@Entity({ name: 'snake_case_name' })` explicitly when overriding.**

**I7. Use `Relation<T>` in TypeORM relations** — direct references cause known circular-import issues.

**I8. Extend `WithTimestamps` / `WithTimestampsAndStringId`** abstract entities — the established standard.

**I9. Don't denormalize without a concrete read pattern that benefits.** Justify any duplicated column in the PR description.

**I10. `INSERT OR REPLACE` ≠ `ON CONFLICT DO NOTHING`.**
- `OR REPLACE` overwrites; `ON CONFLICT DO NOTHING` ignores. SQLite supports both — pick the one that matches Postgres semantics for the same code path.

**I11. `autoGenerate2` for autoincrement integer PKs.**
- Emits `GENERATED BY DEFAULT AS IDENTITY` (preferred over the deprecated `serial`-based `autoGenerate`).
- **Never** use `autoGenerate2` on UUID PKs — see `packages/@n8n/db/AGENTS.md`.

**I12. Don't parameterize values that aren't user input.** Inline literals where the value is from the migration itself.

**I13. Log with `logger` from `MigrationContext`, prefixed with `[${migrationName}]`. Never `console.log`.**
- The prefix makes failures traceable in a boot log that contains many migrations' output. `console.log` bypasses log levels and structured-log formatting.

```typescript
logger.info(`[${migrationName}] Processing ${count} workflows`);
logger.warn(`[${migrationName}] Skipping row ${id}: missing required field`);
```

---

## J. ID strategy

**J1. UUID/nanoId only for entities whose ID appears in URL/UI.**
- Otherwise `int.autoGenerate2`. 32 bits beats 128 bits, and SQLite stores UUIDs as varchar (~36 bytes).
- **DSL gotcha**: don't chain `.autoGenerate2` on `.uuid` — the DSL throws. The TypeORM equivalent (`DEFAULT uuid_generate_v4()`) also fails on managed Postgres (Supabase) because it needs the `uuid-ossp` extension in `public`. Use `.uuid` alone and generate the value in application code via `randomUUID()` from `node:crypto`. Full rationale: `packages/@n8n/db/AGENTS.md`.

**J2. Keep ID-column types consistent across related tables.**
- Mixing `uuid` and `varchar(36)` for what is "the same kind of ID" creates JOIN footguns and ugly migrations later.

**J3. nanoid length 16 for entity IDs.**
- Established convention; longer offers no real collision benefit at our scale.

**J4. Composite primary keys are first-class — skip the surrogate `id` when natural keys work.**
- If `(userId, roleId)` uniquely identifies a membership row, declare `.primary` on both columns instead of inventing an `id`. `.primary` already implies `notNull` and already creates the PK index — don't add `.notNull` or `.withIndexOn(['userId', 'roleId'])`.

```typescript
await createTable('membership')
  .withColumns(
    column('userId').uuid.primary,
    column('roleId').uuid.primary,
  );
```

---

## K. Tests

**K1. Every data migration ships with an integration test.**
- Schema-only migrations can usually be reviewed by reading the DSL calls. Data migrations cannot — they encode assumptions about row shape, JSON structure, NULL handling, and edge cases that only show up when the migration actually runs against representative data.
- A data migration runs *once* per database, on production data, with no opportunity to retry cleanly. The cost of a bad migration is a customer-facing incident; the cost of a test is ten minutes.
- Tests live in `packages/cli/test/migration/`, named to match the migration file (e.g. `1773000000000-create-credential-dependency-table.test.ts`). Use the helpers from `@n8n/backend-test-utils`:
  - **`initDbUpToMigration(MigrationName)`** runs every migration *up to but not including* yours, leaving the DB in the exact state your migration will see in production.
  - **`runSingleMigration(MigrationName)`** runs just your migration on top of that state.
- Full helper API: `packages/@n8n/backend-test-utils/MIGRATION_TESTING.md`.

```typescript
import { initDbUpToMigration, runSingleMigration } from '@n8n/backend-test-utils';

describe('AddAndBackfillColumn1234567890000', () => {
  beforeEach(async () => {
    await initDbUpToMigration('AddAndBackfillColumn1234567890000');
  });

  it('backfills newCol from oldCol', async () => {
    // Seed rows in the pre-migration schema
    await dataSource.query(`INSERT INTO my_table (id, oldCol) VALUES ('1', 'foo')`);

    await runSingleMigration('AddAndBackfillColumn1234567890000');

    const [row] = await dataSource.query(`SELECT newCol FROM my_table WHERE id = '1'`);
    expect(row.newCol).toBe('transformed-foo');
  });

  it('skips rows with NULL oldCol without crashing', async () => {
    await dataSource.query(`INSERT INTO my_table (id, oldCol) VALUES ('1', NULL)`);
    await runSingleMigration('AddAndBackfillColumn1234567890000');
    // assert no error and row still exists
  });
});
```

**What to cover:**
- The happy path (correctly transforms a typical row).
- Each edge case the migration claims to handle (NULL fields, malformed JSON, missing keys, legacy schema versions).
- Idempotency where applicable — running the migration twice shouldn't double-apply transformations.
- Both SQLite and Postgres if the migration branches on DB type.

**K2. Tests insert fixtures via raw SQL only.**
- Repositories evolve with the schema and break older tests over time. Use `context.escape.tableName(...)` and `context.runQuery(sql, params)` directly.

**K3. Test name describes behavior, not the SQL.**

---

## L. Schema/entity drift

**L1. Schema, entity, and OpenAPI types must agree.**
- Caught regularly: `notNull` lost on entity, entity says `string` but column is something else, `@Index` mirrors don't exist.

**L2. `up` and entity must agree on defaults / constraints.**
- If a new column is required for data integrity (e.g. `activeVersionId` should be set whenever `active` is TRUE), enforce it via a CHECK constraint in the migration AND a runtime invariant in app code.

**L3. Deprecate columns, then drop in a follow-up.**
- Don't drop a column the same release you stop writing to it. Wait one release, then drop.

---

## M. Cross-row data integrity

**M1. Order backfill inserts deliberately.**
- When the migration writes rows whose order is observable downstream (auto-increment IDs, default sort order, "most recent first" UI lists), add explicit `ORDER BY` to the source `SELECT` — typically `updatedAt` or `createdAt`. Without one the database picks any order and the chronology that was implicit in the old schema is lost.

**M2. Atomic SQL within the migration's transaction.**
- Some migrations override with `transaction = false as const` for big DDL on engines that disallow it inside a transaction. The DSL/wrapper sets `transaction = false` automatically when `withFKsDisabled = true`.

---

## N. General design guidance (not enforced by a specific reviewer quote)

These are widely-applicable database design principles. They aren't tied to a single recurring PR comment, but they're worth keeping in mind because the *cost* of getting them wrong shows up in the codebase (manual orchestration where the DB could have done the work for free).

**N1. Avoid polymorphic `(typeCol, idCol)` pairs.**
- A "polymorphic" column pair is one column that points at different tables depending on a sibling type column — e.g. `dependencyType: 'externalSecretProvider' | ...` plus `dependencyId: string`. SQL FKs target exactly one table, so polymorphic `idCol`s cannot have an FK declaration. Consequences:
  - No insert validation (you can insert a `dependencyId` that doesn't match any row).
  - No cascade/restrict on parent delete — application code has to manually walk every table that might point at the deleted row and delete dependents inside a transaction (see `credential_dependency` + `secrets_provider_connection` deletion paths for a real example of this cost).
  - Orphan rows are possible by construction.
- Alternatives:
  - **Separate join tables per relation type** (`credential_external_secret_dependency`, `credential_node_dependency`, …). Each has a real FK. Queries that need "all dependencies" become a UNION.
  - **One nullable FK per possible target** with a CHECK constraint that exactly one is set. Each column is a real FK.
  - **Supertype table**: hoist parents into a single `dependency_target` with its own type column, then have one FK to that table.

---

## Appendix 1: `MigrationContext` API reference

Source of truth: `packages/@n8n/db/src/migrations/migration-types.ts`. This appendix is a quick reference; check the source for the exact signatures when in doubt.

```typescript
interface MigrationContext {
  // Database info
  dbType: 'postgresdb' | 'sqlite';
  isSqlite: boolean;
  isPostgres: boolean;
  tablePrefix: string;
  dbName: string;
  migrationName: string;

  // Schema DSL (see Appendix 2 for column types)
  schemaBuilder: { createTable, dropTable, addColumns, dropColumns, column,
                   createIndex, dropIndex, addForeignKey, dropForeignKey,
                   addNotNull, dropNotNull };

  // Query execution
  runQuery<T>(sql: string, namedParameters?: object): Promise<T>;
  runInBatches<T>(query: string, operation: (rows: T[]) => Promise<void>, limit?: number): Promise<void>;
  copyTable(from: string, to: string, fromFields?: string[], toFields?: string[], batchSize?: number): Promise<void>;

  // Utilities
  escape: { tableName(n: string): string; columnName(n: string): string; indexName(n: string): string };
  parseJson<T>(data: string | T): T;
  loadSurveyFromDisk(): string | null;
  logger: Logger;
  queryRunner: QueryRunner;  // Avoid direct use — prefer runQuery() (see H5)
}
```

---

## Appendix 2: DSL type mapping

Source of truth: `packages/@n8n/db/src/migrations/dsl/column.ts`.

| DSL type | PostgreSQL | SQLite |
|---|---|---|
| `int` | `int` | `integer` |
| `bigint` | `bigint` | `integer` |
| `smallint` | `smallint` | `integer` |
| `varchar(N)` | `varchar(N)` | `varchar(N)` *(length not enforced — see D5)* |
| `text` | `text` | `text` |
| `json` | `json` | `text` |
| `uuid` | `uuid` | `varchar` |
| `bool` | `boolean` | `boolean` |
| `double` | `double precision` | `real` |
| `binary` | `bytea` | `blob` |
| `timestampTimezone` | `timestamptz` | `datetime` |
| `timestampNoTimezone` | `timestamp` | `datetime` |
| `timestamp` *(deprecated, see A6)* | `timestamp` | `datetime` |

Default precision for the timestamp variants is 3 ms. Pass an explicit argument to override: `.timestampTimezone(6)`.

---

## Appendix 3: Foreign key `onDelete` decision table

Always specify `onDelete` explicitly. Don't rely on database defaults.

| Relationship type | `onDelete` | Example |
|---|---|---|
| Child is meaningless without parent | `CASCADE` | `annotation_tag_mapping` → `annotation` |
| Child should outlive parent (keep history) | `SET NULL` | `workflow_publish_history.userId` → `user` |
| Audit / statistics / history tables | `NO ACTION` or `SET NULL` | `workflow_statistics` → `workflow_entity` |
| Reference should prevent deletion | `RESTRICT` | (no current in-tree example — use when business logic forbids orphaning) |

For `SET NULL`, the FK column must be nullable. For `CASCADE`, consider whether the cascade depth is bounded — long cascade chains can lock many tables in a single delete.
