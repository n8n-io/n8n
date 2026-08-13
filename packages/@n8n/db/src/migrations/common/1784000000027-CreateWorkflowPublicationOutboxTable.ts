import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Creates the workflow_publication_outbox table for the transactional outbox
 * pattern. Each row represents a pending (or in-progress / completed)
 * publication request that the outbox consumer will process asynchronously.
 */
export class CreateWorkflowPublicationOutboxTable1784000000027 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, createIndex, column } }: MigrationContext) {
		await createTable('workflow_publication_outbox').withColumns(
			column('id').int.primary.autoGenerate2,
			// No foreign keys on workflowId or publishedVersionId: this is a
			// transient queue table. If a workflow or history version is
			// deleted while a publication is in-flight, the outbox consumer
			// will encounter the orphaned record and fail gracefully. Using
			// FKs would either silently delete the record (CASCADE) or block
			// workflow deletion (RESTRICT), neither of which is desirable.
			column('workflowId')
				.varchar(36)
				.notNull.comment('References workflow_entity.id.'),
			column('publishedVersionId')
				.varchar(36)
				.notNull.comment('References workflow_history.versionId.'),
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

		// Uniqueness on (workflowId, status) for active statuses gives us two
		// invariants in one index: at most one pending record per workflow (a
		// newer version supersedes the older) and at most one in-progress record
		// per workflow (never published concurrently). A pending and an in-progress
		// record can still coexist, since their (workflowId, status) tuples differ.
		await createIndex(
			'workflow_publication_outbox',
			['workflowId', 'status'],
			true,
			'IDX_workflow_publication_outbox_active_workflow_status',
			"status IN ('pending', 'in_progress')",
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('workflow_publication_outbox');
	}
}
