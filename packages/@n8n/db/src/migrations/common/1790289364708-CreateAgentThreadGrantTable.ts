import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentThreadGrantTable1790289364708 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_thread_grants')
			.withColumns(
				column('threadId').varchar(128).primary,
				column('grantKey')
					.varchar(512)
					.primary.comment(
						'JSON tuple: [tool, toolName] or [integration_action, connectionId, action]',
					),
			)
			.withForeignKey('threadId', {
				tableName: 'agent_execution_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_thread_grants');
	}
}
