import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'agents_memory_entries';
const COLUMN = 'status';
const VALUES_BEFORE = ['active', 'superseded', 'dropped'];
const VALUES_AFTER = [...VALUES_BEFORE, 'deleted'];

export class AllowDeletedAgentMemoryEntryStatus1792694961350 implements ReversibleMigration {
	async up({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropEnumCheck(TABLE, COLUMN, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(TABLE, COLUMN, VALUES_AFTER, { recreatesOnSqlite: true });
	}

	async down({ escape, runQuery, schemaBuilder }: MigrationContext) {
		// 'dropped' keeps the row and its sources and still hides it from recall.
		await runQuery(
			`UPDATE ${escape.tableName(TABLE)} SET ${escape.columnName(COLUMN)} = 'dropped' WHERE ${escape.columnName(COLUMN)} = 'deleted'`,
		);
		await schemaBuilder.dropEnumCheck(TABLE, COLUMN, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(TABLE, COLUMN, VALUES_BEFORE, { recreatesOnSqlite: true });
	}
}
