import type { MigrationContext, ReversibleMigration } from '../migration-types';

// Default scopes applied to OAuth grants that predate the scope column, and to
// any grant created before a scope is written explicitly. Inlined because
// migrations are snapshots and must not import runtime code.
const LEGACY_SCOPES = ['tool:listWorkflows', 'tool:getWorkflowDetails'];
const DEFAULT_SCOPE = `'${JSON.stringify(LEGACY_SCOPES)}'`;

export class AddScopeColumnToOAuthTables1784000000026 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'oauth_authorization_codes',
			[
				column('scope')
					.json.notNull.default(DEFAULT_SCOPE)
					.comment('OAuth scopes granted for this authorization code'),
			],
			{ recreatesOnSqlite: true },
		);
		await addColumns(
			'oauth_refresh_tokens',
			[
				column('scope')
					.json.notNull.default(DEFAULT_SCOPE)
					.comment('OAuth scopes granted for this refresh token'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('oauth_refresh_tokens', ['scope'], { recreatesOnSqlite: true });
		await dropColumns('oauth_authorization_codes', ['scope'], { recreatesOnSqlite: true });
	}
}
