import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'workflow_history';

export class CreateWorkflowHistoryTable1692967111175 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('versionId').varchar(36).primary.notNull,
				column('workflowId').varchar(36).notNull,
				column('nodes').text.notNull,
				column('connections').text.notNull,
				column('authors').varchar(255).notNull,
			)
			.withTimestamps.withIndexOn('workflowId')
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
