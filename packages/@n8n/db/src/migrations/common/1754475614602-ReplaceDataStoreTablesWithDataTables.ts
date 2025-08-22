import type { MigrationContext, ReversibleMigration } from '../migration-types';

const DATA_STORE_TABLE_NAME = 'data_store';
const DATA_STORE_COLUMN_TABLE_NAME = 'data_store_column';

const DATA_TABLE_TABLE_NAME = 'data_table';
const DATA_TABLE_COLUMN_TABLE_NAME = 'data_table_column';

export class ReplaceDataStoreTablesWithDataTables1754475614602 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column, dropTable } }: MigrationContext) {
		await dropTable(DATA_STORE_COLUMN_TABLE_NAME);
		await dropTable(DATA_STORE_TABLE_NAME);

		await createTable(DATA_TABLE_TABLE_NAME)
			.withColumns(
				column('id').varchar(36).primary,
				column('name').varchar(128).notNull,
				column('projectId').varchar(36).notNull,
			)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withUniqueConstraintOn(['projectId', 'name']).withTimestamps;

		await createTable(DATA_TABLE_COLUMN_TABLE_NAME)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('type')
					.varchar(32)
					.notNull.comment(
						'Expected: string, number, boolean, or date (not enforced as a constraint)',
					),
				column('index').int.notNull.comment('Column order, starting from 0 (0 = first column)'),
				column('dataTableId').varchar(36).notNull,
			)
			.withForeignKey('dataTableId', {
				tableName: DATA_TABLE_TABLE_NAME,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withUniqueConstraintOn(['dataTableId', 'name']).withTimestamps;
	}

	async down({ schemaBuilder: { createTable, column, dropTable } }: MigrationContext) {
		await dropTable(DATA_TABLE_COLUMN_TABLE_NAME);
		await dropTable(DATA_TABLE_TABLE_NAME);

		await createTable(DATA_STORE_TABLE_NAME)
			.withColumns(
				column('id').varchar(36).primary,
				column('name').varchar(128).notNull,
				column('projectId').varchar(36).notNull,
				column('sizeBytes').int.default(0).notNull,
			)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withUniqueConstraintOn(['projectId', 'name']).withTimestamps;

		await createTable(DATA_STORE_COLUMN_TABLE_NAME)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('type')
					.varchar(32)
					.notNull.comment(
						'Expected: string, number, boolean, or date (not enforced as a constraint)',
					),
				column('index').int.notNull.comment('Column order, starting from 0 (0 = first column)'),
				column('dataStoreId').varchar(36).notNull,
			)
			.withForeignKey('dataStoreId', {
				tableName: DATA_STORE_TABLE_NAME,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withUniqueConstraintOn(['dataStoreId', 'name']).withTimestamps;
	}
}
