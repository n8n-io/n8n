import type { MigrationContext, ReversibleMigration } from '../migration-types';

const COLUMN_COMMENTS = {
	displayName:
		'Admin-supplied name shown in the MCP clients settings instead of the registered name. The registered name stays in name',
	description:
		'Admin-supplied note on what the connected MCP client is for. Set and read through the MCP clients settings',
};

export class AddDescriptionToOAuthClients1794590178924 implements ReversibleMigration {
	// Raw ALTER TABLE, not addColumns: consents, tokens and authorization codes reference
	// oauth_clients with ON DELETE CASCADE, and the SQLite table recreation would fire them.
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('oauth_clients');
		const displayName = escape.columnName('displayName');
		const description = escape.columnName('description');

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${displayName} VARCHAR(255)`);
		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${description} TEXT`);

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${displayName} IS '${COLUMN_COMMENTS.displayName}'`,
			);
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${description} IS '${COLUMN_COMMENTS.description}'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('oauth_clients');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${escape.columnName('description')}`);
		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${escape.columnName('displayName')}`);
	}
}
