import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentEvaluationRunTable1784000000012 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_evaluation_run')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('projectId').varchar(255).notNull,
				column('agentId').varchar(36).notNull,
				column('agentVersionId').varchar(255).notNull,
				column('suiteId').varchar(255).notNull,
				column('startedAt').timestampTimezone(3).notNull,
				column('completedAt').timestampTimezone(3).notNull,
				column('summary').json.notNull,
				column('cases').json.notNull,
				column('warnings').json.notNull,
				column('createdById').uuid,
			)
			.withIndexOn('projectId')
			.withIndexOn(['projectId', 'agentId', 'completedAt'])
			.withIndexOn(['agentId', 'agentVersionId', 'completedAt'])
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_evaluation_run');
	}
}
