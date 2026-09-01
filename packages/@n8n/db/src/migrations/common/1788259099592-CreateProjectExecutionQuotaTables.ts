import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateProjectExecutionQuotaTables1788259099592 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix }: MigrationContext) {
		await createTable('project_execution_quota')
			.withColumns(
				column('projectId').varchar(36).primary,
				column('limit').int.notNull,
				column('periodUnit').varchar(10).notNull,
			)
			.withTimestamps.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}project_execution_quota_projectId`,
			});

		await createTable('project_execution_counter')
			.withColumns(
				column('id').int.primary.autoGenerate2.notNull,
				column('projectId').varchar(36).notNull,
				column('workflowId').varchar(36).notNull,
				column('periodUnit').varchar(10).notNull,
				column('periodStart').varchar(32).notNull,
				column('count').int.notNull.default(0),
			)
			.withTimestamps.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}project_execution_counter_projectId`,
			})
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}project_execution_counter_workflowId`,
			})
			.withIndexOn(['projectId', 'periodUnit', 'periodStart'])
			.withUniqueConstraintOn(['projectId', 'workflowId', 'periodUnit', 'periodStart']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('project_execution_counter');
		await dropTable('project_execution_quota');
	}
}
