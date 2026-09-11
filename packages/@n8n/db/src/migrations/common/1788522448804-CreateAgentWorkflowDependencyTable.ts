import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentWorkflowDependencyTable1788522448804 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_workflow_dependency')
			.withColumns(column('agentId').varchar(36).primary, column('workflowId').varchar(36).primary)
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['workflowId']).withCreatedAt;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_workflow_dependency');
	}
}
