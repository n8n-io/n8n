import type { MigrationContext, ReversibleMigration } from '../migration-types';

const sourceTable = 'trusted_key_source';
const keyTable = 'trusted_key';

export class CreateTrustedKeyTables1776000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(sourceTable).withColumns(
			column('id').varchar(36).primary.notNull,
			column('type').varchar(32).notNull,
			column('config').text.notNull,
			column('status').varchar(32).notNull.default("'pending'"),
			column('lastError').text,
			column('lastRefreshedAt').timestamp(),
		).withTimestamps;

		await createTable(keyTable)
			.withColumns(
				column('sourceId').varchar(36).primary.notNull,
				column('kid').varchar(255).primary.notNull,
				column('data').text.notNull,
			)
			.withForeignKey('sourceId', {
				tableName: sourceTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withCreatedAt;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(keyTable);
		await dropTable(sourceTable);
	}
}
