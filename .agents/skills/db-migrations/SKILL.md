---
name: n8n:db-migrations
description: Authors n8n database migrations. Use when creating or modifying files under packages/@n8n/db/src/migrations/, when the user asks to add a column, table, index, foreign key, or backfill, or when the user mentions DB migrations or TypeORM migrations.
---

# n8n Migration Guidelines

**Rule of thumb:** the `@n8n-io/migrations-review` team gates every migration PR. The fixes they ask for are predictable — work through the [Pre-flight checklist](#pre-flight-checklist) before requesting review. The rest of this document explains the *why* for each item and covers deeper topics.

---

## Table of Contents

- [Overview](#overview)
- [Pre-flight checklist](#pre-flight-checklist)
- [Common Guidance](#common-guidance)
- [Schema Migrations](#schema-migrations)
- [Data Migrations](#data-migrations)
- [Cross-database Compatibility](#cross-database-compatibility)
- [Tests](#tests)
- [General Design Guidance](#general-design-guidance)
- [Schema documentation](#schema-documentation)

---

## Overview

### Directory Structure

```
packages/@n8n/db/src/migrations/
├── common/           # Default — DSL handles SQLite + Postgres
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

### MigrationContext API

Source of truth: `packages/@n8n/db/src/migrations/migration-types.ts`. Check the source for exact signatures when in doubt.

```typescript
interface MigrationContext {
	// Database info
	dbType: 'postgresdb' | 'sqlite';
	isSqlite: boolean;
	isPostgres: boolean;
	tablePrefix: string;
	dbName: string;

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
	loadSurveyFromDisk(): string | null;
	logger: Logger;
	migrationName: string;
	queryRunner: QueryRunner;  // Avoid direct use — prefer runQuery()
}
```

### DSL Type Mapping Reference

Source of truth: `packages/@n8n/db/src/migrations/dsl/column.ts`.

| DSL type | PostgreSQL | SQLite |
|---|---|---|
| `int` | `int` | `integer` |
| `bigint` | `bigint` | `integer` |
| `smallint` | `smallint` | `integer` |
| `varchar(N)` | `varchar(N)` | `varchar(N)` *(length not enforced)* |
| `text` | `text` | `text` |
| `json` | `json` | `text` |
| `uuid` | `uuid` | `varchar` |
| `bool` | `boolean` | `boolean` |
| `double` | `double precision` | `real` |
| `binary` | `bytea` | `blob` |
| `timestampTimezone` | `timestamptz` | `datetime` |
| `timestampNoTimezone` | `timestamp` | `datetime` |
| `timestamp` *(deprecated)* | `timestamp` | `datetime` |

Default precision for the timestamp variants is 3 ms; override with `.timestampTimezone(6)`.

---

## Pre-flight checklist

Run through this before requesting review. Each item is a real, recurring reviewer flag; the link points to the section that explains the rule.

- [ ] Migration was scaffolded with `pnpm --filter=@n8n/db migration:new` (timestamp + registration are automatic; the `migration-timestamp` lint rule catches drift). — [Creating Migrations](#creating-migrations)
- [ ] Identifiers go through **`escape.tableName(...)` / `escape.columnName(...)`**. Never hand-write `n8n_table` prefixes. — [Always escape identifiers](#always-escape-identifiers)
- [ ] **Match column type to value semantics.** Native `uuid` for UUIDs, `timestampTimezone()` for timestamps, a numeric type for numbers, `bool` for booleans, `json` for structured data. Never `varchar` as a catch-all. — [Column types](#column-types)
- [ ] **Pick the narrowest sane type within that category:** `int`/`smallint` not `bigint` when range allows; `text` not `varchar(255)` for unbounded strings; never `double` for version numbers. — [Column types](#column-types)
- [ ] **Default `notNull`**, relax only when justified. PK is implicitly NOT NULL. Migration's `notNull` matches the entity's nullability. — [NOT NULL and entity parity](#not-null-and-entity-parity)
- [ ] **Enum-like columns** carry `.withEnumCheck([...])` AND `.comment('explains values')`. Opaque IDs / unix timestamps / JSON shapes also get `.comment()`. — [Constrain enum-like strings](#constrain-enum-like-strings), [Add comments on columns](#add-comments-on-columns)
- [ ] **Every reference column has an explicit FK** with deliberate `onDelete`. Name FKs explicitly when SQLite recreate cycles risk duplicating them. Avoid polymorphic `(typeCol, idCol)` patterns. — [Foreign Key Constraints](#foreign-key-constraints), [General Design Guidance](#general-design-guidance)
- [ ] **Indexes match real query patterns.** A unique constraint already creates an index; a composite PK indexes its prefix. Mirror `withIndexOn(...)` to entity `@Index(...)`. — [Index Management](#index-management)
- [ ] **Sparse-unique columns:** use a partial index `WHERE col IS NOT NULL`. — [Index Management](#index-management)
- [ ] **Composite index column order** matches your actual `WHERE` / `ORDER BY` usage. — [Index Management](#index-management)
- [ ] **Entity ↔ migration parity**: column types, `notNull`, defaults, FKs, `@Index` decorators all match. — [Schema/Entity Drift](#schemaentity-drift)
- [ ] **If using `addColumns`, `dropColumns`, `addNotNull`, `dropNotNull`, `addEnumCheck`, or `dropEnumCheck`:** verified whether the target table has incoming FKs. If so, either set `withFKsDisabled = true as const` (in a `sqlite/` subclass if this is a `common/` migration) or use raw `ALTER TABLE ADD COLUMN` for nullable/defaulted columns. — [SQLite table recreation risk](#sqlite-table-recreation-risk)
- [ ] **No live-app value imports** in the migration body. Inline types/utility code locally. — [Never import entities as values](#never-import-entities-as-values)
- [ ] **`async down()` was tested locally**: `pnpm start && pnpm start -- db:revert && pnpm start` on **both** SQLite and Postgres. — [Reversibility](#reversibility)
- [ ] **One logical change per migration**; split unrelated table changes into separate files. — [Don't combine independent schema changes](#dont-combine-independent-schema-changes)
- [ ] **`up()` / `down()` reads as a list of intentions.** If either body grows past a screen or mixes schema operations with a multi-statement raw-SQL data move, extract the data move into a `private async` method on the same class (e.g. `private async backfillFromX(ctx)`). The top-level should orchestrate, not implement.
- [ ] **Precedent is the bar to fix, not perpetuate.** When the checklist conflicts with what an older migration does (e.g. redundant `.primary.notNull`, hand-quoted identifiers, missing `.comment()`), the checklist wins for new code — don't copy the violation forward. Note the old occurrences in the PR if you spotted them.
- [ ] **Regenerated the schema docs** with `pnpm db:schema:docs` and committed the `docs/generated/` changes. The DB Tests CI job fails on stale docs. — [Schema documentation](#schema-documentation)

Treat the checklist as a floor, not a ceiling.
If any item fails, fix it before opening review.

---

## Common Guidance

Rules that apply to every migration — schema or data, common or DB-specific. Read this section before writing anything.

### Creating Migrations

> **Temporary timestamp workaround:** This repository currently has future-dated migrations, with the head at `1784000000008` (`2026-07-14T03:33:20.008Z`). Until real time passes that timestamp, a migration created with `Date.now()` would sort before the deployed head and can run out of order on databases that already applied later migrations. Use the generator during this window — it picks `max + 1` when needed. See [PR #30511](https://github.com/n8n-io/n8n/pull/30511) for context.

Migration files are named `{TIMESTAMP}-{DescriptiveName}.ts`. The timestamp must be strictly greater than every existing migration timestamp in this package (across `common/`, `postgresdb/`, and `sqlite/`). TypeORM runs unrecorded migrations in timestamp order, so inserting a value below the current max corrupts ordering on databases that have already executed the later migrations.

Use the generator — it picks a safe timestamp, writes the scaffold, and registers the migration in the relevant `index.ts` files:

```sh
pnpm --filter=@n8n/db migration:new <Name> [--folder=common|postgresdb|sqlite]
```

`<Name>` is PascalCase and describes the change (e.g. `AddTracingToExecution`). `--folder` defaults to `common`; use `postgresdb` or `sqlite` only for dialect-specific migrations. The generator picks `Date.now()` when it's greater than the current head, otherwise `max + 1`.

The `migration-timestamp` rule in `@n8n/code-health` enforces both invariants (strict ordering and no far-future fabrication) at lint time; the generator is the easy path, the rule is the safety net.

### Applying and Reverting Migrations

Pending migrations are applied during normal n8n startup. In a local checkout, run `pnpm start` with the target code version to apply them manually.

To revert the most recently applied reversible migration, use the CLI command:

```sh
n8n db:revert
```

In a local checkout, run the same command through the package script:

```sh
pnpm start -- db:revert
```

Do **not** revert migrations by editing the migrations table or running
hand-written SQL. `db:revert` runs the migration's `down()` method and
preserves TypeORM's migration bookkeeping.

### Which directory to choose

```
single schema change, DSL covers it       → common/
Postgres-only feature (gen_random_uuid,
  ALTER COLUMN TYPE, partial expr index)  → postgresdb/
SQLite needs different recipe or to skip
  CASCADE on table recreate               → sqlite/ (subclass common/, set withFKsDisabled = true as const)
```

If only Postgres needs the change, put the file under `postgresdb/` only — don't write a no-op SQLite migration with `if (isPostgres)` guards. See [Cross-database Compatibility](#cross-database-compatibility) for when to split per-DB.

### Class shape

```typescript
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
- `IrreversibleMigration` only when `down()` would lose data unrecoverably — see [Reversibility](#reversibility).
- `withFKsDisabled = true as const` only in `sqlite/` subclasses that recreate FK-referenced tables (otherwise SQLite's CASCADE eats data).

### Follow good code hygiene

A migration class is still a class — `up()` shouldn't be a 200-line procedure. Break long logical steps into private methods with a name that describes what they do (`backfillSlugs`). `up()` then reads as a short list of step calls. **Don't extract single-line steps.** A method whose body is one DSL call adds no information — the call site is already self-documenting.

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
    await addColumns('my_table', [column('slug').varchar(255)], { recreatesOnSqlite: true });

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

**Why:** A migration is read more often than it's written — during review, during incident response, and years later when someone has to understand why a column exists. Named steps double as documentation. They also make it easier to skim a diff: a reviewer can tell at a glance whether the change is "added a new step" or "rewrote an existing one." Reversible migrations benefit even more — `down()` can call the same private helpers in reverse.

### Prefer `runQuery()` over `queryRunner`

Run SQL through `runQuery()` from `MigrationContext`. Never call `queryRunner.query()` or `queryRunner.manager.*` from a migration.

**Why:** `runQuery()` handles named parameter binding consistently, while identifiers still need `escape.tableName()`, `escape.columnName()`, and `escape.indexName()`. `queryRunner.query()` bypasses the parameter helper. `queryRunner.manager` calls couple the migration to TypeORM entity definitions, which change over time — a migration that worked at v1.0 can break at v2.0 if the entity shape evolves.

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

### Logging

Use the `logger` from `MigrationContext` — never `console.log`.

```typescript
logger.info(`[${migrationName}] Processing ${count} workflows`);
logger.warn(`[${migrationName}] Skipping row ${id}: missing required field`);
```

### Don't combine independent schema changes

One logical change per file. Multiple unrelated tables → split. The reviewer line: "the name of the migration is misleading because it does two things." A migration that adds a column to `workflow_entity` *and* creates `audit_log` should be two migrations.

### Don't edit a previously merged migration

Once shipped, migrations are immutable. Write a new migration. To remove a column added by an earlier migration, do it in a separate follow-up migration (typically in a later release — see [Deprecate columns, then drop in a follow-up](#deprecate-columns-then-drop-in-a-follow-up)).

### Don't parameterize values that aren't user input

Inline literals where the value is from the migration itself. Named parameters are for runtime values; constants in the migration body can sit directly in the SQL.

### Naming and entity conventions

- **Table names**: snake_case, no `_entity` suffix on new tables (old convention only).
- **Column names**: camelCase in code; don't repeat the table name in column names (`user.userEmail` → `user.email`).
- **Constants**: camelCase, not SCREAMING_CASE.
- **Entity name override**: set `@Entity({ name: 'snake_case_name' })` explicitly when the entity class name and table name differ.
- **TypeORM relations**: use `Relation<T>` rather than direct references — avoids known circular-import issues.
- **Abstract entities**: extend `WithTimestamps` or `WithTimestampsAndStringId` when applicable — the established standard.
- **Don't denormalize without a concrete read pattern that benefits.** Justify any duplicated column in the PR description.

---

## Schema Migrations

### Use the DSL for Schema Changes

Use the schema builder DSL for additions, removals, and changes. It handles cross-database type mapping automatically. If a helper is missing, either add one or bring it up.

```typescript
export class CreateMyTable1234567890000 implements ReversibleMigration {
  async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
    await createTable('my_table')
      .withColumns(
        column('id').int.primary.autoGenerate2,   // Use autoGenerate2, not autoGenerate
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

### SQLite table recreation risk

Six DSL methods trigger **full table recreation** on SQLite — TypeORM internally creates a temp copy, drops the original, and renames:

| Method | TypeORM internal call |
|---|---|
| `addColumns()` | `queryRunner.addColumns()` |
| `dropColumns()` | `queryRunner.dropColumns()` |
| `addNotNull()` | `queryRunner.changeColumn()` |
| `dropNotNull()` | `queryRunner.changeColumn()` |
| `addEnumCheck()` | `queryRunner.changeColumn()` |
| `dropEnumCheck()` | `queryRunner.changeColumn()` |

All six require a final options parameter with `recreatesOnSqlite: true` — TypeScript rejects calls that omit it.

**The danger:** If the target table has incoming FK constraints with `CASCADE` from other tables, the `DROP TABLE` during recreation fires cascading deletes and **wipes rows from those referencing tables**.

**Decision tree:**

1. Does the target table have incoming FK constraints from other tables?
   - **No** → Safe to use the DSL method directly (with the ack parameter).
   - **Yes** → Continue to step 2.
2. Is this an `addColumns` call where every new column is nullable or has a default?
   - **Yes** → Use raw `ALTER TABLE ADD COLUMN` instead (avoids table recreation entirely):
     ```typescript
     await runQuery(
       `ALTER TABLE ${escape.tableName('my_table')} ADD COLUMN ${escape.columnName('col')} TEXT`,
     );
     ```
     See `1733133775640-AddMockedNodesColumnToTestDefinition.ts` for a real example.
   - **No** → Continue to step 3.
3. Set `withFKsDisabled = true as const` on the migration class. For common migrations, create a SQLite subclass in `sqlite/` that extends the common migration and adds the flag:
   ```typescript
   // sqlite/1234567890000-MyMigration.ts
   import { MyMigration1234567890000 as BaseMigration } from '../common/1234567890000-MyMigration';

   export class MyMigration1234567890000 extends BaseMigration {
     withFKsDisabled = true as const;
   }
   ```

**How `withFKsDisabled` works:** The migration wrapper calls `PRAGMA foreign_keys=OFF` before `up()`/`down()`, runs the migration inside a manual transaction, then re-enables foreign keys. This prevents CASCADE from firing during the internal table drop. It also sets `transaction = false` to avoid TypeORM's default transaction (since SQLite can't nest transactions with PRAGMA changes).

> **Note:** On Postgres, these methods use `ALTER TABLE` directly and don't recreate the table. The risk is SQLite-specific.

### Column types

**Match column type to value semantics.** Never `varchar` as a catch-all for non-string values — storing numbers as strings loses sort order, range queries, and SUM/AVG aggregations.

- `DATE` not `timestamp` when only the date matters.
- A numeric type (`bigint`, `int`, `smallint`) for byte counts and measurements — never `varchar`.
- Native `uuid` over `varchar(36)` when the value is actually a UUID. Postgres stores `uuid` as 16 bytes vs ~37 for `varchar(36)`; the difference compounds across joined tables and indexes.
- `bool` for booleans; `json` for structured data.
- `timestampTimezone()` (default 3-ms precision) or `timestampNoTimezone()` deliberately. **`.timestamp()` is deprecated.**

**Pick the narrowest sane type within that category.**

- `smallint` for small bounded counters/enums; `int` over `bigint` unless overflow is plausible.
- Use `bigint` proactively for monotonically-growing counters that can overflow `int` (insights/usage counters).
- Don't use `double` for version-like fields; floating-point precision bites. Use a string or split major/minor.
- `text` over `varchar(255)` for unbounded user-supplied strings unless a real limit applies. (SQLite ignores `varchar(N)` length entirely; validate at the app layer if needed.)

### NOT NULL and entity parity

- A primary key is implicitly `NOT NULL`; don't redeclare.
- Migration's `notNull` must match the entity's nullability annotation. Mismatch causes runtime nulls TypeORM can't reconcile.
- Default to `NOT NULL`; relax only with explicit reasoning ("does this need to be nullable, and when?").

### Add comments on columns

Use `.comment()` on columns whose purpose isn't obvious from the name alone — especially JSON blobs, flags, opaque IDs, unix timestamps, and columns whose values come from external systems. The comment ends up in the schema; a code comment doesn't.

```typescript
column('config').json.comment('Serialized node parameters at time of publish'),
column('isArchived').bool.notNull.default(false).comment('Soft-delete flag; filtered out in list queries'),
```

### Constrain enum-like strings

For columns that should hold one of a small set of values, use `.withEnumCheck([...])` on the column. When adding a CHECK constraint via raw SQL, name it explicitly.

### Default values reflect realistic initial state

Don't set the default of a `status` column to a terminal value — `"running"` makes more sense than `"done"` for a status that will transition.

### Primary Keys

Every table needs a primary key. Choose the type in this order:

1. **Integer** — `column('id').int.primary.autoGenerate2`. Preferred for new tables: compact, fast joins, no ordering surprises. `autoGenerate2` uses Postgres `IDENTITY` (preferred over the deprecated `serial`-based `autoGenerate`).
2. **UUID** — `column('id').uuid.primary`. Use when IDs are generated client-side, exposed in URLs, or need to be unguessable. Generate UUIDs in application code via `randomUUID()` from `node:crypto`; do **not** chain `.autoGenerate2` on `.uuid` (the DSL throws — `DEFAULT uuid_generate_v4()` fails on managed Postgres like Supabase because it needs the `uuid-ossp` extension in `public`). Use `.uuid` instead of `.varchar(36)`.
3. **String** — `column('id').varchar(36).primary` for IDs whose format isn't a UUID (e.g. nanoid-style IDs). Convention: nanoid length 16 for entity IDs.

**Keep ID-column types consistent across related tables.** Mixing `uuid` and `varchar(36)` for what is "the same kind of ID" creates JOIN footguns.

**DSL behavior to know:**
- `.primary` already implies `notNull`. Don't chain `.notNull` together with `.primary` — it's redundant.
- `.primary` already creates the primary-key index. Don't add a separate `.withIndexOn(['id'])` for it.

**Composite primary keys are first-class** — chain `.primary` on each participating column. Skip the surrogate `id` when natural keys work.

```typescript
await createTable('membership')
  .withColumns(
    column('userId').uuid.primary,
    column('roleId').uuid.primary,
  );
```

### Foreign Key Constraints

**FKs are the default; opting out needs justification.**. For polymorphic refs (one column points at different tables based on a sibling type column), see [General Design Guidance](#general-design-guidance).

**Specify `onDelete` explicitly.** Don't rely on database defaults. Answer "what happens when [parent] is deleted?" in the PR description.

| Relationship type | `onDelete` | Example |
|---|---|---|
| Child is meaningless without parent | `CASCADE` | `annotation_tag_mapping` → `annotation` |
| Child should outlive parent (keep history) | `SET NULL` | `workflow_publish_history.userId` → `user` |
| Audit / statistics / history tables | `NO ACTION` or `SET NULL` | `workflow_statistics` → `workflow_entity` |
| Reference should prevent deletion | `RESTRICT` | (use when business logic forbids orphaning) |

For `SET NULL`, the FK column must be nullable. For `CASCADE`, consider whether the cascade depth is bounded — long cascade chains can lock many tables in a single delete.

**SQLite quirks:**
- Dropping/recreating tables can leave duplicated FKs across up/down cycles. **Name FKs explicitly** so down migrations can target them.
- Down migrations sometimes fail on engines with FK-protected indexes (`Cannot drop index 'X': needed in a foreign key constraint`). Test both directions on every engine.

**NULL semantics in joins/uniqueness differ across engines.** Comparing NULL with non-NULL filters rows on at least SQLite. Partial uniqueness across NULLs differs Postgres vs SQLite. Be deliberate when a column is nullable and participates in a unique constraint or join condition.

### Index Management

```typescript
// Creating indices
await schemaBuilder.createIndex('my_table', ['columnA', 'columnB']);
await schemaBuilder.createIndex('my_table', ['email'], true); // unique

// Partial unique index — uniqueness only on non-null rows
await schemaBuilder.createIndex(
	'my_table',
	['externalRef'],
	true,                              // isUnique
	undefined,                         // customIndexName
	'"externalRef" IS NOT NULL',       // whereClause
);

// Dropping indices (defensively)
await schemaBuilder.dropIndex('my_table', ['columnA'], { skipIfMissing: true });
```

**Best practices:**

- **Add indexes sparingly, and only when you've measured a speedup.** Every index slows down inserts/updates and consumes disk. Don't add one "just in case" — run the query against a realistic dataset, confirm it's slow, add the index, confirm the planner uses it and the query is now fast. If you can't show a measurable improvement, don't ship the index.
- **A unique constraint already creates an index — don't double up.** A composite primary key indexes its prefix columns; a separate index on the prefix is redundant.
- **Index foreign key columns.** Joins and cascading deletes hit FKs on every operation; an unindexed FK degrades into a sequential scan on the child table.
- **Column order matters in composite indexes.** An index on `(A, B)` serves `WHERE A = ?` and `WHERE A = ? AND B = ?`, **not** `WHERE B = ?`. ORDER BY direction in the index must match the query's `ORDER BY` (e.g. `(sessionId, createdAt ASC, id DESC)`).
- **Don't index low-cardinality columns alone** (booleans, status enums with 2–3 values). Either skip the index or make it a partial index — both Postgres and SQLite (since 3.8.0) support `WHERE` clauses on indexes.
- **Partial unique indexes for sparse-unique columns.** Add `WHERE col IS NOT NULL` to exclude NULL rows: smaller index, no uniqueness checks against the NULL bucket.
- **Unique indexes enforce uniqueness AND speed up lookups.** Prefer them over a separate unique constraint + index pair.
- **Drop unused indexes.** If a query plan no longer uses it, drop it in a follow-up migration.
- **Name indexes via the DSL,** never hand-roll names. The DSL prefixes them consistently so they line up across environments.
- **Mirror DSL indexes onto the entity with `@Index`.** The migration creates the runtime index; the entity decorator keeps fresh-DB setups in sync.
- **Use `.withIndexOn(...)` when defining a new table** rather than a separate `createIndex(...)` call.

### Reversibility

- `ReversibleMigration`: the `down()` **must actually work**. If shrinking a column, truncate data gracefully. If dropping a table, consider that the table may have been populated.
- `IrreversibleMigration`: use when the `up()` **destroys information a faithful `down()` would need** — not as an escape hatch for tedious `down()` code. Examples: backfills that overwrite values without capturing the prior state; encryption operations that don't keep plaintext; aggregations that lose row-level detail.
- **Never write an empty or broken `down()`.** If you can't reverse it, use `IrreversibleMigration`.
- `down()` must restore the previous schema, not just drop new objects — its effect should let `up()` be re-run cleanly afterwards.
- **Test the down migration** on both engines: `pnpm start && pnpm start -- db:revert && pnpm start`. Down failures often surface as FK-protected indexes blocking column drops.

### Schema/Entity Drift

Schema, entity, and OpenAPI types must agree. Caught regularly:

- `notNull` lost on the entity but present in the migration (or vice versa).
- Entity says `string` but the column is something else.
- `@Index` mirrors don't exist on the entity.
- `up` and entity disagree on defaults or constraints.

When a new column is required for data integrity (e.g. `activeVersionId` should be set whenever `active` is TRUE), enforce it via a CHECK constraint in the migration **and** a runtime invariant in app code.

### Deprecate columns, then drop in a follow-up

Don't drop a column the same release you stop writing to it. Wait one release, then drop. This protects rolling deploys and provides a quick rollback path if the "stop writing" change has unforeseen issues.

---

## Data Migrations

Data migrations transform existing rows: parsing JSON, backfilling columns, migrating data between tables, cleaning up invalid data.

### Always Handle Dirty / Legacy Data

This has been the **#1 source of migration bugs**.

- **Wrap JSON parsing in try/catch.** Log a warning and skip the row — never crash the whole migration. Use `parseJson()` from `MigrationContext`; it handles edge cases better than raw `JSON.parse`.
- **Check for null/undefined before accessing properties:** `node.type && isTriggerNode(node.type)`.
- **`Array.isArray()` before iterating.**
- **Account for ALL historical versions** of a data structure, not just the current one. A migration shipping today may run on a database last touched two years ago.
- **Filter out invalid rows in SQL:** `WHERE workflowId IS NOT NULL`.

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

### Push the transformation into SQL, not Node

Prefer `INSERT … SELECT`, `UPDATE … FROM`, `DELETE … WHERE` over fetching rows to Node and writing them back. Loading whole tables into JS memory is slow and OOM-prone on large instances; the database can do the same work in place much faster.

When SQL alone can't express the transformation, fall back to `runInBatches`. Filter early in SQL (`LIKE`/`WHERE`) to reduce the row count before parsing on the Node side.

### Use Batch Operations

**Never `SELECT *` unbounded on tables that could have millions of rows.**

```typescript
// ✅: batched processing
await runInBatches<Workflow>(
	`SELECT id, nodes FROM ${tableName} WHERE ${condition}`,
	async (workflows) => {
		for (const workflow of workflows) {
			// ... process each workflow ...
		}
	},
	100, // batch size (default: 100, use 100-500)
);

// ✅: batched table copy
await copyTable('old_table', 'new_table', ['col1', 'col2'], ['col1', 'col2'], 500);
```

A sequential scan on the entire table is very slow on larger instances. If you must iterate, batch.

### Order backfill inserts deliberately

When the migration writes rows whose order is observable downstream (auto-increment IDs, default sort order, "most recent first" UI lists), add explicit `ORDER BY` to the source `SELECT` — typically `updatedAt` or `createdAt`. Without one, the database picks any order and the chronology that was implicit in the old schema is lost.

### Mixed Schema + Data Migrations

When a migration both adds a column and backfills data, structure it clearly with one method per concern:

```typescript
export class AddAndBackfillColumn1234567890000 implements IrreversibleMigration {
	async up(ctx: MigrationContext) {
		await ctx.schemaBuilder.addColumns(
			'my_table',
			[ctx.schemaBuilder.column('newCol').text],
			{ recreatesOnSqlite: true },
		);
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

The schema change and the data backfill have different failure modes, different transaction implications, and different testing needs — keeping them in separate methods makes review easier and lets `down()` (if reversible) call the same helpers in reverse.

### For deletions, prefer keeping old rows as a fallback

Self-hosted instances may have unexpected data shapes. If the migration results in missing or inconsistent data, the old row is the only recovery path.

Default to two-release expand-contract:
- **Release N (this migration):** write the new location, leave the old in place.
- **Release N+1 (separate follow-up migration, after the new code has been observed in production):** drop the old location.

Skip the gap only when the old location is genuinely throwaway (e.g. a temp table this same migration created), or when compliance forces immediate deletion — in which case mark the migration `IrreversibleMigration` and call out the trade-off in the PR description.

### Keep denormalized columns in sync

Where data is duplicated across two tables (e.g. `workflow_entity.nodes` vs `workflow_history.nodes`), the backfill must update both copies. Out-of-sync denormalized data tends to be discovered weeks later, usually in production.

### Don't add JSON-substring scans on hot tables

Add a real column (e.g. `isDraft`, similar to `isArchived`) instead of `WHERE settings::text LIKE '%foo%'`. Substring scans on JSON blobs degrade into full table scans and don't index.

### Avoid storing large blobs inline on hot rows

Move opt-out large columns to a side table — backups, replication, and read performance all benefit. The row-level lock on a hot table also shrinks when the row payload is smaller.

### Verify data integrity when copying tables

Count source vs temp before swapping; throw on mismatch. Silent row loss during a copy is one of the worst failure modes because it surfaces only when someone notices the missing data.

### Atomic SQL within the migration's transaction

Some migrations override with `transaction = false as const` for big DDL on engines that disallow it inside a transaction. The DSL/wrapper sets `transaction = false` automatically when `withFKsDisabled = true`. Otherwise, leave transactions alone — TypeORM wraps each migration in one by default.

---

## Cross-database Compatibility

### Single Migration File or Separate for SQLite & Postgres

- **Small differences** (a single statement, a CHECK constraint, slightly different syntax): keep one migration in `common/` and branch on `isSqlite` / `isPostgres`.
- **Large differences** (different table recreation strategies, different intermediate steps, fundamentally different SQL): write **separate files** in `postgresdb/` and `sqlite/`. A common migration full of `if (isSqlite) { ... }` blocks is harder to read and review than two focused files.

If only Postgres needs the change, just put the file in `postgresdb/`; don't write a no-op SQLite migration with `if (isPostgres)`. For SQLite column adds, follow the [SQLite table recreation risk](#sqlite-table-recreation-risk) decision tree before deciding whether a common migration is enough or a SQLite subclass/raw `ALTER TABLE` path is needed.

### SQLite supports modern syntax

- `UPSERT` / `ON CONFLICT DO NOTHING` works on SQLite — use the same syntax as Postgres rather than `INSERT OR REPLACE`.
- SQLite has a real `JSON` type.
- SQLite supports `ALTER TABLE ... RENAME TO`.

**`INSERT OR REPLACE` ≠ `ON CONFLICT DO NOTHING`.** `OR REPLACE` overwrites; `ON CONFLICT DO NOTHING` ignores. SQLite supports both — pick the one that matches Postgres semantics for the same code path.

### Postgres-version-aware UUID generation

`gen_random_uuid()` requires Postgres ≥ 13. n8n dropped Postgres 12 — prefer it over `uuid_generate_v4()` (which needs the `uuid-ossp` extension and breaks on managed services like Supabase). For UUID PKs, generate at the application level with `randomUUID()` — see [Primary Keys](#primary-keys).

### SQLite doesn't enforce `varchar(N)` length

Validate at the app layer if length matters.

### Boolean defaults render differently across engines

`DEFAULT (false)` vs `DEFAULT 0` vs `DEFAULT FALSE`. Let the DSL handle it; don't hand-write boolean defaults in raw SQL.

### Prefer `ALTER` over drop-and-recreate

For renames, use `ALTER TABLE ... RENAME TO`. Faster, atomic, no data-loss risk.

---

## Tests

**Every data migration ships with an integration test.** Schema-only migrations can usually be reviewed by reading the DSL calls. Data migrations cannot — they encode assumptions about row shape, JSON structure, NULL handling, and edge cases that only show up when the migration actually runs against representative data.

A data migration runs *once* per database, on production data, with no opportunity to retry cleanly. The cost of a bad migration is a customer-facing incident; the cost of a test is ten minutes.

Tests live in `packages/cli/test/migration/`, named to match the migration file (e.g. `1773000000000-create-credential-dependency-table.test.ts`). Use the helpers from `@n8n/backend-test-utils`:

- **`initDbUpToMigration(MigrationName)`** runs every migration *up to but not including* yours, leaving the DB in the exact state your migration will see in production.
- **`runSingleMigration(MigrationName)`** runs just your migration on top of that state.

Full helper API: `packages/@n8n/backend-test-utils/MIGRATION_TESTING.md`.

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

**Insert fixtures via raw SQL only.** Repositories evolve with the schema and break older tests over time. Use `context.escape.tableName(...)` and `context.runQuery(sql, params)` directly.

**Test name describes behavior**, not the SQL: `'backfills newCol from oldCol'`, not `'runs UPDATE on my_table'`.

**What to cover:**
- The happy path (correctly transforms a typical row).
- Each edge case the migration claims to handle (NULL fields, malformed JSON, missing keys, legacy schema versions).
- Idempotency where applicable — running the migration twice shouldn't double-apply transformations.
- Both SQLite and Postgres if the migration branches on DB type.

---

## General Design Guidance

These are widely-applicable database design principles that aren't tied to a single recurring PR comment, but worth keeping in mind because the *cost* of getting them wrong shows up in the codebase (manual orchestration where the DB could have done the work for free).

### Avoid polymorphic `(typeCol, idCol)` pairs

A "polymorphic" column pair is one column that points at different tables depending on a sibling type column — e.g. `dependencyType: 'externalSecretProvider' | ...` plus `dependencyId: string`. SQL FKs target exactly one table, so polymorphic `idCol`s cannot have an FK declaration.

**Consequences:**
- No insert validation (you can insert a `dependencyId` that doesn't match any row).
- No cascade/restrict on parent delete — application code has to manually walk every table that might point at the deleted row and delete dependents inside a transaction (see `credential_dependency` + `secrets_provider_connection` deletion paths for a real example of this cost).
- Orphan rows are possible by construction.

**Alternatives:**
- **Separate join tables per relation type** (`credential_external_secret_dependency`, `credential_node_dependency`, …). Each has a real FK. Queries that need "all dependencies" become a UNION.
- **One nullable FK per possible target** with a CHECK constraint that exactly one is set. Each column is a real FK.
- **Supertype table**: hoist parents into a single `dependency_target` with its own type column, then have one FK to that table.

---

## Schema documentation

The database schema is documented under `docs/generated/` — `docs/generated/sqlite-schema/` and `docs/generated/postgres-schema/`, one Markdown page per table plus a Mermaid ER diagram. These are **auto-generated from the migrations** with [tbls](https://github.com/k1LoW/tbls) (it runs every migration against a throwaway database and introspects the result), so any schema-changing migration makes them stale.

Regenerate and commit them alongside your migration:

```sh
pnpm db:schema:docs    # rewrites docs/generated/ — requires Docker (and `brew install tbls` locally)
pnpm db:schema:check   # verify only; what the DB Tests CI job runs
```

The DB Tests CI job fails the PR when the committed docs don't match the migrations (each matrix leg verifies its own database). Don't hand-edit anything under `docs/generated/` — it's overwritten on every regeneration.
