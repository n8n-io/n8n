import type { MigrationContext, ReversibleMigration } from '../migration-types';

const dataStoreTableName = 'data_store';
const dataStoreColumnTableName = 'data_store_column';

export class CreateDataStoreTables1754475614601 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(dataStoreTableName)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('projectId').varchar(36).notNull,
				column('sizeBytes').varchar(255).default('0').notNull,
			)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['projectId', 'name'], true).withTimestamps;

		await createTable(dataStoreColumnTableName)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('type').varchar(32).notNull,
				column('columnIndex').int.notNull,
				column('dataStoreId').varchar(36).notNull,
			)
			.withForeignKey('dataStoreId', {
				tableName: dataStoreTableName,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['dataStoreId', 'name'], true).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(dataStoreTableName);
		await dropTable(dataStoreColumnTableName);

		// We're not dropping user tables as their names are dynamic
	}
}
