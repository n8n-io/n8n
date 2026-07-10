import type { MigrationContext, ReversibleMigration } from '../migration-types';

// The instance MCP scope set at the moment scoping shipped. Consents that
// exist before this migration were full user delegations, so they get exactly
// this frozen set — scopes added in later releases require a fresh consent.
// Inlined because migrations are snapshots and must not import runtime code.
const PRE_SCOPING_FULL_SCOPES = [
	'workflow:read',
	'workflow:write',
	'workflow:execute',
	'execution:read',
	'credential:read',
	'dataTable:read',
	'dataTable:write',
	'project:read',
	'tag:read',
];

export class AddScopeColumnToOAuthUserConsents1784000000047 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, addNotNull, column },
		escape,
		runQuery,
	}: MigrationContext) {
		await addColumns(
			'oauth_user_consents',
			[column('scope').json.comment('OAuth scopes granted on the consent screen')],
			{ recreatesOnSqlite: true },
		);

		const table = escape.tableName('oauth_user_consents');
		const scopeColumn = escape.columnName('scope');
		await runQuery(`UPDATE ${table} SET ${scopeColumn} = :scope WHERE ${scopeColumn} IS NULL`, {
			scope: JSON.stringify(PRE_SCOPING_FULL_SCOPES),
		});

		// No default on purpose: an insert that forgets the scope must fail
		// instead of silently granting anything.
		await addNotNull('oauth_user_consents', 'scope', { recreatesOnSqlite: true });
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('oauth_user_consents', ['scope'], { recreatesOnSqlite: true });
	}
}
