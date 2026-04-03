import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentCheckpointTable1775000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_checkpoint')
			.withColumns(
				column('runId').varchar(255).primary.notNull,
				column('agentId').varchar(255),
				column('state').text,
				column('expired').bool.default(false).notNull,
			)
			.withIndexOn('agentId')
			.withForeignKey('agentId', {
				tableName: 'sdk_agent',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_checkpoint');
	}
}
