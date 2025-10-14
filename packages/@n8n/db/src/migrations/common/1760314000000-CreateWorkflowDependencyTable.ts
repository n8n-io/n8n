import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateWorkflowDependencyTable1760314000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('workflow_dependency')
			.withColumns(
				column('id').uuid.primary,
				column('workflowId').varchar(36).notNull,
				column('workflowVersionId').int.notNull.comment('Version of the workflow'),
				column('dependencyType')
					.varchar(32)
					.notNull.comment(
						'Type of dependency: "credential", "nodeType", "webhookPath", or "workflowCall"',
					),
				column('dependencyId').varchar(255).notNull.comment('ID or name of the dependency'),
				column('nodeId').varchar(255).comment('Node ID for nodeType dependencies, null otherwise'),
				column('indexVersionId').int.notNull.default(1).comment('Version of the index structure'),
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['workflowId'])
			.withIndexOn(['dependencyType'])
			.withIndexOn(['dependencyId']).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('workflow_dependency');
	}
}
