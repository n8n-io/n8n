import type { MigrationContext, ReversibleMigration } from '../migration-types';

const workflowPublishHistoryTableName = 'workflow_publish_history';

export class CreateWorkflowPublishHistoryTable1763387043735 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
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
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(workflowPublishHistoryTableName);
	}
}
