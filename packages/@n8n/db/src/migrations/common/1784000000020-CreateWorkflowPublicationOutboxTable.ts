import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Creates the workflow_publication_outbox table for the transactional outbox
 * pattern. Each row represents a pending (or in-progress / completed)
 * publication request that the outbox consumer will process asynchronously.
 */
export class CreateWorkflowPublicationOutboxTable1784000000020 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('workflow_publication_outbox').withColumns(
			column('id').int.primary.autoGenerate2,
			// workflowId references workflow_entity and publishedVersionId
			// references workflow_history, but no foreign keys: this is a
			// transient queue table. If a workflow or history version is
			// deleted while a publication is in-flight, the outbox consumer
			// will encounter the orphaned record and fail gracefully. Using
			// FKs would either silently delete the record (CASCADE) or block
			// workflow deletion (RESTRICT), neither of which is desirable.
			column('workflowId').varchar(36).notNull,
			column('publishedVersionId').varchar(36).notNull,
			column('status')
				.varchar(20)
				.notNull.withEnumCheck([
					'pending',
					'in_progress',
					'completed',
					'partial_success',
					'failed',
				]),
			column('errorMessage').text.comment(
				'Error details for surfacing failed publications to the user.',
			),
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('workflow_publication_outbox');
	}
}
