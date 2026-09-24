import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSuspendedAgentBackgroundJobStatus1790277419519 implements ReversibleMigration {
	async up({
		schemaBuilder: { dropEnumCheck, addEnumCheck, dropIndex, createIndex },
	}: MigrationContext) {
		await dropEnumCheck('agent_background_job', 'status', { recreatesOnSqlite: true });
		await addEnumCheck(
			'agent_background_job',
			'status',
			['running', 'suspended', 'completed', 'failed', 'cancelled'],
			{ recreatesOnSqlite: true },
		);
		await dropIndex('agent_background_job', ['timeoutAt']);
		await createIndex(
			'agent_background_job',
			['timeoutAt'],
			false,
			undefined,
			"\"status\" IN ('running', 'suspended')",
		);
		await dropIndex('agent_background_job', ['parentThreadId']);
		await createIndex(
			'agent_background_job',
			['parentThreadId'],
			false,
			undefined,
			'"status" <> \'running\' AND "notifiedAt" IS NULL',
		);
	}

	async down({
		schemaBuilder: { dropEnumCheck, addEnumCheck, dropIndex, createIndex },
		escape,
		runQuery,
	}: MigrationContext) {
		const table = escape.tableName('agent_background_job');
		const status = escape.columnName('status');
		await runQuery(
			`UPDATE ${table} SET ${status} = 'failed', ${escape.columnName('error')} = :error,
			${escape.columnName('settledAt')} = CURRENT_TIMESTAMP, ${escape.columnName('notifiedAt')} = NULL
			WHERE ${status} = 'suspended'`,
			{ error: 'Background approval is unavailable after this downgrade' },
		);
		await dropEnumCheck('agent_background_job', 'status', { recreatesOnSqlite: true });
		await addEnumCheck(
			'agent_background_job',
			'status',
			['running', 'completed', 'failed', 'cancelled'],
			{ recreatesOnSqlite: true },
		);
		await dropIndex('agent_background_job', ['timeoutAt']);
		await createIndex(
			'agent_background_job',
			['timeoutAt'],
			false,
			undefined,
			'"status" = \'running\'',
		);
		await dropIndex('agent_background_job', ['parentThreadId']);
		await createIndex(
			'agent_background_job',
			['parentThreadId'],
			false,
			undefined,
			'"settledAt" IS NOT NULL AND "notifiedAt" IS NULL',
		);
	}
}
