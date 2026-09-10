import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateDataTableRowAutomation1789045785000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('data_table_row_automation')
			.withColumns(
				column('id').uuid.primary,
				column('dataTableId').varchar(36).notNull,
				column('rowId').int.notNull,
				column('workflowId').varchar(36).notNull,
				column('nodeId').varchar(36).notNull,
				column('status')
					.varchar(20)
					.notNull.withEnumCheck(['waiting', 'running', 'finished', 'failed'])
					.comment('Latest state of the trigger execution for this row'),
				column('executionId').bigint,
				column('error').text,
			)
			.withUniqueConstraintOn(['dataTableId', 'rowId', 'workflowId', 'nodeId'])
			.withIndexOn(['workflowId', 'nodeId'])
			.withIndexOn('executionId')
			.withForeignKey('dataTableId', {
				tableName: 'data_table',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('data_table_row_automation');
	}
}
