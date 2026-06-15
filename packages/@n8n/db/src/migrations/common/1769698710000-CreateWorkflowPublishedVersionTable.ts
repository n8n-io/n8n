import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Creates the workflow_published_version table to track the actually-published
 * workflow version in production. This is distinct from workflow_entity.activeVersionId
 * which tracks the requested/intended published version. Since publication is an
 * asynchronous process, this table is updated only when the new version is fully
 * deployed and ready for production executions.
 */
export class CreateWorkflowPublishedVersionTable1769698710000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('workflow_published_version')
			.withColumns(
				column('workflowId').varchar(36).primary.notNull,
				column('publishedVersionId').varchar(36).notNull,
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
		await dropTable('workflow_published_version');
	}
}
