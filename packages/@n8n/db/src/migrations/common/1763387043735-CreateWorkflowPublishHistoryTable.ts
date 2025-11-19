import type { MigrationContext, ReversibleMigration } from '../migration-types';

const workflowPublishHistoryTableName = 'workflow_publish_history';

export class CreateWorkflowPublishHistoryTable1763387043735 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, runQuery, escape }: MigrationContext) {
		await createTable(workflowPublishHistoryTableName)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('workflowId').varchar(36).notNull,
				column('versionId').varchar(36),
				column('status').varchar(36).notNull,
				column('mode').varchar(36),
				column('userId').varchar(36),
			)
			.withCreatedAt.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('versionId', {
				tableName: 'workflow_history',
				columnName: 'versionId',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['workflowId', 'versionId']);

		const workflowEntityTableName = escape.tableName('workflow_entity');

		const activeWorkflows = await runQuery<Array<{ id: string; versionId: string }>>(
			`SELECT we.id, we.versionId FROM ${workflowEntityTableName} we WHERE we.activeVersionId <> null;`,
		);
		console.log(activeWorkflows);

		if (activeWorkflows.length > 0) {
			const values = activeWorkflows
				.map(({ id, versionId }) => `('${id}', '${versionId}', 'activated', 'init')`)
				.join(',');
			await runQuery(
				`INSERT INTO ${workflowPublishHistoryTableName} (workflowId, versionId, status, activationMode) VALUES ${values};`,
			);
		}
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(workflowPublishHistoryTableName);
	}
}
