import type { MigrationContext, ReversibleMigration } from '../migration-types';

const COLUMN_COMMENT =
	'Admin-supplied note on what the connected MCP client is for. Set and read through the MCP clients settings';

export class AddDescriptionToOAuthClients1794590178924 implements ReversibleMigration {
	// Raw ALTER TABLE, not addColumns: consents, tokens and authorization codes reference
	// oauth_clients with ON DELETE CASCADE, and the SQLite table recreation would fire them.
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('oauth_clients');
		const columnName = escape.columnName('description');

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} TEXT`);

		if (isPostgres) {
			await runQuery(`COMMENT ON COLUMN ${tableName}.${columnName} IS '${COLUMN_COMMENT}'`);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('oauth_clients');
		const columnName = escape.columnName('description');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
