import type { MigrationContext, ReversibleMigration } from '../migration-types';

const workflowPublishHistoryTableName = 'workflow_publish_history';

export class CreateWorkflowPublishHistoryTable1764167920585 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, escape, runQuery }: MigrationContext) {
		await createTable(workflowPublishHistoryTableName)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('workflowId').varchar(36).notNull,
				column('versionId').varchar(36).notNull,
				column('status')
					.varchar(36)
					.notNull.comment(
						'Final state of workflow: activated (workflow is now active), deactivated (workflow is now inactive)',
					),
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
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withEnumCheck('status', ['activated', 'deactivated']);

		const workflowEntityTableName = escape.tableName('workflow_entity');
		const id = escape.columnName('id');
		const activeVersionId = escape.columnName('activeVersionId');
		const updatedAt = escape.columnName('updatedAt');

		await runQuery(
			`INSERT INTO workflow_publish_history (workflowId, versionId, status, createdAt)
				SELECT we.${id}, we.${activeVersionId}, 'activated', we.${updatedAt}
				FROM ${workflowEntityTableName} we
				WHERE we.${activeVersionId} IS NOT NULL`,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(workflowPublishHistoryTableName);
	}
}
