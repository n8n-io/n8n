import type { MigrationContext, ReversibleMigration } from '../migration-types';

const COLUMNS: Array<[table: string, column: string, definition: string]> = [
	['mcp_server_call', 'intent', 'TEXT'],
	['mcp_server_call', 'sessionId', 'VARCHAR(36)'],
	['mcp_server', 'captureIntent', 'BOOLEAN NOT NULL DEFAULT TRUE'],
	['mcp_server', 'missingCapabilityTool', 'BOOLEAN NOT NULL DEFAULT TRUE'],
];

/**
 * Adds the stated reason and the session of a call, and the two server settings
 * that control them. Raw `ALTER TABLE ADD COLUMN`, not the `addColumns` DSL
 * helper: the DSL recreates the table on SQLite, and `mcp_server` has incoming
 * CASCADE foreign keys.
 */
export class AddInsightsColumnsToMcpServers1794700000000 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		for (const [table, column, definition] of COLUMNS) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(table)} ADD COLUMN ${escape.columnName(column)} ${definition}`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		for (const [table, column] of COLUMNS) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(table)} DROP COLUMN ${escape.columnName(column)}`,
			);
		}
	}
}
