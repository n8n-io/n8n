import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class AddOAuthScopesAndSeedCliClient1773100000000 implements IrreversibleMigration {
	async up({ schemaBuilder: { addColumns, column }, escape, runQuery }: MigrationContext) {
		// Add scopes column to authorization codes
		await addColumns('oauth_authorization_codes', [column('scopes').text]);

		// Add scopes column to refresh tokens (needed to preserve scopes across refresh)
		await addColumns('oauth_refresh_tokens', [column('scopes').text]);

		// Seed n8n-cli client
		const clientsTable = escape.tableName('oauth_clients');
		const now = Date.now();
		await runQuery(`
			INSERT INTO ${clientsTable} (
				${escape.columnName('id')},
				${escape.columnName('name')},
				${escape.columnName('redirectUris')},
				${escape.columnName('grantTypes')},
				${escape.columnName('tokenEndpointAuthMethod')},
				${escape.columnName('createdAt')},
				${escape.columnName('updatedAt')}
			) VALUES (
				'n8n-cli',
				'n8n CLI',
				'[]',
				'["authorization_code","refresh_token"]',
				'none',
				'${new Date(now).toISOString()}',
				'${new Date(now).toISOString()}'
			)
		`);
	}
}
