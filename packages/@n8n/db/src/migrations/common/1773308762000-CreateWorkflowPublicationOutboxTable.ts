import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Creates the workflow_publication_outbox table for the transactional outbox
 * pattern. Each row represents a pending (or in-progress / completed)
 * publication request that the outbox consumer will process asynchronously.
 *
 * Columns:
 *   - id:                  Auto-generated surrogate PK
 *   - workflowId:          FK → workflow_entity
 *   - publishedVersionId:  FK → workflow_history (the version to deploy)
 *   - status:              pending | in_progress | completed | partial_success | failed
 *   - errorMessage:        Optional error details for surfacing to the user
 *   - createdAt/updatedAt: Managed by WithTimestamps
 */
export class CreateWorkflowPublicationOutboxTable1773308762000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('workflow_publication_outbox')
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('workflowId').varchar(36).notNull,
				column('publishedVersionId').varchar(36).notNull,
				column('status')
					.varchar(20)
					.notNull.default("'pending'")
					.withEnumCheck(['pending', 'in_progress', 'completed', 'partial_success', 'failed']),
				column('errorMessage').text,
			)
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
