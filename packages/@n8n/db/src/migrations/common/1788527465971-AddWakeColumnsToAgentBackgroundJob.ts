import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWakeColumnsToAgentBackgroundJob1788527465971 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column }, escape, runQuery }: MigrationContext) {
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
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(
			'agent_background_job',
			['notifiedAt', 'parentResourceId', 'parentPrincipalHash'],
			{ recreatesOnSqlite: true },
		);
	}
}
