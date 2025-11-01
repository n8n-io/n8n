import type { MigrationContext, ReversibleMigration } from '../migration-types';

const processedDataTableName = 'processed_data';

export class CreateProcessedDataTable1726606152711 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(processedDataTableName)
			.withColumns(
				column('workflowId').varchar(36).notNull.primary,
				column('value').varchar(255).notNull,
				column('context').varchar(255).notNull.primary,
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(processedDataTableName);
	}
}
