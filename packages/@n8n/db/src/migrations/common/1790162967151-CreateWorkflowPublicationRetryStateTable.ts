import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateWorkflowPublicationRetryStateTable1790162967151 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('workflow_publication_retry_state')
			.withColumns(
				column('workflowId').varchar(36).primary.notNull,
				// A missing history version is itself a publication failure, so this
				// target must remain valid without a workflow_history foreign key.
				column('targetVersionId').varchar(36).notNull,
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('workflow_publication_retry_state');
	}
}
