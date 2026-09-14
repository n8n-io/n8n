import type { MigrationContext, ReversibleMigration } from '../migration-types';

const executionTable = 'agent_execution';
const statusesBefore = ['running', 'success', 'error', 'cancelled', 'interrupted'];
const statusesAfter = ['queued', ...statusesBefore];

/** Add durable storage and ordering for turns that wait for a thread claim. */
export class AddAgentTurnQueue1789138249047 implements ReversibleMigration {
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
				`ALTER TABLE ${table} ADD COLUMN ${escape.columnName('resourceId')} varchar(255)`,
			);
			await runQuery(
				`ALTER TABLE ${table} ADD COLUMN ${escape.columnName('enqueueSequence')} integer`,
			);
		} else {
			await addColumns(
				executionTable,
				[
					column('resourceId')
						.varchar(255)
						.comment('Memory resource id of the sender, so a queued turn later runs as that user'),
					column('enqueueSequence').int.comment(
						'Per-thread order assigned when an agent turn enters the durable queue',
					),
				],
				{ recreatesOnSqlite: true },
			);
		}

		await createIndex(executionTable, ['threadId', 'enqueueSequence'], true);
	}

	async down({
		isSqlite,
		escape,
		runQuery,
		schemaBuilder: { dropColumns, dropIndex, addEnumCheck, dropEnumCheck },
	}: MigrationContext) {
		await dropIndex(executionTable, ['threadId', 'enqueueSequence']);

		// A queued row never ran. End it before the status is removed.
		await runQuery(
			`UPDATE ${escape.tableName(executionTable)} ` +
				`SET ${escape.columnName('status')} = 'cancelled' ` +
				`WHERE ${escape.columnName('status')} = 'queued'`,
		);
		await dropEnumCheck(executionTable, 'status', { recreatesOnSqlite: true });
		await addEnumCheck(executionTable, 'status', statusesBefore, { recreatesOnSqlite: true });

		// Drop the columns last. SQLite can otherwise restore them during the check rebuild.
		const columns = ['resourceId', 'enqueueSequence'];
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
