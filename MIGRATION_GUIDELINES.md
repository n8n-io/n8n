# n8n Migration Guidelines

Comprehensive guidelines for writing database migrations in the n8n repository, based on analysis of **213 migration files** and **50 recent migration PRs** (Oct 2025 – Feb 2026), of which ~15 were fix commits correcting mistakes in earlier migrations.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Part 1: Schema Migrations](#part-1-schema-migrations)
- [Part 2: Data Migrations](#part-2-data-migrations)
- [Part 3: Current Discrepancies & Anti-Patterns](#part-3-current-discrepancies--anti-patterns)
- [Quick Reference](#quick-reference)

---

## Architecture Overview

### Directory Structure

```
packages/@n8n/db/src/migrations/
├── common/           # 106 cross-database migrations (preferred location)
├── postgresdb/       # 52 PostgreSQL-specific migrations + index.ts
├── sqlite/           # 55 SQLite-specific migrations + index.ts
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

## Part 1: Schema Migrations

### 1.1 Use the DSL for Schema Changes

Use the schema builder DSL for additions, removals, and changes. It handles cross-database type mapping automatically.

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

### 1.2 Use Raw SQL for Altering Large Existing Tables

The DSL's `addColumns()` / `dropColumns()` internally **copies the entire table on SQLite**. For tables with millions of rows (`execution_data`, `execution_entity`, `workflow_statistics`), this is catastrophic.

```typescript
// BAD: copies entire execution_data table on SQLite
await addColumns('execution_data', [column('newCol').text]);

// GOOD: metadata-only operation on both databases
const table = escape.tableName('execution_data');
const col = escape.columnName('newCol');
await runQuery(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT`);
```

**When to use raw SQL over DSL:**
- Adding nullable columns to large tables
- Altering column types (requires table recreation on SQLite regardless)
- Any operation on tables that can have >100k rows

### 1.3 Handle SQLite vs PostgreSQL Differences

**Choose between a single common migration or split files:**

- **Small differences (a single statement, a CHECK constraint, slightly different syntax):** keep one migration in `common/` and branch on `isSqlite` / `isPostgres`.
- **Large differences (different table recreation strategies, different intermediate steps, fundamentally different SQL):** write **separate files** in `postgresdb/` and `sqlite/`. A common migration full of `if (isSqlite) { ... }` blocks is harder to read and review than two focused files.

```typescript
// Small difference — keep in common/, branch inline
if (isPostgres) {
  await runQuery(`ALTER TABLE ${table} ALTER COLUMN ${col} TYPE VARCHAR(256)`);
} else if (isSqlite) {
  // Temp column trick (for simple cases)
  await runQuery(`ALTER TABLE ${table} ADD COLUMN "${col}_tmp" VARCHAR(256)`);
  await runQuery(`UPDATE ${table} SET "${col}_tmp" = ${col}`);
  await runQuery(`ALTER TABLE ${table} DROP COLUMN ${col}`);
  await runQuery(`ALTER TABLE ${table} ADD COLUMN ${col} VARCHAR(256)`);
  await runQuery(`UPDATE ${table} SET ${col} = "${col}_tmp"`);
  await runQuery(`ALTER TABLE ${table} DROP COLUMN "${col}_tmp"`);
}
```

### 1.4 SQLite Specifics

SQLite has stricter limitations than PostgreSQL. The most important ones to plan around:

**Operations that trigger full table recreation on SQLite:**

| Operation | Why |
|---|---|
| `ALTER COLUMN` (type change, nullability, default) | SQLite has no `ALTER COLUMN` — DSL copies the table |
| Adding or dropping a foreign key constraint | FKs are part of the `CREATE TABLE` statement |
| Renaming a column referenced by an index, view, or trigger | SQLite has to rebuild dependents |
| `DSL.addColumns()` / `dropColumns()` on any table | DSL recreates the table to preserve column ordering and constraints |
| `withEnumCheck()` changes (adding/removing values) | CHECK constraint is baked into `CREATE TABLE` |

Because table recreation copies all rows into a new table, it is expensive on large tables (`execution_data`, `execution_entity`, `workflow_statistics`) — see [1.2](#12-use-raw-sql-for-altering-large-existing-tables).

**Disable foreign keys around table recreation to prevent data loss.**

When SQLite copies a table to apply a schema change, child tables with `ON DELETE CASCADE` foreign keys can have their rows silently deleted as the old table is dropped. Always set `transaction = false as const` on the migration class — the framework wraps the migration with `PRAGMA foreign_keys=OFF` and re-enables them after (`runDisablingForeignKeys` in `migration-helpers.ts`).

```typescript
export class MyTableRecreation1234567890000 implements ReversibleMigration {
  transaction = false as const; // Required for any DDL that recreates a table

  async up({ schemaBuilder }: MigrationContext) {
    // Safe: FKs are off, so CASCADE won't fire when the temp table is dropped
  }
}
```

**Other SQLite limitations:**
- No native enum type — use `.withEnumCheck(column, values)` to create CHECK constraints
- No `DROP COLUMN` before SQLite 3.35 — requires table recreation

**Key rules:**
- **Always branch on `isSqlite` / `isPostgres`** when SQL syntax differs
- Place branching logic in `common/` for small differences; split into `postgresdb/` and `sqlite/` for fundamentally different implementations
- SQLite migrations that do DDL must set `transaction = false as const`

### 1.5 Column Sizing

| Data type | Minimum size | Rationale |
|---|---|---|
| UUIDs / internal IDs | `varchar(36)` | Standard UUID is 36 chars |
| Tokens, secrets, OAuth state | `TEXT` | Unbounded — external providers control the length |
| Model names, provider IDs | `varchar(255)` | Provider-controlled, research before choosing smaller |
| User-facing text (names, labels) | `varchar(255)` | Unless you have a specific reason for smaller |
| JSON blobs | `json` (DSL) or `TEXT` | Never varchar for JSON |

**When in doubt, use TEXT.** The storage overhead is negligible compared to the cost of a fix migration.

### 1.6 Foreign Key Constraints

| Relationship type | `onDelete` strategy | Example |
|---|---|---|
| Child is meaningless without parent | `CASCADE` | `annotation_tag_mapping` → `annotation` |
| Child should outlive parent | `SET NULL` | `workflow_publish_history.userId` → `user` |
| Audit/statistics/history tables | `NO ACTION` or `SET NULL` | `workflow_statistics` → `workflow_entity` |
| Reference should prevent deletion | `RESTRICT` | Rarely needed in practice |

**Always specify `onDelete` explicitly.** Don't rely on database defaults.

### 1.7 Index Management

```typescript
// Creating indices
await schemaBuilder.createIndex('my_table', ['columnA', 'columnB']);
await schemaBuilder.createIndex('my_table', ['email'], true); // unique

// Dropping indices (defensively)
await schemaBuilder.dropIndex('my_table', ['columnA'], { skipIfMissing: true });
```

### 1.8 Reversibility

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
export class AddAndBackfillColumn implements IrreversibleMigration {
  async up({ schemaBuilder: { addColumns, column }, escape, runQuery, runInBatches }: MigrationContext) {
    // Step 1: Schema change
    await addColumns('my_table', [column('newCol').text]);

    // Step 2: Data backfill
    const table = escape.tableName('my_table');
    await runInBatches<Row>(
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

---

## Part 3: Current Discrepancies & Anti-Patterns

These are patterns found in the existing codebase that should **not** be followed in new migrations.

### 3.1 Direct `queryRunner` Usage Instead of `runQuery()`

**Found in ~15 migrations**, mostly older ones but also some recent:

| File | Issue |
|---|---|
| `1768402473068-ExpandModelColumnLength.ts` | Uses `queryRunner.query()` throughout instead of `runQuery()` |
| `1763572724000-ChangeOAuthStateColumnToUnboundedVarchar.ts` | Uses `queryRunner.query()` for ALTER/RENAME |
| `1770000000000-ExpandProviderIdColumnLength.ts` | Uses `queryRunner.query()` |
| `1742918400000-AddScopesColumnToApiKeys.ts` | Uses `queryRunner.manager.update()` with TypeORM entity |
| `1745322634000-CleanEvaluations.ts` | Uses `queryRunner.query()` |
| `1759399811000-ChangeValueTypesForInsights.ts` | Uses `queryRunner.query()` |
| `1750252139167-AddRolesTables.ts` | Uses `queryRunner.query()` |
| `1764276827837-AddCreatorIdToProjectTable.ts` | Uses `queryRunner.query()` |

**Why this is bad:** `runQuery()` handles table prefix escaping and parameter binding consistently. `queryRunner.query()` bypasses these safety nets. Direct `queryRunner.manager` calls couple migrations to entity definitions that may change.

**Rule:** Always use `runQuery()` from `MigrationContext`. Never use `queryRunner.query()` or `queryRunner.manager` directly.

### 3.2 Importing TypeORM Entities in Migrations

**Found in 12 migrations:**

| File | Imported entity |
|---|---|
| `1675940580449-PurgeInvalidWorkflowConnections.ts` | `WorkflowEntity` (value import — uses `queryRunner.manager.count()`) |
| `1742918400000-AddScopesColumnToApiKeys.ts` | `ApiKey` (value import — uses `queryRunner.manager.update()`) |
| `1658930531669-AddNodeIds.ts` | `WorkflowEntity` (type-only) |
| `1630330987096-UpdateWorkflowCredentials.ts` | `CredentialsEntity`, `WorkflowEntity` (type-only) |
| `1714133768519-CreateProject.ts` | `User` (type-only) |
| `1760020838000-UniqueRoleNames.ts` | `Role` (type-only) |

**Why this is bad:** Entity definitions change over time. A migration that ran fine in v1.0 could break if the entity shape changes in v2.0. Value imports (`import { Entity }`) are especially dangerous — they tie migration execution to the current entity state.

**Rule:**
- **Never import entities as values** in migrations. Use raw SQL via `runQuery()` instead of `queryRunner.manager`.
- **Type-only imports** (`import type { Entity }`) are acceptable for typing query results, but prefer inline type definitions to avoid coupling:

```typescript
// GOOD: inline type
type WorkflowRow = { id: string; nodes: string };

// ACCEPTABLE: type-only import
import type { WorkflowEntity } from '../../entities';

// BAD: value import for ORM operations
import { ApiKey } from '../../entities';
await queryRunner.manager.update(ApiKey, { id }, { scopes });
```

### 3.3 Hardcoded Identifiers Without `escape.*`

Several migrations, particularly in `sqlite/` and `postgresdb/` directories, hardcode table or column names:

| File | Issue |
|---|---|
| `1745322634000-CleanEvaluations.ts` | Uses `${tablePrefix}test_definition` instead of `escape.tableName()` |
| `1768402473068-ExpandModelColumnLength.ts` | Uses `"model_tmp"` as a hardcoded column name |

**Rule:** Always use `escape.tableName()`, `escape.columnName()`, `escape.indexName()` for all identifiers.

### 3.4 Inconsistent `transaction = false` Placement

SQLite-specific migrations that do DDL consistently set `transaction = false as const` in the `sqlite/` directory. However, some `common/` migrations that do DDL (like table recreation for column type changes) **don't** set this flag — they rely on being wrapped by SQLite-specific counterparts or the framework's internal handling.

**Rule for common/ migrations:** If a common migration does DDL that could be affected by SQLite's transaction limitations, and it has no corresponding SQLite-specific wrapper, it must set `transaction = false as const`.

### 3.5 Inconsistent Error Class Usage

| File | Issue |
|---|---|
| `1675940580449-PurgeInvalidWorkflowConnections.ts` | Uses `UserError` from `n8n-workflow` — migration errors are not user errors |
| `1700571993961-AddGlobalAdminRole.ts` | Uses `UnexpectedError` from `n8n-workflow` — OK but prefer inlining |
| `1740445074052-UpdateParentFolderIdColumn.ts` | Uses `UnexpectedError` from `n8n-workflow` |

**Rule:** Don't import error classes from `n8n-workflow` for migration failures. Throw plain `Error` or use `logger.error()` and skip. If a migration genuinely can't proceed, a plain `throw new Error('reason')` is fine.

### 3.6 Imports from `n8n-workflow` and `@n8n/utils`

**Found in 10+ migrations:**

| Package | Files using it |
|---|---|
| `n8n-workflow` | `MoveSshKeysToDatabase`, `UpdateWorkflowCredentials`, `AddNodeIds`, `PurgeInvalidWorkflowConnections`, `AddJsonKeyPinData`, `ActivateExecuteWorkflowTriggerWorkflows`, `CreateProject`, `AddGlobalAdminRole`, `MigrateExternalSecretsToEntityStorage`, `ExpandProviderIdColumnLength` |
| `@n8n/utils` | `CreateProject`, `AddApiKeysTable` (sqlite) |

While `n8n-workflow` is an existing dependency of `@n8n/db`, heavy use creates coupling risk. Constants like `ERROR_TRIGGER_NODE_TYPE` or utilities like `jsonParse` pulled from external packages lock migrations to those packages' APIs.

**Rule:** Prefer inlining small constants and type definitions. Use `parseJson()` from `MigrationContext` instead of importing `jsonParse` from `n8n-workflow`. Only import from external packages when inlining would be impractical (e.g., `generateNanoId`).

### 3.7 Missing `autoGenerate2` — Using Deprecated `autoGenerate`

The DSL provides both `autoGenerate` (deprecated, uses `INCREMENT` strategy) and `autoGenerate2` (preferred, uses `IDENTITY` strategy). Some newer migrations still use the deprecated version.

**Rule:** Always use `autoGenerate2` for new primary key columns.

### 3.8 Summary of Anti-Pattern Severity

| Anti-Pattern | Severity | Count | Risk |
|---|---|---|---|
| Direct `queryRunner` usage | **High** | ~15 files | Bypasses escaping, prefix handling |
| Entity value imports | **High** | 2 files | Couples to mutable entity definitions |
| Missing `escape.*` | **Medium** | ~5 files | Breaks with table prefixes |
| `n8n-workflow` imports | **Low** | ~10 files | Coupling, but currently stable |
| Entity type-only imports | **Low** | ~8 files | Acceptable, prefer inline types |
| Hardcoded column sizes | **Low** (fixed) | 4+ files | Already fixed via follow-up migrations |

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
- [ ] Tested with dirty data (NULLs, missing fields, malformed JSON)?
- [ ] Tested with realistic data volumes?
- [ ] Tested on both SQLite and PostgreSQL?

### Template: Schema Migration (Reversible)

```typescript
import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class MyMigrationName1234567890000 implements ReversibleMigration {
  async up({ schemaBuilder: { createTable, column, addColumns, createIndex } }: MigrationContext) {
    // Schema changes here
  }

  async down({ schemaBuilder: { dropTable, dropColumns, dropIndex } }: MigrationContext) {
    // Reverse of up() — must actually work
  }
}
```

### Template: Data Migration (Irreversible)

```typescript
import type { MigrationContext, IrreversibleMigration } from '../migration-types';

type MyRow = { id: string; data: string };

export class MyDataMigration1234567890000 implements IrreversibleMigration {
  async up({ escape, runQuery, runInBatches, parseJson, logger, migrationName }: MigrationContext) {
    const table = escape.tableName('my_table');
    const dataCol = escape.columnName('data');
    const idCol = escape.columnName('id');

    await runInBatches<MyRow>(
      `SELECT ${idCol} AS id, ${dataCol} AS data FROM ${table}`,
      async (rows) => {
        for (const row of rows) {
          try {
            const parsed = parseJson(row.data);
            // ... transform parsed data ...
            await runQuery(`UPDATE ${table} SET ${dataCol} = :data WHERE ${idCol} = :id`, {
              data: JSON.stringify(parsed),
              id: row.id,
            });
          } catch (error) {
            logger.warn(
              `[${migrationName}] Failed to process row ${row.id}: ${(error as Error).message}. Skipping.`,
            );
          }
        }
      },
      100,
    );
  }
}
```

### Template: SQLite-Specific Wrapper (for DDL in common/ that needs transaction=false)

```typescript
// sqlite/1234567890000-MyMigration.ts
import { MyMigrationCommon1234567890000 } from '../common/1234567890000-MyMigration';

export class MyMigration1234567890000 extends MyMigrationCommon1234567890000 {
  transaction = false as const;
}
```
