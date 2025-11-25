import type { MigrationContext, ReversibleMigration } from '../migration-types';

const workflowPublishHistoryTableName = 'workflow_publish_history';

export class CreateWorkflowPublishHistoryTable1763387043735 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, escape, runQuery }: MigrationContext) {
		await createTable(workflowPublishHistoryTableName)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('workflowId').varchar(36).notNull,
				column('versionId').varchar(36),
				column('status').varchar(36).notNull,
				column('mode').varchar(36),
				column('userId').uuid,
			)
			.withCreatedAt.withIndexOn('workflowId')
			.withIndexOn(['workflowId', 'versionId'])
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('versionId', {
				tableName: 'workflow_history',
				columnName: 'versionId',
				onDelete: 'SET NULL',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			});

		const workflowEntityTableName = escape.tableName('workflow_entity');
		const activeWorkflows = await runQuery<Array<{ id: string; activeversionid: string }>>(
			`SELECT we.id, we.activeversionid FROM ${workflowEntityTableName} we WHERE we.activeversionid IS NOT NULL;`,
		);

		if (activeWorkflows.length > 0) {
			const values = activeWorkflows
				.map(({ id, activeversionid }) => `('${id}', '${activeversionid}', 'activated', 'init')`)
				.join(',');
			await runQuery(
				`INSERT INTO ${workflowPublishHistoryTableName} (workflowId, versionId, status, mode) VALUES ${values};`,
			);
		}
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(workflowPublishHistoryTableName);
	}
}
