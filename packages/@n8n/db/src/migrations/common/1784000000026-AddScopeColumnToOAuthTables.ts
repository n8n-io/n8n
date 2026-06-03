import type { MigrationContext, ReversibleMigration } from '../migration-types';

// Default scopes applied to OAuth grants that were created before the scope
// column existed. Inlined because migrations are snapshots and must not import
// runtime code.
const LEGACY_SCOPES = ['tool:listWorkflows', 'tool:getWorkflowDetails'];

export class AddScopeColumnToOAuthTables1784000000026 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const {
			schemaBuilder: { addColumns, column },
		} = context;

		await addColumns('oauth_authorization_codes', [
			column('scope').json.comment('OAuth scopes granted for this authorization code'),
		]);
		await addColumns('oauth_refresh_tokens', [
			column('scope').json.comment('OAuth scopes granted for this refresh token'),
		]);

		await this.backfillScopes(context);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('oauth_refresh_tokens', ['scope']);
		await dropColumns('oauth_authorization_codes', ['scope']);
	}

	private async backfillScopes({ runQuery, escape }: MigrationContext) {
		const scope = JSON.stringify(LEGACY_SCOPES);
		const scopeColumn = escape.columnName('scope');

		for (const table of ['oauth_authorization_codes', 'oauth_refresh_tokens']) {
			const tableName = escape.tableName(table);
			await runQuery(
				`UPDATE ${tableName} SET ${scopeColumn} = :scope WHERE ${scopeColumn} IS NULL`,
				{ scope },
			);
		}
	}
}
