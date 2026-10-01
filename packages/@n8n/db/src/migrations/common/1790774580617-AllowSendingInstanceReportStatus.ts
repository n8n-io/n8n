import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'instance_monitoring_report';
const COLUMN = 'status';
const VALUES_BEFORE = ['pending', 'delivered', 'skipped_after_max_retries'];
const VALUES_AFTER = [...VALUES_BEFORE, 'sending'];

export class AllowSendingInstanceReportStatus1790774580617 implements ReversibleMigration {
	async up({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropEnumCheck(TABLE, COLUMN, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(TABLE, COLUMN, VALUES_AFTER, { recreatesOnSqlite: true });
	}

	async down({ escape, runQuery, schemaBuilder }: MigrationContext) {
		await runQuery(
			`UPDATE ${escape.tableName(TABLE)} SET ${escape.columnName(COLUMN)} = 'pending' WHERE ${escape.columnName(COLUMN)} = 'sending'`,
		);
		await schemaBuilder.dropEnumCheck(TABLE, COLUMN, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(TABLE, COLUMN, VALUES_BEFORE, { recreatesOnSqlite: true });
	}
}
