import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentTaskTables1784000000003 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, createIndex, column } }: MigrationContext) {
		await createTable('agent_tasks')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('agentId').varchar(36).notNull,
				column('projectId').varchar(255).notNull,
				column('name').varchar(128).notNull,
				column('goal').text.notNull,
				column('cronExpression').varchar(255).notNull,
				column('active').bool.default(false).notNull,
				column('lastRunAt').timestampTimezone(3),
			)
			.withIndexOn('agentId')
			.withIndexOn('projectId')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createIndex('agent_tasks', ['agentId']);
		await createIndex('agent_tasks', ['projectId']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_tasks');
	}
}
