# n8n Migration Guidelines

---

## Table of Contents

- [Overview](#overview)
- [Common Guidance](#common-guidance)
- [Part 1: Schema Migrations](#part-1-schema-migrations)
- [Part 2: Data Migrations](#part-2-data-migrations)
- [Quick Reference](#quick-reference)

> A categorized review of past migration mistakes and their PR threads lives in [`MIGRATION_REVIEW.md`](./MIGRATION_REVIEW.md). The rules below summarize what to do; the review explains *why* by walking through real incidents.

---

## Overview

### Directory Structure

```
packages/@n8n/db/src/migrations/
├── common/           # Common migrations for both Postgres and SQLite
├── postgresdb/       # PostgreSQL-specific migrations
├── sqlite/           # SQLite-specific migrations
├── dsl/              # Schema builder DSL (table, column, indices)
├── __tests__/        # Migration tests
├── migration-types.ts
└── migration-helpers.ts
```

### Migration Types

| Interface | When to use |
|---|---|
| `ReversibleMigration` | Schema changes that can be cleanly undone (add/drop column, create/drop table). Requires a working `down()`. |
| `IrreversibleMigration` | Data transformations, destructive changes, or anything where `down()` would lose data. No `down()` allowed. |

### Execution Model

- Migrations run in **array order** as defined in `postgresdb/index.ts` and `sqlite/index.ts`
- Timestamps are for **uniqueness**, not automatic ordering
- Each migration receives a `MigrationContext` with database-aware helpers
- Migrations run inside a transaction by default
- SQLite migrations that do DDL (`CREATE TABLE`, `ALTER TABLE`) should set `transaction = false as const` — the framework wraps these with `PRAGMA foreign_keys=OFF` automatically

### MigrationContext API

```typescript
interface MigrationContext {
  // Database info
  dbType: 'postgresdb' | 'sqlite';
  isSqlite: boolean;
  isPostgres: boolean;
  tablePrefix: string;

  // Schema DSL
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
  logger: Logger;
  migrationName: string;
  queryRunner: QueryRunner;  // Avoid direct use — prefer runQuery()
}
```

### DSL Type Mapping Reference

| DSL type | PostgreSQL | SQLite |
|---|---|---|
| `int` | `int` | `integer` |
| `varchar(N)` | `varchar(N)` | `varchar(N)` |
| `text` | `text` | `text` |
| `json` | `json` | `text` |
| `uuid` | `uuid` | `varchar` |
| `timestamp` | `timestamp` | `datetime` |
| `timestampTimezone` | `timestamptz` | `datetime` |
| `bool` | `boolean` | `boolean` |
| `double` | `double precision` | `real` |
| `binary` | `bytea` | `blob` |

---

## Common Guidance

Rules that apply to every migration — schema or data, common or DB-specific. Read this section before writing anything.

### Split the migration into small, named methods

A migration class is still a class — `up()` shouldn't be a 200-line procedure. Break each logical step into a private method with a name that describes what it does (`createTable`, `backfillSlugs`, `dropLegacyIndex`). `up()` then reads as a short list of step calls.

```typescript
// BAD: everything inline in up()
export class MigrateThing1234567890000 implements IrreversibleMigration {
  async up(ctx: MigrationContext) {
    // 80 lines of mixed DDL, raw SQL, batched updates, logging...
  }
}

// GOOD: up() is a table of contents; only multi-step work gets its own method
export class MigrateThing1234567890000 implements IrreversibleMigration {
  async up(ctx: MigrationContext) {
    const { schemaBuilder: { addColumns, column, createIndex } } = ctx;

    // One-liner DSL calls stay inline — naming them adds no information.
    await addColumns('my_table', [column('slug').varchar(255)]);

    // The non-trivial step gets a named method.
    await this.backfillSlugs(ctx);

    await createIndex('my_table', ['slug'], true);
  }

  private async backfillSlugs({ escape, runQuery, runInBatches, parseJson, logger, migrationName }: MigrationContext) {
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

**Why:** A migration is read more often than it's written — during review, during incident response, and years later when someone has to understand why a column exists. Named steps double as documentation. They also make it easier to skim a diff: a reviewer can tell at a glance whether the change is "added a new step" or "rewrote an existing one." Reversible migrations benefit even more — `down()` can call the same private helpers in reverse.

**Don't extract single-line steps.** A method whose body is one DSL call adds no information — the call site is already self-documenting. Pull out a method only when the step is multi-line, has its own control flow, or genuinely needs a name to explain *why* it exists. The bar is "does this hide complexity worth hiding?"

### Prefer `runQuery()` over `queryRunner`

Run SQL through `runQuery()` from `MigrationContext`. Never call `queryRunner.query()` or `queryRunner.manager.*` from a migration.

**Why:** `runQuery()` handles table-prefix escaping and parameter binding consistently. `queryRunner.query()` bypasses those safety nets. `queryRunner.manager` calls couple the migration to TypeORM entity definitions, which change over time — a migration that worked at v1.0 can break at v2.0 if the entity shape evolves.

### Never import entities as values

Don't `import { Entity }` and call ORM methods on it. Use raw SQL via `runQuery()` instead.

```typescript
// 🚫 value import; ties migration to current entity shape
import { ApiKey } from '../../entities';
await queryRunner.manager.update(ApiKey, { id }, { scopes });

// ✅ inline row type, raw SQL
type ApiKeyRow = { id: string; scopes: string };
await runQuery(`UPDATE ${table} SET scopes = :scopes WHERE id = :id`, { scopes, id });
```

**Type-only imports** (`import type { Entity }`) are acceptable for typing query results, but prefer inline types like `type WorkflowRow = { id: string; nodes: string }` to avoid coupling to entities that may be renamed or restructured.

**Why:** Migrations are a historical record — they must work against the schema *as it existed when they were written*. Importing live entities means later refactors silently change the meaning of old migrations.

### Always escape identifiers

Use `escape.tableName()`, `escape.columnName()`, and `escape.indexName()` for every identifier. Don't hand-roll `${tablePrefix}my_table` or hardcode quoted names like `"model_tmp"`.

**Why:** The DB type, table prefix, and quoting rules differ between Postgres and SQLite. The `escape.*` helpers apply the right rules; manual interpolation will eventually be wrong on one of them.

### Prefer inlining over importing from sibling packages

`@n8n/db` already depends on `n8n-workflow`, but the more a migration imports from other workspace packages, the more brittle it becomes. Inline small constants and types where you can. Use `parseJson()` from `MigrationContext` instead of importing `jsonParse` from `n8n-workflow`.

**Why:** A migration that imports `ERROR_TRIGGER_NODE_TYPE` from `n8n-workflow` is now coupled to that constant's existence and value forever. If the constant is renamed or removed in a refactor years later, the migration breaks at install time on a fresh database.

Acceptable exceptions: utilities whose semantics are stable and whose inline implementation would be substantial (e.g. `generateNanoId`).

---

## Part 1: Schema Migrations

### 1.1 Use the DSL for Schema Changes

Use the schema builder DSL for additions, removals, and changes. It handles cross-database type mapping automatically. If we are missing a helper, either add one or bring it to others' attention.

```typescript
export class CreateMyTable1234567890000 implements ReversibleMigration {
  async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
    await createTable('my_table')
      .withColumns(
        column('id').int.notNull.primary.autoGenerate2,   // Use autoGenerate2, not autoGenerate
        column('name').varchar(255).notNull,
        column('workflowId').varchar(36).notNull,
        column('config').json,                             // Maps to json (PG) / text (SQLite)
        column('isActive').bool.notNull.default(false),
      )
      .withTimestamps                                      // Adds createdAt + updatedAt
      .withIndexOn(['workflowId'])
      .withForeignKey('workflowId', {
        tableName: 'workflow_entity',
        columnName: 'id',
        onDelete: 'CASCADE',                               // Always explicit
      });
  }

  async down({ schemaBuilder: { dropTable } }: MigrationContext) {
    await dropTable('my_table');
  }
}
```

### 1.2 Primary Keys

Every table needs a primary key. Choose the type in this order:

1. **Integer** — `column('id').int.primary.autoGenerate2`. Preferred for new tables: compact, fast joins, no ordering surprises. `autoGenerate2` uses Postgres `IDENTITY` (not the older `serial`).
2. **UUID** — `column('id').uuid.primary`. Use when IDs are generated client-side, exposed in URLs, or need to be unguessable; also when rows are created across multiple writers (sharding, offline clients). Generate UUIDs in application code; do **not** chain `.autoGenerate2` on `.uuid` (the DSL throws — `DEFAULT uuid_generate_v4()` fails on managed Postgres like Supabase). Prefer `.uuid` over `.varchar(36)`: Postgres stores `uuid` as 16 bytes versus 37 bytes for `varchar(36)`, which adds up across joined tables and indexes.
3. **String** — `column('id').varchar(36).primary`. Use for IDs whose format isn't an UUID (e.g. nanoid-style IDs).

**DSL behavior to know:**
- `.primary` already implies `notNull`. Don't chain `.notNull` after `.primary` — it's redundant.
- `.primary` already creates the primary-key index. Don't add a separate `.withIndexOn(['id'])` for it.

**Composite primary keys:** chain `.primary` on each participating column.

```typescript
await createTable('membership')
  .withColumns(
    column('userId').uuid.primary,
    column('roleId').uuid.primary,
  );
```

### 1.4 Foreign Key Constraints

| Relationship type | `onDelete` strategy | Example |
|---|---|---|
| Child is meaningless without parent | `CASCADE` | `annotation_tag_mapping` → `annotation` |
| Child should outlive parent | `SET NULL` | `workflow_publish_history.userId` → `user` |
| Audit/statistics/history tables | `NO ACTION` or `SET NULL` | `workflow_statistics` → `workflow_entity` |
| Reference should prevent deletion | `RESTRICT` |  |

**Always specify `onDelete` explicitly.** Don't rely on database defaults.

### 1.5 Index Management

```typescript
// Creating indices
await schemaBuilder.createIndex('my_table', ['columnA', 'columnB']);
await schemaBuilder.createIndex('my_table', ['email'], true); // unique

// Dropping indices (defensively)
await schemaBuilder.dropIndex('my_table', ['columnA'], { skipIfMissing: true });
```

**Best practices:**
- **Add indexes sparingly, and only when you've measured a speedup.** Every index slows down inserts/updates and consumes disk. Don't add one "just in case" — run the query against a realistic dataset, confirm it's slow, add the index, confirm the planner uses it and the query is now fast. If you can't show a measurable improvement, don't ship the index.
- **Index foreign key columns.** Joins and cascading deletes hit FKs on every operation; an unindexed FK degrades into a sequential scan on the child table.
- **Column order matters in composite indexes.** Put the most selective column first, and remember that an index on `(a, b)` covers queries filtering by `a` or by `a AND b` — but not by `b` alone.
- **Don't index low-cardinality columns alone** (booleans, status enums with 2–3 values). Either skip the index or make it a partial index — both Postgres and SQLite (since 3.8.0) support `WHERE` clauses on indexes.
- **Unique indexes enforce uniqueness AND speed up lookups.** Prefer them over a separate unique constraint + index pair.
- **Drop unused indexes.** If a query plan no longer uses it, drop it in a follow-up migration.
- **Name indexes via the DSL,** never hand-roll names. The DSL prefixes them consistently so they line up across environments.

### 1.7 Single Migration File or Separate for SQLite & Postgres

**Choose between a single common migration or split files:**

- **Small differences (a single statement, a CHECK constraint, slightly different syntax):** keep one migration in `common/` and branch on `isSqlite` / `isPostgres`.
- **Large differences (different table recreation strategies, different intermediate steps, fundamentally different SQL):** write **separate files** in `postgresdb/` and `sqlite/`. A common migration full of `if (isSqlite) { ... }` blocks is harder to read and review than two focused files.

### 1.9 Reversibility

- `ReversibleMigration`: The `down()` **must actually work**. If shrinking a column, truncate data gracefully. If dropping a table, consider that the table may have been populated.
- `IrreversibleMigration`: Use when `down()` would lose data or is impossible. Preferred for data transformations.
- **Never write an empty or broken `down()`.** If you can't reverse it, use `IrreversibleMigration`.

---

## Part 2: Data Migrations

Data migrations transform existing rows: parsing JSON, backfilling columns, migrating data between tables, cleaning up invalid data.

### 2.1 Always Handle Dirty / Legacy Data

**This is the #1 source of migration bugs.** At least 5 of 15 fix commits were caused by assuming clean data.

| What went wrong | PR |
|---|---|
| Crashed on nodes missing the `type` field | [#23392](https://github.com/n8n-io/n8n/pull/23392) |
| Crashed on malformed JSON with unescaped control chars | [#24410](https://github.com/n8n-io/n8n/pull/24410) |
| Crashed on NULL `workflowId` in `workflow_statistics` | [#24800](https://github.com/n8n-io/n8n/pull/24800) |
| Failed to recognize v1.0 nodes with empty `{}` params | [#22860](https://github.com/n8n-io/n8n/pull/22860) |

**Rules:**
- **Wrap JSON parsing in try/catch.** Log a warning and skip the row — never crash the whole migration.
- **Check for null/undefined before accessing properties:** `node.type && isTriggerNode(node.type)`
- **Account for ALL historical versions** of a data structure, not just the current one
- **Filter out invalid rows in SQL:** `WHERE workflowId IS NOT NULL`
- **Use `parseJson()` from context** — it handles edge cases better than raw `JSON.parse`

```typescript
// GOOD: defensive data migration
await runInBatches<Row>(selectQuery, async (rows) => {
  for (const row of rows) {
    try {
      const nodes = parseJson(row.nodes);
      if (!Array.isArray(nodes)) continue;  // Guard against unexpected shape

      for (const node of nodes) {
        if (!node.type) continue;           // Skip nodes missing type
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

### 2.2 Use Batch Operations

**Never `SELECT *` unbounded on tables that could have millions of rows.**

```typescript
// GOOD: batched processing
await runInBatches<Workflow>(
  `SELECT id, nodes FROM ${tableName} WHERE ${condition}`,
  async (workflows) => {
    for (const workflow of workflows) {
      // ... process each workflow ...
    }
  },
  100, // batch size (default: 100, use 100-500)
);

// GOOD: batched table copy
await copyTable('old_table', 'new_table', ['col1', 'col2'], ['col1', 'col2'], 500);
```

### 2.3 Use Named Parameters

Always use parameterized queries for data operations to prevent SQL injection and handle type conversion correctly.

```typescript
// GOOD
await runQuery(
  `UPDATE ${tableName} SET ${colName} = :value WHERE ${idCol} = :id`,
  { value: newValue, id: rowId },
);

// BAD: string interpolation of data values
await runQuery(`UPDATE ${tableName} SET ${colName} = '${newValue}' WHERE id = '${rowId}'`);
```

### 2.4 Logging

Use the `logger` from `MigrationContext` — never `console.log`.

```typescript
logger.info(`[${migrationName}] Processing ${count} workflows`);
logger.warn(`[${migrationName}] Skipping row ${id}: missing required field`);
```

### 2.5 Data Migrations Should Usually Be Irreversible

Data transformations are almost never cleanly reversible. Use `IrreversibleMigration` unless:
- The migration is purely additive (backfilling a new column from existing data)
- The original data is preserved elsewhere
- You've verified the `down()` actually restores the exact original state

### 2.6 Mixed Schema + Data Migrations

When a migration both adds a column and backfills data, structure it clearly:

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

### 2.7 Always Test Data Migrations

**Every data migration must ship with a test.** Schema-only migrations can usually be reviewed by reading the DSL calls; data migrations cannot — they encode assumptions about row shape, JSON structure, NULL handling, and edge cases that only show up when the migration actually runs against representative data.

Tests live in `packages/cli/test/migration/`, named to match the migration file (e.g. `1773000000000-create-credential-dependency-table.test.ts`). Use the helpers from `@n8n/backend-test-utils`:

- **`initDbUpToMigration(MigrationName)`** — runs every migration *up to but not including* yours, leaving the DB in the exact state your migration will see in production.
- **`runSingleMigration(MigrationName)`** — runs just your migration on top of that state.

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
- The happy path (correctly transforms a typical row)
- Each edge case the migration claims to handle (NULL fields, malformed JSON, missing keys, legacy schema versions)
- Idempotency where applicable — running the migration twice shouldn't double-apply transformations
- Both SQLite and Postgres if the migration branches on DB type

**Why:** A data migration runs *once* per database, on production data, with no opportunity to retry cleanly. The cost of a bad migration is a customer-facing incident; the cost of a test is ten minutes. The migrations that caused the most damage historically were the ones with no tests.

---

## Quick Reference

### File Conventions

| Aspect | Convention |
|---|---|
| **Filename** | `{timestamp}-{PascalCaseName}.ts` |
| **Class name** | `{PascalCaseName}{Timestamp}` |
| **Location** | `common/` (preferred), `postgresdb/` or `sqlite/` only when fundamentally different |
| **Registration** | Add to **both** `postgresdb/index.ts` and `sqlite/index.ts` in chronological position |
| **Timestamp** | Unix epoch milliseconds — must match between filename and class name |

### Checklist for Schema Migrations

- [ ] Used DSL for new tables?
- [ ] Used raw SQL for altering large existing tables (`execution_data`, `execution_entity`)?
- [ ] Column sizes are generous enough (TEXT for external data, varchar(36)+ for UUIDs)?
- [ ] Works on both SQLite and PostgreSQL? Branch on `isSqlite`/`isPostgres` where needed?
- [ ] SQLite DDL migrations have `transaction = false as const`?
- [ ] All identifiers use `escape.tableName()`, `escape.columnName()`, `escape.indexName()`?
- [ ] FK constraints have explicit `onDelete`?
- [ ] Index creation uses `schemaBuilder.createIndex()`?
- [ ] `down()` actually works if using `ReversibleMigration`?
- [ ] No entity value imports?
- [ ] Added to index arrays in correct chronological position?
- [ ] Used `autoGenerate2` (not deprecated `autoGenerate`) for new auto-increment PKs?

### Checklist for Data Migrations

- [ ] Uses `IrreversibleMigration` (unless truly reversible)?
- [ ] JSON parsing wrapped in try/catch with per-row error handling?
- [ ] Handles NULL values and missing fields in legacy data?
- [ ] Uses `runInBatches()` for processing large tables?
- [ ] Uses `parseJson()` from context, not raw `JSON.parse`?
- [ ] Uses named parameters (`:param`) in `runQuery()`, not string interpolation?
- [ ] Logs progress and warnings via `logger`?
- [ ] No `SELECT *` without `LIMIT` on potentially large tables?
- [ ] No circular package dependencies introduced?
- [ ] Has a test file in `packages/cli/test/migration/` covering happy path + edge cases?
- [ ] Tested with dirty data (NULLs, missing fields, malformed JSON)?
- [ ] Tested with realistic data volumes?
- [ ] Tested on both SQLite and PostgreSQL?

