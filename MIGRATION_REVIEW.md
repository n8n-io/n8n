# Migration Review: Common Issues and Patterns

Analysis of the last ~100 commits touching migration files and their PR review comments.

## Executive Summary

Migration PRs consistently surface the same categories of issues during review. The most frequent problems are: SQLite-specific quirks causing data loss, incorrect or excessive indexing, missing column constraints, column type mismatches, and data migrations that don't handle edge cases. Below is a categorized breakdown.

---

## 1. SQLite Quirks and Data Loss Risk

**This is the single most dangerous and recurring issue.**

SQLite's `ALTER TABLE` implementation internally recreates the entire table. When TypeORM wraps this in a transaction, foreign key references from other tables can be lost, effectively causing **silent data loss** (e.g. `shared_workflow` entries disappearing).

### What goes wrong

- Using `addColumns` from TypeORM on SQLite can cause cascade deletion on related tables
- The workaround is `transaction = false` on SQLite migrations, but this is poorly understood — reviewers repeatedly ask "why is this needed?"
- Some developers copy the pattern without understanding it, others skip it and introduce bugs

### PR evidence

- **PR #15172** (AddWorkflowArchivedColumn): Extended discussion about SQLite `addColumns` causing `shared_workflows` to disappear. Required separate SQLite migration file.
- **PR #22712** (AddResolvableFieldsToCredentials): ivov flagged a known SQLite quirk that can result in data loss. Fix was adding `transaction = false` for SQLite.
- **PR #15611** (AddWorkflowStatisticsRootCount): despairblue asked why `transaction = false` is needed. netroy explained: "create a sqlite migration locally that adds or removes a column from the workflows table. After the migration runs, all your workflows will most likely disappear in the UI."

### Recommendation

- **Document the SQLite `ALTER TABLE` quirk prominently** — it's the #1 source of migration bugs
- When using raw SQL `ALTER TABLE ADD COLUMN`, `transaction = false` is NOT needed — only when using TypeORM's `addColumns` helper
- Prefer using the migration DSL (`createTable`, `addColumns` via raw SQL) which handles this correctly
- Always test migrations on SQLite with data in related tables

---

## 2. Indexing Issues

Reviewers frequently flag indexing problems: too many indexes, redundant indexes, missing indexes, or wrong column order.

### Common mistakes

| Issue | Example |
|-------|---------|
| **Redundant indexes** | Adding an index on a column that's already the leading column of a composite PK or unique constraint |
| **Too many indexes** | PR #22043 (WorkflowPublishHistory): tomi flagged "This is way too many indexes. Please think what the query patterns are and only add indexes to support those" |
| **Wrong column order** | PR #23397 (ChatMessageIndices): ivov questioned whether index column order matched the actual query patterns |
| **Missing indexes** | PR #24877: geemanjs suggested adding indexes on `providerKey` and `projectId` |
| **Redundant PK index** | PR #24877: tomi noted "We don't need this index. PK already creates a unique index (providerKey, projectId)" |
| **Composite PK misunderstanding** | PR #22609: developers assumed composite PK index could serve queries on non-leading columns (it can't for non-leading columns) |

### Recommendation

- Before adding indexes, document the expected query patterns
- Understand that a composite index `(A, B)` can serve queries on `A` but NOT on `B` alone
- Don't duplicate indexes that PKs or unique constraints already provide
- Review query patterns before adding indexes — fewer, well-chosen indexes are better

---

## 3. Column Type and Size Issues

A recurring pattern: columns are created with insufficient size, then a follow-up migration is needed to expand them.

### Examples

| PR | Issue |
|----|-------|
| **#24332** | `model` column too short (64→256) for AI model names |
| **#21609** | Token column size too small |
| **#25748** | `providerId` character limit too small |
| **#11357** | Dedupe value column changed from `varchar(255)` to `text` |
| **#23694** | Insights `workflowId` column length too short for Postgres |
| **#22053** | OAuth state column type needed to change to unbounded varchar |

### Recommendation

- Use `text` instead of `varchar(N)` for columns that store user-provided or external data of unpredictable length
- When using `varchar`, choose generous limits and document why that limit was chosen
- Remember that SQLite doesn't enforce `varchar` length constraints — bugs may only surface on Postgres
- Add `.comment()` to columns to clarify what data they hold and expected sizes

---

## 4. Foreign Key and Cascade Behavior

Reviewers frequently debate FK cascade behavior, and getting it wrong leads to data loss or orphaned records.

### Key discussions

- **PR #23275** (AddAgentIdForeignKeys): Debate about CASCADE vs SET NULL for agent deletion — settled on keeping historical messages even after agent deletion
- **PR #22620** (WorkflowStatistics): Extended discussion about dropping FK entirely vs CASCADE vs SET NULL. Initially described as "SET NULL" but actually dropped the FK. Orphaned records with invalid workflow IDs were intentionally kept for license metrics.
- **PR #24877** (SecretsProviders): Discussion about whether PK should be user-provided or auto-generated surrogate key

### Recommendation

- Always explicitly document the intended FK behavior (CASCADE, SET NULL, NO ACTION, or no FK)
- Consider whether historical/audit data should survive parent deletion
- PR description must accurately describe the FK changes being made
- When dropping FKs, document why and what happens to orphaned records

---

## 5. Data Migrations: Edge Cases and Performance

Migrations that transform existing data (not just schema changes) are the most error-prone.

### Common problems

| Issue | Example |
|-------|---------|
| **JSON parsing errors** | PR #24410, #23392: `ActivateExecuteWorkflowTriggerWorkflows` migration failed on malformed JSON in workflow nodes. Required multiple follow-up fixes. |
| **Missing/null data** | PR #24800: Migration failed on null `workflowId` values in `workflow_statistics` |
| **Large table performance** | PR #23901: `AddWorkflowVersionIdToExecutionData` was copying the entire `execution_data` table — fixed to avoid the copy |
| **Loading all data into memory** | PR #22043: tomi suggested using `INSERT INTO ... SELECT` instead of loading everything into memory |
| **Irreversibility** | PR #22019: CharlieKolb noted the down migration would deactivate workflows that were already active, losing information. Should be marked `IrreversibleMigration`. |
| **Data out of sync** | PR #22019: tomi flagged that updating nodes in `workflow_entity` without updating `workflow_history` creates inconsistent data |

### Recommendation

- **Always handle null/missing data** — self-hosted instances have unpredictable state
- **Don't load large datasets into memory** — use SQL-level INSERT...SELECT when possible
- **Handle JSON parsing errors gracefully** — workflow node data can be malformed
- **Consider making data migrations irreversible** when the down migration would lose information
- **Keep duplicated data in sync** (e.g. `workflow_entity.nodes` and `workflow_history.nodes`)
- **Test with production-like data volumes** — migrations that work on empty DBs may timeout on real instances
- **Retain old data during migration** (don't delete the source) — gives a fallback path for self-hosted users (PR #26001)

---

## 6. DB-Specific Syntax Differences

Despite having a DSL, migrations still hit DB-specific issues.

### Examples

| Issue | Example |
|-------|---------|
| **SQLite vs Postgres LIMIT syntax** | PR #25301: `copyTables` helper used MySQL's `LIMIT offset, count` instead of `LIMIT count OFFSET offset` |
| **MySQL no longer supported** | Multiple PRs (#25051, #24877, #24908, #24332): Reviewers remind that MySQL support was dropped, no need for MySQL-specific migrations |
| **Table name escaping** | PR #14788: ID quoting issues in scopes migration. PR #20654: Using `escape.tableName` vs raw string concatenation |
| **Unique constraint on NULL** | PR #20058: Postgres and MySQL don't consider multiple NULLs as duplicates in unique constraints, but behavior varies |

### Recommendation

- Use the migration DSL (`createTable`, `column`, etc.) whenever possible — it handles DB differences
- When writing raw SQL, test on both SQLite and Postgres
- MySQL support has been dropped — don't add MySQL-specific migration files
- Always use `escape.tableName` and `escape.columnName` — never concatenate table prefix manually
- Use `escape.indexName` for index names (not `escape.tableName`)

---

## 7. Migration DSL and Conventions

### Common convention violations flagged in reviews

| Issue | Frequency |
|-------|-----------|
| Not using `escape.tableName` for table names | Frequent |
| Using `escape.tableName` for index names instead of `escape.indexName` | PR #23397 |
| Marking column as both `primary` and `notNull` (redundant) | PR #22609 |
| Missing `.comment()` on columns with enum-like values | PR #20654, #13336 |
| Missing `.withEnumCheck()` for enum columns | PR #22043 |
| Using deprecated `autoGenerate` instead of `autoGenerate2` (which uses IDENTITY instead of SERIAL on Postgres) | PR #13336 |
| Defining types from entity files instead of inline in migration (entity types can change later, breaking old migrations) | PR #22019 |
| Not using the DSL when it supports the operation | PR #23397 |

### Recommendation

- **Never import types from entities in migrations** — define types inline in the migration file, because entity types change over time
- Use `autoGenerate2` for auto-incrementing PKs (uses IDENTITY on Postgres, not deprecated SERIAL)
- Add `.comment()` to columns that hold enum-like values or have non-obvious semantics
- Use `.withEnumCheck()` for columns with a fixed set of values
- Primary keys are implicitly NOT NULL — don't mark them both

---

## 8. Migration Testing

### Current infrastructure

- Migration test helpers exist in `@n8n/backend-test-utils/src/migration-test-helpers.ts`
- Tests run migrations up and down, verifying data integrity
- Some tests flagged for depending on data from prior tests (not isolated)

### Common testing gaps

- Migrations not tested with data in related tables (misses SQLite cascade bugs)
- Down migrations not tested or known to be broken
- Data migrations not tested with edge cases (null values, malformed JSON, large datasets)
- Tests using `console.log` for debugging that weren't cleaned up before merge

### Recommendation

- Test both `up` and `down` migrations
- Include data in related tables when testing schema changes (especially on SQLite)
- Test data migrations with null/empty/malformed values
- Remove debugging output before merge

---

## 9. Migration Naming and Organization

### Patterns observed

- Timestamp-based naming: `{timestamp}-{PascalCaseDescription}.ts`
- Migrations previously split per-DB (`sqlite/`, `postgresdb/`, `mysqldb/`) but now consolidated under `common/`
- MySQL migrations no longer needed (MySQL support dropped)
- Some migrations ended up spanning multiple PRs with follow-up fixes

### Recommendation

- Use `common/` directory for new migrations unless DB-specific SQL is required
- Don't add MySQL-specific migration files
- When a migration needs follow-up fixes, consider squashing or noting the dependency

---

## 10. UUID autoGenerate on Managed Postgres

Using `autoGenerate` or `autoGenerate2` on UUID columns causes TypeORM to emit `DEFAULT uuid_generate_v4()`, which requires the `uuid-ossp` extension in the `public` schema. This **fails on managed Postgres services** like Supabase where the extension lives in a different schema.

This was discovered via PR #26589 (backported to multiple release branches), and is now documented in `packages/@n8n/db/AGENTS.md`.

### Recommendation

- **Never** use `autoGenerate` / `autoGenerate2` on UUID columns
- Generate UUIDs at the application level using `randomUUID()` from `node:crypto`
- Use `column('id').uuid.primary.notNull` in migrations (no auto-generation)
- `autoGenerate2` is fine for **integer** columns (uses `GENERATED BY DEFAULT AS IDENTITY`)

---

## 11. Batch Processing for Large Tables

Migrations that process large tables (e.g. `execution_data`, `workflow_entity`) must use batching to avoid memory issues.

### Anti-pattern: Loading all rows into memory
```typescript
// BAD: Loads entire table into memory
const rows = await queryRunner.query('SELECT * FROM large_table');
for (const row of rows) { ... }
```

### Correct pattern: Use `runInBatches` or SQL-level operations
```typescript
// GOOD: Process in batches
await runInBatches<RowType>(selectQuery, async (rows) => {
  for (const row of rows) { ... }
});

// BETTER: Use INSERT...SELECT when possible (no memory load)
await queryRunner.query(`INSERT INTO new_table SELECT ... FROM old_table WHERE ...`);
```

### PR evidence

- **PR #23901**: Migration was copying entire `execution_data` table — fixed to avoid the copy
- **PR #22043**: tomi suggested INSERT...SELECT instead of loading into memory

---

## Summary: Top Reviewer Concerns by Frequency

```
1. SQLite ALTER TABLE / transaction quirks     ██████████████  (most critical)
2. Index design (too many / redundant / wrong) ████████████
3. Column type/size too restrictive            ██████████
4. Missing error handling in data migrations   █████████
5. FK cascade behavior unclear or wrong        ████████
6. Not using DSL / escape helpers              ███████
7. Missing column comments / constraints       ██████
8. Loading full tables into memory             █████
9. Importing entity types into migrations      ████
10. Down migration broken or loses data        ████
```

---

## Key Reviewers and Their Focus Areas

| Reviewer | Typical Focus |
|----------|---------------|
| **tomi** | Index design, column types, performance, DSL usage, autoGenerate patterns, migration architecture |
| **ivov** | SQLite quirks, data loss risks, column comments, code cleanliness, accurate PR descriptions |
| **CharlieKolb** | Data type safety (float precision), storage concerns, irreversibility of migrations, edge cases |
| **guillaumejacquart** | MySQL deprecation, redundant code, enum handling, unique constraints |
| **dariacodes** | Data migrations correctness, type definitions inline in migrations, nullable constraints |
| **netroy** | SQLite transaction behavior (deep expertise), TypeORM internals |
| **afitzek** | Composite index behavior, FK constraints, data type overflow (bigint vs number) |
