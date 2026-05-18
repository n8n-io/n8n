# Migration rule catalogue

Detailed rules for n8n migrations, organized by area. Each rule reflects
guidance the migrations-review team enforces on PRs.

---

## A. Schema design — types, sizes, defaults

**A1. Pick the narrowest sane type.**
- `DATE` not `timestamp` when only the date matters.
- `smallint` for small bounded counters/enums; `int` over `bigint` unless overflow is plausible.
- `numeric`/`bigint` for byte counts; never `varchar`.
- Native `uuid` over `varchar(36)` — half the storage on Postgres.
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
- Use `.timestampTimezone()` (default 3-ms precision) or `.timestampNoTimezone()` deliberately. See `packages/@n8n/db/src/migrations/dsl/column.ts`.

---

## B. Indexes — the most-flagged area

**B1. Don't add an index without a query for it.**
- Reviewer gold standard: "Way too many indexes. Think about the query patterns and only add indexes to support those."
- Justify each index in the PR description with the target query.

**B2. A unique constraint already creates an index — don't double up.**
- Composite primary key indexes its prefix columns. A separate index on the prefix is redundant.

**B3. Composite index column order matches query predicates.**
- An index on `(A, B)` serves `WHERE A = ?` and `WHERE A = ? AND B = ?`, **not** `WHERE B = ?`.
- ORDER BY direction in the index must match the query's `ORDER BY` (e.g. `(sessionId, createdAt ASC, id DESC)`).

**B4. Partial unique indexes for sparse-unique columns.**
- Add `WHERE col IS NOT NULL` to exclude NULL rows. On a deduplication-key column this can roughly halve index size and avoid uniqueness checks against the NULL bucket. Use the `whereClause` parameter on `createIndex(table, cols, isUnique, customName, whereClause)`.

**B5. Composite PKs can replace dedicated indexes.**
- Consider whether a surrogate `id` column is needed at all when `(slugA, slugB)` would be a perfectly good PK.

**B6. Mirror DSL indexes onto the entity with `@Index`.**
- The migration creates the runtime index; the entity decorator keeps fresh-DB setups in sync.

**B7. Use `withIndexOn(...)` over separate `createIndex(...)` calls when defining a new table.**

---

## C. Foreign keys, ON DELETE, polymorphic refs

**C1. FKs are the default; opting out needs justification.**
- Reviewers will ask "why no foreign key constraint on X?". Polymorphic columns `(typeCol, idCol)` cannot have FKs and lose cascade-delete safety — push back on the design.

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
- `pnpm --filter=@n8n/db migration:new <PascalCaseName> [--folder=…]` picks the timestamp and registers the migration. After rebase, re-run or bump the timestamp so it's strictly greater than every existing migration; the `migration-timestamp` lint rule in `@n8n/code-health` catches drift. Full rationale: `packages/@n8n/db/AGENTS.md`.

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

**F2. `IrreversibleMigration` only when reversal would lose data unrecoverably.**
- E.g. a backfill that erases information about which workflows were active.

**F3. `down()` must restore the previous schema, not just drop new objects.**
- The down's effect should let `up()` be re-run cleanly afterwards.

**F4. SQLite duplicate-FK accumulation.**
- `pnpm start → db:revert → pnpm start` on SQLite duplicates FKs unless you name them explicitly.

---

## G. Performance / large-instance safety

**G1. Push work into SQL.**
- "This can all be done in a single insert statement without loading everything into memory first." Same lesson applies to UPDATEs, DELETEs.

**G2. Filter early with `LIKE`/`WHERE`.**
- Reduce the row count before parsing on the Node side: `AND (nodes LIKE '%n8n-nodes-base.executeWorkflowTrigger%' OR nodes LIKE '%n8n-nodes-base.errorTrigger%')`.

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

**H1. Always handle `NULL` in source columns.**
- A backfill that reads a nullable column must specify the policy for NULL rows, and ideally for empty strings too.

**H2. Don't import live application code; duplicate (snapshot) helpers.**
- "It's good that migrations don't import code but rather duplicate it. I wouldn't want the behaviour of the migration to change if we change the util implementation in the future." A migration ships frozen — the code in app/ evolves.

**H3. For deletions, prefer keeping old rows as a fallback.**
- Self-hosted instances may have unexpected data shapes. If the migration results in missing or inconsistent data, the old row provides recoverability.

**H4. Don't unilaterally deactivate previously active rows.**
- If you must, log loudly per row and mark the migration `IrreversibleMigration`.

**H5. Keep denormalized columns in sync.**
- Where data is duplicated across two tables (e.g. `workflow_entity.nodes` vs `workflow_history.nodes`), the backfill must update both copies.

---

## I. Naming, conventions, code style

**I1. Constants are camelCase, not SCREAMING_CASE.**

**I2. No `_entity` suffix on new tables.** Old convention only.

**I3. Column names are camelCase in code.** Even when reviewers wish otherwise; this is the established convention.

**I4. Don't repeat the table name in column names.**

**I5. Always use `escape.tableName(...)` / `escape.columnName(...)`.**
- Handles the configurable `tablePrefix` and quoting consistently.

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

---

## J. ID strategy

**J1. UUID/nanoId only for entities whose ID appears in URL/UI.**
- Otherwise `int.autoGenerate2`. 32 bits beats 128 bits, and SQLite stores UUIDs as varchar (~36 bytes).

**J2. Keep ID-column types consistent across related tables.**
- Mixing `uuid` and `varchar(36)` for what is "the same kind of ID" creates JOIN footguns and ugly migrations later.

**J3. nanoid length 16 for entity IDs.**
- Established convention; longer offers no real collision benefit at our scale.

---

## K. Tests

**K1. Every new migration ships with an integration test.**
- Reference: `packages/cli/test/migration/1766064542000-add-workflow-publish-scope-to-project-roles.test.ts`.
- API: `initDbUpToMigration(name)` + `runSingleMigration(name)` from `@n8n/backend-test-utils`. Full docs: `packages/@n8n/backend-test-utils/MIGRATION_TESTING.md`.

**K2. Tests insert fixtures via raw SQL only.**
- Repositories evolve with the schema and break older tests over time. Use `context.escape.tableName(...)` and `context.runQuery(sql, params)` directly.

**K3. Test name describes behavior, not the SQL.**

---

## L. Schema/entity drift

**L1. Schema, entity, and OpenAPI types must agree.**
- Caught regularly: `notNull` lost on entity, entity says `string` but column is something else, `@Index` mirrors don't exist.

**L2. PR description must match the code.**
- A reviewer will catch "Description says 'Changed ON DELETE CASCADE → SET NULL' but we're actually dropping the FK."

**L3. `up` and entity must agree on defaults / constraints.**
- If a new column is required for data integrity (e.g. `activeVersionId` should be set whenever `active` is TRUE), enforce it via a CHECK constraint in the migration AND a runtime invariant in app code.

**L4. Deprecate columns, then drop in a follow-up.**
- Don't drop a column the same release you stop writing to it. Wait one release, then drop.

---

## M. PR hygiene

**M1. `@n8n-io/migrations-review` team must approve.**
- Migration PRs explicitly halt for migrations-review even after non-migration approval.

**M2. PR description describes the schema/behavior change accurately.**

**M3. Test the migration manually on every supported DB before review.**
- Spin up Postgres + SQLite locally, run the migration, then `db:revert`, then re-run.

**M4. For features only meant for new versions, skip the backfill.**
- "I don't think we need this if the marker hasn't been released to anyone yet." Ask whether existing rows actually need the new state.

---

## N. Cross-row data integrity

**N1. Don't break denormalized data.**
- If `workflow_entity.nodes` and `workflow_history.nodes` are both maintained, the migration must update both.

**N2. Backfills respect ordering when ordering is meaningful.**
- "Sort workflows by `updatedAt` to try to restore the order" — when the new schema implies chronology, preserve it.

**N3. Atomic SQL within the migration's transaction.**
- Some migrations override with `transaction = false as const` for big DDL on engines that disallow it inside a transaction. The DSL/wrapper sets `transaction = false` automatically when `withFKsDisabled = true`.
