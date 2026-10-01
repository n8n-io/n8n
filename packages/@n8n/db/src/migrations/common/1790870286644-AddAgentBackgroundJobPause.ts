import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentBackgroundJobPause1790870286644 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column, dropEnumCheck, addEnumCheck },
		escape,
		runQuery,
		isPostgres,
	}: MigrationContext) {
		await addColumns(
			'agent_background_job',
			[column('pauseRequestId').uuid.comment('Groups jobs stopped by one user request')],
			{ recreatesOnSqlite: true },
		);
		await dropEnumCheck('agent_background_job', 'status', { recreatesOnSqlite: true });
		await addEnumCheck(
			'agent_background_job',
			'status',
			['running', 'suspended', 'paused', 'completed', 'failed', 'cancelled'],
			{ recreatesOnSqlite: true },
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${escape.tableName('agent_background_job')}.${escape.columnName('status')} IS 'running: child works; suspended: child awaits approval; paused: user stopped the child; completed, failed, cancelled: terminal'`,
			);
		}
	}

	async down({
		schemaBuilder: { dropColumns, dropEnumCheck, addEnumCheck },
		escape,
		runQuery,
		isPostgres,
	}: MigrationContext) {
		const table = escape.tableName('agent_background_job');
		const status = escape.columnName('status');
		await runQuery(`UPDATE ${table} SET ${status} = 'failed',
			${escape.columnName('error')} = 'Background pause is unavailable after this downgrade',
			${escape.columnName('settledAt')} = CURRENT_TIMESTAMP, ${escape.columnName('notifiedAt')} = NULL
			WHERE ${status} = 'paused'`);
		await dropEnumCheck('agent_background_job', 'status', { recreatesOnSqlite: true });
		await addEnumCheck(
			'agent_background_job',
			'status',
			['running', 'suspended', 'completed', 'failed', 'cancelled'],
			{ recreatesOnSqlite: true },
		);
		await dropColumns('agent_background_job', ['pauseRequestId'], { recreatesOnSqlite: true });
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${status} IS 'running: child works; suspended: child waits for an approval; completed, failed, cancelled: terminal'`,
			);
		}
	}
}
