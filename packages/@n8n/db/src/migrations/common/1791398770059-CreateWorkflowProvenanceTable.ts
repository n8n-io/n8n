import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateWorkflowProvenanceTable1791398770059 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('workflow_provenance')
			.withColumns(
				column('workflowId').varchar(36).primary.comment('Workflow that the Assistant built'),
				column('threadId').varchar(36).notNull.comment('Assistant chat that built the workflow'),
				column('createdByUserId').uuid.comment('User who started the chat'),
			)
			.withCreatedAt.withIndexOn('createdByUserId')
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdByUserId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('workflow_provenance');
	}
}
