import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'project_workflow_review_settings';

export class CreateProjectWorkflowReviewSettingsTable1795450721000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('projectId').varchar(36).primary,
				column('requiredByProject')
					.bool.notNull.default(false)
					.comment(
						'Set by a project admin. When true, a workflow version in this project needs an approved review before it is published',
					),
				column('requiredByInstance')
					.bool.notNull.default(false)
					.comment(
						'Set by an instance admin. When true, a workflow version in this project needs an approved review before it is published, whatever requiredByProject says',
					),
			)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}${tableName}_projectId`,
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
