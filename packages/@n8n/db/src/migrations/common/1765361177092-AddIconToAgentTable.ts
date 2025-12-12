import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'chat_hub_agents';

export class AddIconToAgentTable1765361177092 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column },
		runQuery,
		isMysql,
		isPostgres,
		escape,
	}: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedIdColumn = escape.columnName('id');

		// Add icon column to agents table (nullable)
		await addColumns(tableName, [column('icon').json]);

		// Change agents.id from UUID to varchar to match foreign key references
		if (isPostgres) {
			await runQuery(
				`ALTER TABLE ${escapedTableName} ALTER COLUMN ${escapedIdColumn} TYPE VARCHAR`,
			);
		} else if (isMysql) {
			await runQuery(`ALTER TABLE ${escapedTableName} MODIFY COLUMN \`id\` VARCHAR(255)`);
		}
	}

	async down({
		schemaBuilder: { dropColumns },
		runQuery,
		isMysql,
		isPostgres,
		escape,
	}: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedIdColumn = escape.columnName('id');

		if (isPostgres) {
			await runQuery(
				`ALTER TABLE ${escapedTableName} ALTER COLUMN ${escapedIdColumn} TYPE UUID USING ${escapedIdColumn}::UUID`,
			);
		} else if (isMysql) {
			await runQuery(`ALTER TABLE ${escapedTableName} MODIFY COLUMN \`id\` CHAR(36)`);
		}

		await dropColumns(tableName, ['icon']);
	}
}
