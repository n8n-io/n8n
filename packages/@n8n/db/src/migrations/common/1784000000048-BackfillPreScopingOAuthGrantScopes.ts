import type { MigrationContext, IrreversibleMigration } from '../migration-types';

// Backfill value written to the `scope` column by migration 1784000000026 for
// grants that predate scoping. No runtime code ever wrote this value, so it
// provably identifies a grant made under the old full-delegation contract.
const LEGACY_SENTINEL = ['tool:listWorkflows', 'tool:getWorkflowDetails'];

// The instance MCP scope set at the moment scoping shipped. Pre-scoping grants
// were full user delegations, so they get exactly this frozen set — scopes
// added in later releases require a fresh consent. Inlined because migrations
// are snapshots and must not import runtime code.
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

/**
 * Rewrites OAuth grants that predate scoping so no runtime grandfathering
 * logic is needed: sentinel-scoped refresh tokens and authorization codes get
 * the frozen launch scope set, and all access tokens are deleted. Access
 * tokens are 1-hour JWTs whose `scope` claim cannot be rewritten; deleting the
 * rows makes verification fail so clients transparently refresh, and the
 * refreshed tokens carry a real scope claim.
 */
export class BackfillPreScopingOAuthGrantScopes1784000000048 implements IrreversibleMigration {
	async up(context: MigrationContext) {
		await this.rewriteSentinelRows(context, 'oauth_refresh_tokens', 'token');
		await this.rewriteSentinelRows(context, 'oauth_authorization_codes', 'code');

		const accessTokens = context.escape.tableName('oauth_access_tokens');
		await context.runQuery(`DELETE FROM ${accessTokens}`);
	}

	private async rewriteSentinelRows(
		{ escape, runQuery, runInBatches, parseJson, logger, migrationName }: MigrationContext,
		tableName: string,
		primaryKey: string,
	) {
		const table = escape.tableName(tableName);
		const scopeColumn = escape.columnName('scope');
		const keyColumn = escape.columnName(primaryKey);

		let rewritten = 0;
		// JSON equality is not portable SQL, so rows are compared in JS
		await runInBatches<{ key: string; scope: string | string[] }>(
			`SELECT ${keyColumn} AS key, ${scopeColumn} AS scope FROM ${table}`,
			async (rows) => {
				for (const row of rows) {
					const scopes = parseJson<string[]>(row.scope);
					const isSentinel =
						Array.isArray(scopes) &&
						scopes.length === LEGACY_SENTINEL.length &&
						LEGACY_SENTINEL.every((scope, i) => scopes[i] === scope);
					if (!isSentinel) continue;

					await runQuery(`UPDATE ${table} SET ${scopeColumn} = :scope WHERE ${keyColumn} = :key`, {
						scope: JSON.stringify(PRE_SCOPING_FULL_SCOPES),
						key: row.key,
					});
					rewritten++;
				}
			},
		);

		logger.info(`[${migrationName}] Rewrote ${rewritten} pre-scoping grants in ${tableName}`);
	}
}
