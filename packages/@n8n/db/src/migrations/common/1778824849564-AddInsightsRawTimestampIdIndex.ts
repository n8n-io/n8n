import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'insights_raw';
const columns = ['timestamp', 'id'];
const indexName = 'insights_raw_timestamp_id';

export class AddInsightsRawTimestampIdIndex1778824849564 implements ReversibleMigration {
	async up(context: MigrationContext) {
		if (context.isPostgres) {
			await context.runQuery(
				`CREATE INDEX IF NOT EXISTS ${context.escape.indexName(indexName)}
				ON ${context.escape.tableName(tableName)} (${context.escape.columnName('timestamp')}, ${context.escape.columnName('id')})`,
			);

			return;
		}

		await context.schemaBuilder.createIndex(tableName, columns);
	}

	async down(context: MigrationContext) {
		if (context.isPostgres) {
			await context.runQuery(`DROP INDEX IF EXISTS ${context.escape.indexName(indexName)}`);

			return;
		}

		await context.schemaBuilder.dropIndex(tableName, columns, { skipIfMissing: true });
	}
}
