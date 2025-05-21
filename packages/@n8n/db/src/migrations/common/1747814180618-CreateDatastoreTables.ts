import type { MigrationContext, ReversibleMigration } from '../migration-types';

const datastoreTableName = 'datastore';
const datastoreFieldTableName = 'datastore_field';

export class CreateDatastoreTables1747814180618 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(datastoreTableName).withColumns(
			column('id').varchar(36).primary.notNull,
			column('name').varchar(128).notNull,
		).withTimestamps;

		await createTable(datastoreFieldTableName)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('type').varchar(32).notNull,
				column('datastoreId').varchar(36).notNull,
			)
			.withForeignKey('datastoreId', {
				tableName: datastoreTableName,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(datastoreTableName);
		await dropTable(datastoreFieldTableName);
	}
}
