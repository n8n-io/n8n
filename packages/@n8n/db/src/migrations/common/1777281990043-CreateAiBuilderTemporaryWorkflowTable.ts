import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAiBuilderTemporaryWorkflowTable1777281990043 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('ai_builder_temporary_workflow')
			.withColumns(
				column('workflowId').varchar(36).primary.notNull,
				column('threadId').uuid.notNull,
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('threadId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn('threadId').withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('ai_builder_temporary_workflow');
	}
}
