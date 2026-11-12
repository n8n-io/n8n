---
title: Write a database migration
last_reviewed: 2026-11-06
contact: ivov
---

# Write a database migration

A migration is a class that changes the database schema or its data. [Persistence](../persistence.md) explains the data layer around migrations.

After a release, you cannot edit a migration, i.e. only a new migration can fix a buggy one.

> [!NOTE]
> If you use a coding agent, point it to the `n8n:db-migrations` skill.

## How n8n runs migrations

- **Every process migrates at startup.** Mains, workers, and webhook processes run pending migrations when they start. A process is not ready until its migrations finish.
- **PostgreSQL migrates one instance at a time.** Each instance waits for a lock before it runs the migrations.
- **On PostgreSQL, all pending migrations share one transaction.** If one migration fails, n8n undoes all of them, and the schema stays as it was before the upgrade.
- **On SQLite, each migration has its own transaction.** If one migration fails, the migrations before it stay applied.
- **Old code ignores new migrations.** After a downgrade, n8n does not undo migrations that it does not know. To undo a migration, run `db:revert` before the downgrade.
- **Engine v2 has its own migrations.** They live in `packages/@n8n/engine/src/database/migrations/` and target a separate database. This page does not cover them.

## Create a migration

n8n supports SQLite and PostgreSQL. Migrations live in three folders under `packages/@n8n/db/src/migrations/`: `common/` for both databases, `postgresdb/`, and `sqlite/`. Pick the folder by how much your change differs between the two databases:

- **Same on both:** `common/`
- **Small difference** (e.g. one statement or slightly different syntax): `common/`, with a branch on `isPostgres` or `isSqlite`
- **Large difference** (e.g. different steps to rebuild a table): two migrations, one in `postgresdb/` and one in `sqlite/`
- **PostgreSQL only** (e.g. a column type change): one migration in `postgresdb/`, and none for SQLite

From repository root, generate the migration:

```bash
pnpm --filter=@n8n/db migration:new AddTracingToExecution
```

The generator writes `<timestamp>-AddTracingToExecution.ts` to `common/`. For `postgresdb/` or `sqlite/`, add `--folder=postgresdb` or `--folder=sqlite`.

## Write `up` and `down`

Each method receives a `MigrationContext`, which holds the schema builder, `runQuery` for raw SQL, and helpers for escaping and batching.

Example from the agents feature, with the schema builder and raw SQL:

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
				column('event')
					.varchar(16)
					.notNull.withEnumCheck(['activated', 'deactivated'])
					.comment('Publication or explicit unpublication'),
				// ...
			)
			.withCreatedAt.withIndexOn(['agentId', 'id'])
			.withForeignKey('agentId', { tableName: 'agents', columnName: 'id', onDelete: 'CASCADE' });
		// ...
	}

	async down({ schemaBuilder: { dropTable }, escape, runQuery }: MigrationContext) {
		await dropTable('agent_publish_history');

		await runQuery(
			`ALTER TABLE ${escape.tableName('agents')} DROP COLUMN ${escape.columnName('publicationRevision')}`,
		);
	}
}
```

Use `IrreversibleMigration` only when `up()` deletes the data that `down()` needs.

Do not write transaction code in a migration. n8n already runs each migration in a transaction.

In a migration, import application code only as types, and copy any helper you need into the file. Imported code can change later, and the migration must keep working.

> [!CAUTION]
> **SQLite table rebuilds can be slow and can delete data.** Calls that add or drop columns, `NOT NULL` constraints, or enum checks copy the table and drop the original. The drop cascades to any table that points at it with `ON DELETE CASCADE`.
>
> - To add a nullable column or a column with a default, use a raw `ALTER TABLE ... ADD COLUMN`, as the agents migration above does for `publicationRevision`.
> - For other changes, write a migration in `sqlite/` with `withFKsDisabled = true as const`. This setting turns off foreign key checks while the migration runs, so the drop deletes no other rows.

## Move data safely

- **Expect bad data.** Old rows can hold `null`, an old JSON shape, or JSON that does not parse. Check each value before you use it.
- **Work in SQL where you can.** One `INSERT ... SELECT` is faster than a loop in TypeScript.
- **Read in batches.** Never run `SELECT *` without a limit. Use `runInBatches` with 100 to 500 rows, or `copyTable`.
- **Fix the order.** Add an `ORDER BY` to each backfill, so that a second run gives the same result.
- **Count before you swap.** When you copy a table to replace the old one, compare the row counts first.

> [!WARNING]
> **Large tables make slow migrations.** `execution_entity` and `workflow_entity` can hold millions of rows, and a slow migration looks like a failed upgrade. Before you rewrite, retype, or index these tables, measure the migration on a large dataset.

## Drop columns in two releases

Do not drop a column in the same release that stops using it. During a rolling deploy, the previous release still runs while the new one starts. A rollback also starts the previous release again. Both run against the migrated schema, so the previous release fails if its column is gone.

Split the removal into two releases:

1. **First release:** Remove all code that reads or writes the column, and keep the column.
2. **Later release:** Drop the column in a migration. No running code uses it any more.

## Update the entity

Make the entity in `packages/@n8n/db/src/entities/`, or in the module that owns the table, match the migration. Give each index that the migration creates an `@Index` on the entity too.

Then update the schema docs from repository root. The command needs Docker and `tbls`:

```bash
pnpm db:schema:docs
```

## Test the migration

Write a test in `packages/cli/test/migration/` for each data migration, and for most schema migrations. Insert test data with raw SQL, because a repository uses the current entity, not the schema of the migration. `packages/@n8n/backend-test-utils/MIGRATION_TESTING.md` lists the helpers.

Example from the scheduler, where `down()` must keep the rows of a child table:

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

Run the test on both databases from `packages/cli/`. The PostgreSQL command needs Docker.

```bash
pnpm test:sqlite:migrations \
  test/migration/1793603668718-add-last-dispatched-at-to-scheduled-job.test.ts
pnpm test:postgres:migrations:tc \
  test/migration/1793603668718-add-last-dispatched-at-to-scheduled-job.test.ts
```

Then check it on a local instance: `pnpm start` applies the migration, and `pnpm start -- db:revert` reverts it.

## Get a review

A PR with a migration needs an approval from [`@n8n-io/migrations-review`](https://github.com/orgs/n8n-io/teams/migrations-review). Before you open the PR, go through the pre-flight checklist in `.agents/skills/db-migrations/SKILL.md`. Each item is a fix that reviewers often ask for.
