import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWakeColumnsToAgentBackgroundJob1788332569510 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'agent_background_job',
			[
				column('notifiedAt')
					.timestampTimezone(3)
					.comment('Time when the parent agent consumed this settled job'),
				column('parentResourceId').varchar(255).comment('Memory resource of the parent agent run'),
				column('parentPrincipalHash')
					.varchar(64)
					.comment('Sandbox principal hash of the parent agent run'),
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
