import type { MigrationContext, ReversibleMigration } from '../migration-types';

const executionTable = 'agent_execution';
const resourceIdColumn = 'resourceId';
const statusesBefore = ['running', 'success', 'error', 'cancelled', 'interrupted'];
const statusesAfter = ['queued', ...statusesBefore];

/**
 * A preview-chat message sent while a turn runs is stored as a `queued`
 * execution row and runs once the thread is idle. `resourceId` names the
 * sender's memory resource, so the drain can run the turn as that user.
 */
export class AddQueuedStatusToAgentExecution1789375477575 implements ReversibleMigration {
	async up({
		isSqlite,
		escape,
		runQuery,
		schemaBuilder: { addColumns, column, addEnumCheck, dropEnumCheck },
	}: MigrationContext) {
		await dropEnumCheck(executionTable, 'status', { recreatesOnSqlite: true });
		await addEnumCheck(executionTable, 'status', statusesAfter, { recreatesOnSqlite: true });

		// The schema builder rebuilds the table on SQLite.
		// Add this nullable column in place.
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(executionTable)} ADD COLUMN ${escape.columnName(resourceIdColumn)} varchar(255)`,
			);
		} else {
			await addColumns(
				executionTable,
				[
					column(resourceIdColumn)
						.varchar(255)
						.comment(
							'Memory resource id of the sender; set on queued preview turns so the drain resolves the user',
						),
				],
				{ recreatesOnSqlite: true },
			);
		}
	}

	async down({
		isSqlite,
		escape,
		runQuery,
		schemaBuilder: { dropColumns, addEnumCheck, dropEnumCheck },
	}: MigrationContext) {
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(executionTable)} DROP COLUMN ${escape.columnName(resourceIdColumn)}`,
			);
		} else {
			await dropColumns(executionTable, [resourceIdColumn], { recreatesOnSqlite: true });
		}

		// A queued row never ran, so it ends as cancelled once the status is gone.
		await runQuery(
			`UPDATE ${escape.tableName(executionTable)} ` +
				`SET ${escape.columnName('status')} = 'cancelled' ` +
				`WHERE ${escape.columnName('status')} = 'queued'`,
		);
		await dropEnumCheck(executionTable, 'status', { recreatesOnSqlite: true });
		await addEnumCheck(executionTable, 'status', statusesBefore, { recreatesOnSqlite: true });
	}
}
