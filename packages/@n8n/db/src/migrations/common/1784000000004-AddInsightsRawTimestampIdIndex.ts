import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'insights_raw';
const columns = ['timestamp', 'id'];

export class AddInsightsRawTimestampIdIndex1784000000004 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await context.schemaBuilder.createIndex(tableName, columns);
	}

	async down(context: MigrationContext) {
		await context.schemaBuilder.dropIndex(tableName, columns, { skipIfMissing: true });
	}
}
