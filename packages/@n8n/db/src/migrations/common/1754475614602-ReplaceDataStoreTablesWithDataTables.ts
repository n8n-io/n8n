import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_TABLE_NAME_BEFORE = 'data_store';
const COLUMN_TABLE_NAME_BEFORE = 'data_store_column';

const TABLE_TABLE_NAME_AFTER = 'data_table';
const COLUMN_TABLE_NAME_AFTER = 'data_table_column';

export class ReplaceDataStoreTablesWithDataTables1754475614602 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column, dropTable } }: MigrationContext) {
		await dropTable(COLUMN_TABLE_NAME_BEFORE);
		await dropTable(TABLE_TABLE_NAME_BEFORE);

		await createTable(TABLE_TABLE_NAME_AFTER)
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

		await createTable(COLUMN_TABLE_NAME_AFTER)
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
				tableName: TABLE_TABLE_NAME_AFTER,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withUniqueConstraintOn(['dataTableId', 'name']).withTimestamps;
	}

	async down({ schemaBuilder: { createTable, column, dropTable } }: MigrationContext) {
		await dropTable(COLUMN_TABLE_NAME_AFTER);
		await dropTable(TABLE_TABLE_NAME_AFTER);

		await createTable(TABLE_TABLE_NAME_BEFORE)
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

		await createTable(COLUMN_TABLE_NAME_BEFORE)
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
				tableName: TABLE_TABLE_NAME_BEFORE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withUniqueConstraintOn(['dataStoreId', 'name']).withTimestamps;
	}
}
