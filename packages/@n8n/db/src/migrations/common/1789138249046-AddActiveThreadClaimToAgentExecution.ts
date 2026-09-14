import type { MigrationContext, ReversibleMigration } from '../migration-types';

const executionTable = 'agent_execution';
const claimColumn = 'activeThreadId';
const statusesBefore = ['running', 'success', 'error', 'cancelled', 'interrupted'];
const statusesAfter = ['queued', ...statusesBefore];

/**
 * One agent turn per thread at a time. A turn that arrives while the thread
 * runs is stored as a `queued` row; `resourceId` names the sender's memory
 * resource and `runContext` holds what the row needs to run later without its
 * request. A top-level turn claims its thread by writing
 * `activeThreadId = threadId` on its running row. The partial unique index
 * rejects a second claimed running row for the same thread. Rows from older
 * mains and out-of-scope runs keep the claim null, so a rolling upgrade never
 * trips the index.
 */
export class AddActiveThreadClaimToAgentExecution1789138249046 implements ReversibleMigration {
	async up({
		isSqlite,
		escape,
		runQuery,
		schemaBuilder: { addColumns, column, createIndex, addEnumCheck, dropEnumCheck },
	}: MigrationContext) {
		await dropEnumCheck(executionTable, 'status', { recreatesOnSqlite: true });
		await addEnumCheck(executionTable, 'status', statusesAfter, { recreatesOnSqlite: true });

		// The schema builder rebuilds the table on SQLite.
		// Add these nullable columns in place.
		if (isSqlite) {
			const table = escape.tableName(executionTable);
			await runQuery(
				`ALTER TABLE ${table} ADD COLUMN ${escape.columnName(claimColumn)} varchar(128)`,
			);
			await runQuery(
				`ALTER TABLE ${table} ADD COLUMN ${escape.columnName('resourceId')} varchar(255)`,
			);
			await runQuery(`ALTER TABLE ${table} ADD COLUMN ${escape.columnName('runContext')} text`);
		} else {
			await addColumns(
				executionTable,
				[
					column(claimColumn)
						.varchar(128)
						.comment(
							'Thread this running top-level turn holds; null once the run ends and for runs outside the turn queue',
						),
					column('resourceId')
						.varchar(255)
						.comment('Memory resource id of the sender, so a queued turn later runs as that user'),
					column('runContext').json.comment(
						'Turn kind and inbound context a queued turn needs to run without its request; null once the run ends',
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
		schemaBuilder: { dropColumns, dropIndex, addEnumCheck, dropEnumCheck },
	}: MigrationContext) {
		await dropIndex(executionTable, [claimColumn]);

		// A queued row never ran, so it ends as cancelled once the status is gone.
		await runQuery(
			`UPDATE ${escape.tableName(executionTable)} ` +
				`SET ${escape.columnName('status')} = 'cancelled' ` +
				`WHERE ${escape.columnName('status')} = 'queued'`,
		);
		await dropEnumCheck(executionTable, 'status', { recreatesOnSqlite: true });
		await addEnumCheck(executionTable, 'status', statusesBefore, { recreatesOnSqlite: true });

		// Drop the columns last. On SQLite the check rebuild above copies the table
		// from the definition it loaded first, which brings dropped columns back.
		const columns = [claimColumn, 'resourceId', 'runContext'];
		if (isSqlite) {
			for (const name of columns) {
				await runQuery(
					`ALTER TABLE ${escape.tableName(executionTable)} DROP COLUMN ${escape.columnName(name)}`,
				);
			}
		} else {
			await dropColumns(executionTable, columns, { recreatesOnSqlite: true });
		}
	}
}
