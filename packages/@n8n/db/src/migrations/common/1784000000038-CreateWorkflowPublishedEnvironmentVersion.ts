import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateWorkflowPublishedEnvironmentVersion1784000000038 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('workflow_published_environment_version')
			.withColumns(
				column('id').int.autoGenerate.primary,
				column('workflowId').varchar(36).notNull,
				column('environmentId').varchar(36).notNull,
				column('publishedVersionId').varchar(36).notNull,
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('environmentId', {
				tableName: 'project_environment',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('publishedVersionId', {
				tableName: 'workflow_history',
				columnName: 'versionId',
				onDelete: 'RESTRICT',
			})
			.withUniqueConstraintOn(['workflowId', 'environmentId']).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('workflow_published_environment_version');
	}
}
