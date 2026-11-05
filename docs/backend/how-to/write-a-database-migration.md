---
title: Write a database migration
audience: Backend engineers who change the database schema
tier: 3
last_reviewed: 2026-11-05
contact: ivov
---

# Write a database migration

A migration is a class that changes the database schema or its data. n8n runs pending migrations at startup on every instance, with no person present. The instance does not start until the migrations finish. After a release, you cannot change a migration. A mistake in a migration therefore reaches every instance and stays there.

The schema is the migrations. TypeORM runs with `synchronize: false`, so an entity class alone creates no table. [Persistence](../subsystems/persistence.md) explains the data layer around the migrations.

> [!TIP]
> In Claude Code, the `n8n:db-migrations` skill loads the full rule set from `.agents/skills/db-migrations/SKILL.md`. Use it when you write a migration. This page covers the steps and the rules that cause the most incidents.

## Decide if you need a migration

Before you add a table or a column, look for one that already holds the data. A review rejects a migration that duplicates a column, adds a backfill that a default can replace, or mixes two changes in one file. Make one logical change in each migration.

## Create the file

<!-- steps -->

1. **Run the generator.**

   ```sh
   pnpm --filter=@n8n/db migration:new AddTracingToExecution
   ```

   The name is PascalCase and describes the change. The generator writes `<timestamp>-<Name>.ts` in `packages/@n8n/db/src/migrations/common/`. The class name is the name plus the timestamp.

2. **Choose the folder.**

   Keep the file in `common/` when the change works on SQLite and PostgreSQL. Small differences can branch on `isPostgres` or `isSqlite` in one file. Use `--folder=postgresdb` or `--folder=sqlite` only when the change applies to one database. A file in `sqlite/` or `postgresdb/` with the same name as a file in `common/` replaces it for that database.

3. **Keep the timestamp.**

   Do not type a timestamp by hand. The Code Health rule `migration-timestamp` fails CI for a timestamp that is not after the newest migration, or that is far in the future.

The generator also writes the two index files, `sqlite/index.ts` and `postgresdb/index.ts`. Git ignores them. The `build`, `typecheck`, `lint`, and `test` scripts of `@n8n/db` write them again. If an index is out of date, the import fails and names the command `pnpm --filter=@n8n/db gen:migration-index`.

## Write `up` and `down`

A migration implements `ReversibleMigration` or `IrreversibleMigration` from `packages/@n8n/db/src/migrations/migration-types.ts`. Each method receives a `MigrationContext`. These fields are the ones you use most:

| Field | Use |
|---|---|
| `schemaBuilder` | The DSL for tables, columns, indexes, and foreign keys |
| `runQuery(sql, params?)` | Runs SQL. Use it instead of `queryRunner.query` |
| `escape.tableName`, `escape.columnName`, `escape.indexName` | Add the table prefix and quote each identifier |
| `isSqlite`, `isPostgres` | Branch for one database |
| `runInBatches(query, operation, limit?)` | Reads a large table in pages |
| `copyTable` | Copies rows from one table to another in batches |
| `parseJson` | Parses a JSON column value |
| `logger` | Logs progress. Do not use `console.log` |

The DSL is in `packages/@n8n/db/src/migrations/dsl/`. `createTable` takes columns, indexes, checks, and foreign keys. Other functions add or drop columns, indexes, foreign keys, `NOT NULL`, and enum checks.

This migration uses both the DSL and raw SQL. From `packages/@n8n/db/src/migrations/common/1793035273653-CreateAgentPublishHistory.ts`:

```ts
import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentPublishHistory1793035273653 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { escape, runQuery } = ctx;
		// Raw ALTER preserves incoming SQLite foreign keys.

		await runQuery(
			`ALTER TABLE ${escape.tableName('agents')} ADD COLUMN ${escape.columnName('publicationRevision')} integer NOT NULL DEFAULT 0`,
		);

		const { createTable, column } = ctx.schemaBuilder;

		await createTable('agent_publish_history')
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('agentId').varchar(36).notNull,
				column('versionId').varchar(36),
				column('event')
					.varchar(16)
					.notNull.withEnumCheck(['activated', 'deactivated'])
					.comment('Publication or explicit unpublication'),
				column('userId').uuid,
				column('author').varchar(255).notNull,
				column('isLegacy')
					.bool.notNull.default(false)
					.comment('Legacy publication with an unknown end time'),
			)
			.withCreatedAt.withIndexOn(['agentId', 'id'])
			.withIndexOn('versionId')
			.withIndexOn('userId')
			.withForeignKey('agentId', { tableName: 'agents', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('versionId', {
				tableName: 'agent_history',
				columnName: 'versionId',
				onDelete: 'SET NULL',
			})
			.withForeignKey('userId', { tableName: 'user', columnName: 'id', onDelete: 'SET NULL' });

		await this.copyPublications(ctx);
	}

	private async copyPublications({ escape, runQuery }: MigrationContext) {
		const c = escape.columnName;
		const columns = ['agentId', 'versionId', 'event', 'userId', 'author', 'isLegacy', 'createdAt']
			.map(c)
			.join(', ');

		await runQuery(`INSERT INTO ${escape.tableName('agent_publish_history')} (${columns})
			SELECT ${c('agentId')}, ${c('versionId')}, 'activated', ${c('publishedById')}, ${c('author')}, true, ${c('createdAt')}
			FROM ${escape.tableName('agent_history')} ORDER BY ${c('createdAt')}, ${c('versionId')}`);
	}

	async down({ schemaBuilder: { dropTable }, escape, runQuery }: MigrationContext) {
		await dropTable('agent_publish_history');

		await runQuery(
			`ALTER TABLE ${escape.tableName('agents')} DROP COLUMN ${escape.columnName('publicationRevision')}`,
		);
	}
}
```

The example follows the rules that reviewers check first:

- Columns are `notNull` unless a missing value has a meaning.
- An enum-like column has `withEnumCheck` and a `comment`.
- Each foreign key has an `onDelete` that matches the relationship. `SET NULL` needs a nullable column.
- The data copy is in its own method, with an `ORDER BY`.
- `down()` undoes `up()` fully, so `up()` can run again after it.

Use `IrreversibleMigration` only when `up()` deletes the data that `down()` needs. Never write an empty `down()`.

> [!CAUTION]
> **SQLite rebuilds the table for some DSL calls.** SQLite cannot alter most column properties. For this reason, `addColumns`, `dropColumns`, `addNotNull`, `dropNotNull`, `addEnumCheck`, and `dropEnumCheck` copy the table to a new one. Each call needs the argument `{ recreatesOnSqlite: true }`. When another table points at the rebuilt table with `ON DELETE CASCADE`, the rebuild deletes the rows of that other table. To add a nullable column or a column with a default, use a raw `ALTER TABLE ... ADD COLUMN`, as the example does. For other changes, write a `sqlite/` migration with `withFKsDisabled = true as const`. `packages/@n8n/db/src/migrations/sqlite/1793612194540-RemovePublicAppVisibility.ts` is an example.

## Move data safely

A data migration reads and changes rows. The skill lists the rules in full. These rules prevent the most failures:

- **Expect bad data.** Old rows can hold `null`, an old JSON shape, or JSON that does not parse. Check each value before you use it.
- **Work in SQL where you can.** One `INSERT ... SELECT` is faster than a loop in TypeScript.
- **Read in batches.** Never run a `SELECT *` without a limit. Use `runInBatches` with 100 to 500 rows, or `copyTable`.
- **Fix the order.** Add an `ORDER BY` to each backfill, so that a second run gives the same result.
- **Count before you swap.** When you copy a table and then replace the old one, compare the row counts first.

> [!WARNING]
> **Large tables make slow migrations.** `execution_entity` and `workflow_entity` can hold millions of rows. On a large instance, a slow migration looks like a failed upgrade, because the instance does not start before the migration ends. Do not rewrite these tables, change a column type, or build an index on them without a measurement.

## Remove a column or a table in two releases

During a rolling deploy, old and new code run against the same schema. A rollback also starts the old code against the migrated schema. The old code must therefore still work after your migration.

<!-- steps -->

1. **Stop all writes in one release.** The code stops using the column, and the column stays.
2. **Drop the column in a later release.** No running code uses it now.

The same rule applies to a table. [Cloud coupling points](../cloud-coupling.md) explains the rollback in Cloud.

## Update the entity

The entity in `packages/@n8n/db/src/entities/`, or in the module that owns the table, must agree with the migration. Give each index that the DSL creates an `@Index` on the entity too. Do not import an entity, or other live code, as a value in a migration. A migration must give the same result in every future release.

After the migration and the entity agree, run `pnpm db:schema:docs` at the root. It writes the schema docs in `docs/generated/`. It needs Docker and `tbls`. CI runs `pnpm db:schema:check` and fails when the docs are out of date. Do not edit those files by hand.

## Test the migration

Each data migration needs a test in `packages/cli/test/migration/`. A schema-only migration also gets one in most PRs. The helpers are in `packages/@n8n/backend-test-utils/src/migration-test-helpers.ts`:

| Helper | What it does |
|---|---|
| `initDbUpToMigration(name)` | Runs every migration before the named one |
| `runSingleMigration(name)` | Runs the named migration |
| `undoLastSingleMigration()` | Runs `down()` of the last migration |
| `createTestMigrationContext(dataSource)` | Gives a context with `runQuery` and `escape` for fixtures |

Insert the fixtures with raw SQL, not with repositories. A repository uses the entity of today, not the schema at the time of the migration. `packages/@n8n/backend-test-utils/MIGRATION_TESTING.md` has the full guide.

This test checks that `down()` keeps the rows of a child table. From `packages/cli/test/migration/1793603668718-add-last-dispatched-at-to-scheduled-job.test.ts`:

```ts
	describe('down', () => {
		it('drops the column without deleting a job or a queued task', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const seeded = createTestMigrationContext(dataSource);
			await insertJob(seeded, 'job');
			await insertTaskFor(seeded, 'job');
			await seeded.queryRunner.release();

			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			expect(await columnNames(context, 'scheduled_job')).not.toContain('lastDispatchedAt');
			expect(await countRows(context, 'scheduled_job')).toBe(1);
			expect(await countRows(context, 'scheduled_task')).toBe(1);
			await context.queryRunner.release();
		});
	});
```

Run the test on both databases from `packages/cli`. The second command starts PostgreSQL in a container, so it needs Docker.

```sh
pnpm test:sqlite:migrations test/migration/1793603668718-add-last-dispatched-at-to-scheduled-job.test.ts
pnpm test:postgres:migrations:tc test/migration/1793603668718-add-last-dispatched-at-to-scheduled-job.test.ts
```

Also run the migration on a local instance. `pnpm start` at the root applies it. `pnpm start -- db:revert` runs `down()` of the last migration. Start n8n again to apply it a second time. Do not change the migrations table by hand.

## Get a review

`OWNERS` marks `packages/@n8n/db/src/migrations/` as `required` for `@n8n-io/migrations-review`. A PR with a migration cannot merge without an approval from that team. The tests in `packages/cli/test/migration/` do not need that approval.

The AI reviewer cubic also has a "DB migrations" agent in `cubic.yaml`. It checks the migration against the rules in `.agents/review-rules/db-migrations/`. Read those five files before you open the PR, because the human reviewers use the same rules.

CI runs the migration tests on SQLite and on the main PostgreSQL version for each PR. The merge queue runs them on each supported PostgreSQL version.

## Transactions

You do not write transaction code in a migration. n8n starts the transactions for you:

- **On PostgreSQL, all pending migrations share one transaction.** If one migration fails, n8n undoes all of them. The schema then stays as it was before the upgrade.
- **On SQLite, each migration has its own transaction.** If one migration fails, the migrations before it stay applied.

On PostgreSQL, a long migration keeps this transaction open until all pending migrations end. This is one more reason to keep each migration fast.

A SQLite migration can set `transaction = false as const` for a very large change. A SQLite migration with `withFKsDisabled = true as const` manages its own transaction. Both settings have no effect on PostgreSQL. `DbConnection.migrate` in `packages/@n8n/db/src/connection/db-connection.ts` has the code.

## Know how n8n runs migrations

- **Every process migrates.** Main, worker, and webhook processes run pending migrations at startup.
- **PostgreSQL migrates one instance at a time.** Each instance waits for an advisory lock before it runs the migrations.
- **Old code ignores new migrations.** After a downgrade, n8n does not undo migrations that it does not know. `n8n db:revert` also refuses to run without the code of the last migration. To undo a migration, run `db:revert` before the downgrade.
- **Cloud copies some SQLite tables by name.** A rename of such a table breaks the backups. [Cloud coupling points](../cloud-coupling.md) lists the tables.
- **Engine v2 has its own migrations.** They are in `packages/@n8n/engine/src/database/migrations/` and target a separate database. This page does not cover them.

## Self-check

1. You add a nullable column to a table. Another table points at it with `ON DELETE CASCADE`. Which method is safe on SQLite?
   - A. `addColumns` with `{ recreatesOnSqlite: true }`.
   - B. A raw `ALTER TABLE ... ADD COLUMN`.
   - C. `dropColumns`, then `addColumns`.
2. Your release stops all writes to a column. When can a migration drop the column?
   - A. In the same release.
   - B. In a later release.
   - C. Never.
3. Three migrations are pending on PostgreSQL, and the third one fails. What is the state of the schema?
   - A. The first two migrations are applied.
   - B. No migration is applied.
   - C. Only the third migration is rolled back, and n8n starts.

<details>
<summary>Answers</summary>

1. B. `addColumns` rebuilds the table on SQLite, and the rebuild deletes the rows of the child table through the cascade.
2. B. The old code must still run against the new schema during a rolling deploy or a rollback.
3. B. On PostgreSQL, all pending migrations run in one transaction, so a failure rolls back all of them.

</details>
