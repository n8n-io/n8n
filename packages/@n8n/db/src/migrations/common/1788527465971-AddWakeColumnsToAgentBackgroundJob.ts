import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWakeColumnsToAgentBackgroundJob1788527465971 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column, createIndex },
		escape,
		runQuery,
	}: MigrationContext) {
		// Background jobs are an opt-in feature that is off by default and has not
		// been enabled on any instance yet. Rows without a parent identity cannot
		// be delivered, so the table starts empty and the identity columns are
		// NOT NULL from the start.
		await runQuery(`DELETE FROM ${escape.tableName('agent_background_job')}`);

		await addColumns(
			'agent_background_job',
			[
				column('notifiedAt')
					.timestampTimezone(3)
					.comment('Time when the parent agent consumed this settled job'),
				column('parentResourceId')
					.varchar(255)
					.notNull.comment('Memory resource of the parent agent run'),
				column('parentPrincipalHash')
					.varchar(64)
					.notNull.comment('Sandbox principal hash of the parent agent run'),
			],
			{ recreatesOnSqlite: true },
		);

		// Pending mail: settled rows the parent has not consumed. Every main scans
		// for these on startup and on each sweep, and each wake reads one thread's
		// share. The partial index holds only pending rows, so it stays small.
		await createIndex(
			'agent_background_job',
			['parentThreadId'],
			false,
			undefined,
			'"settledAt" IS NOT NULL AND "notifiedAt" IS NULL',
		);
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		// The index predicate references notifiedAt, so it goes before the column.
		await dropIndex('agent_background_job', ['parentThreadId'], { skipIfMissing: true });
		await dropColumns(
			'agent_background_job',
			['notifiedAt', 'parentResourceId', 'parentPrincipalHash'],
			{ recreatesOnSqlite: true },
		);
	}
}
