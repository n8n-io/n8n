import type { MigrationContext, ReversibleMigration } from '../migration-types';

const executionTable = 'agent_execution';
const claimColumn = 'activeThreadId';

/**
 * One agent turn per thread at a time. A top-level turn claims its thread by
 * writing `activeThreadId = threadId` on its running row. The partial unique
 * index rejects a second claimed running row for the same thread. Rows from
 * older mains and out-of-scope runs keep the claim null, so a rolling upgrade
 * never trips the index.
 */
export class AddActiveThreadClaimToAgentExecution1789138249046 implements ReversibleMigration {
	async up({
		isSqlite,
		escape,
		runQuery,
		schemaBuilder: { addColumns, column, createIndex },
	}: MigrationContext) {
		// The schema builder rebuilds the table on SQLite.
		// Add this nullable column in place.
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(executionTable)} ADD COLUMN ${escape.columnName(claimColumn)} varchar(128)`,
			);
		} else {
			await addColumns(
				executionTable,
				[
					column(claimColumn)
						.varchar(128)
						.comment(
							'Thread this running top-level turn holds; null once the run ends and for runs outside the turn queue',
						),
				],
				{ recreatesOnSqlite: true },
			);
		}
		await createIndex(
			executionTable,
			[claimColumn],
			true,
			undefined,
			`${escape.columnName(claimColumn)} IS NOT NULL AND ${escape.columnName('status')} = 'running'`,
		);
	}

	async down({
		isSqlite,
		escape,
		runQuery,
		schemaBuilder: { dropColumns, dropIndex },
	}: MigrationContext) {
		await dropIndex(executionTable, [claimColumn]);
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(executionTable)} DROP COLUMN ${escape.columnName(claimColumn)}`,
			);
		} else {
			await dropColumns(executionTable, [claimColumn], { recreatesOnSqlite: true });
		}
	}
}
