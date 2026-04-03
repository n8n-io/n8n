import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentTables1776000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agents')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(255).notNull,
				column('code').text.notNull,
				column('description').varchar(255),
				column('projectId').varchar(255).notNull,
				column('credentialId').varchar(255),
				column('provider').varchar(128),
				column('model').varchar(128),
				column('integrations').text.notNull.default("'[]'"),
				column('schema').text,
			)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable('agent_checkpoints')
			.withColumns(
				column('runId').varchar(255).primary.notNull,
				column('agentId').varchar(255),
				column('state').text,
				column('expired').bool.default(false).notNull,
			)
			.withIndexOn('agentId')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_checkpoints');
		await dropTable('agents');
	}
}
