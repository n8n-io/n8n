import type { MigrationContext, ReversibleMigration } from '../migration-types';

const dataStoreTableName = 'dataStore';
const dataStoreColumnTableName = 'dataStore_column';

export class CreateDataStoreTables1747814180618 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(dataStoreTableName).withColumns(
			column('id').varchar(36).primary.notNull,
			column('name').varchar(128).notNull,
		).withTimestamps;

		await createTable(dataStoreColumnTableName)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('type').varchar(32).notNull,
				column('dataStoreId').varchar(36).notNull,
			)
			.withForeignKey('dataStoreId', {
				tableName: dataStoreTableName,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(dataStoreTableName);
		await dropTable(dataStoreColumnTableName);

		// @Review: Should we also drop all created user tables here?
	}
}
