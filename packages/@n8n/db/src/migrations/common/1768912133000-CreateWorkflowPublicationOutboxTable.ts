import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Creates the workflow_publication_outbox table to track workflow publication
 * events. Uses the outbox pattern to ensure reliable asynchronous publication
 * of workflows to execution environments.
 *
 * Status values:
 * - 'pending': Publication event created, waiting to be processed
 * - 'in_progress': Publication is currently being processed
 * - 'completed': Publication successfully completed
 * - 'failed': Publication failed, may need retry
 */
export class CreateWorkflowPublicationOutboxTable1768912133000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('workflow_publication_outbox')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('workflowId').varchar(36).notNull,
				column('publishedVersionId').varchar(36).notNull,
				column('status').varchar().notNull,
			)
			.withIndexOn('workflowId')
			.withIndexOn('status')
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('publishedVersionId', {
				tableName: 'workflow_history',
				columnName: 'versionId',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('workflow_publication_outbox');
	}
}
