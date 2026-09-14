import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const UPDATE_SCOPE = 'project:update';
const MANAGE_MEMBERS_SCOPE = 'project:manageMembers';

type ApiKeyRow = { id: string; scopes: string | string[] | null };

/**
 * Granting a project role used to ride on `project:update`. It now has its own
 * `project:manageMembers` scope, so custom project roles that could manage members
 * before must keep being able to, otherwise member management silently stops
 * working for them on upgrade. Public API keys carry their own frozen scope
 * list, so a key that could add project members via `project:update` needs the
 * same grant.
 *
 * System roles are excluded: their scopes are reconciled from code on every
 * startup (AuthRolesService), so touching them here would only be undone.
 *
 * The scope row is inserted first because `role_scope.scopeSlug` references it,
 * and the startup sync that would normally create it runs after migrations.
 *
 * Irreversible: a faithful `down()` would have to know which role_scope rows
 * and API keys already carried `project:manageMembers` before this ran, and that
 * state isn't captured. Deleting every `project:manageMembers` grant on revert
 * would also drop mappings added later (new custom roles, manual grants).
 *
 * Compatible with SQLite and PostgreSQL.
 */
export class AddProjectManageMembersScopeToCustomRoles1787140858009
	implements IrreversibleMigration
{
	async up(ctx: MigrationContext) {
		await this.ensureScopeAndGrantCustomRoles(ctx);
		await this.grantToApiKeysWithUpdate(ctx);
	}

	private async ensureScopeAndGrantCustomRoles({ escape, runQuery }: MigrationContext) {
		const scopeTable = escape.tableName('scope');
		const scopeSlug = escape.columnName('slug');
		const displayName = escape.columnName('displayName');
		const description = escape.columnName('description');

		await runQuery(
			`INSERT INTO ${scopeTable} (${scopeSlug}, ${displayName}, ${description})
			 VALUES ('project:manageMembers', 'Manage Project Members', 'Allows adding members to a project, changing a member''s project role, and removing members.')
			 ON CONFLICT (${scopeSlug}) DO NOTHING`,
		);

		const roleTable = escape.tableName('role');
		const roleScopeTable = escape.tableName('role_scope');
		const roleSlug = escape.columnName('slug');
		const roleType = escape.columnName('roleType');
		const systemRole = escape.columnName('systemRole');
		const mappedRoleSlug = escape.columnName('roleSlug');
		const mappedScopeSlug = escape.columnName('scopeSlug');

		// systemRole is bound as a parameter so the driver renders the boolean the
		// way each engine expects (Postgres `false` vs SQLite `0`).
		await runQuery(
			`INSERT INTO ${roleScopeTable} (${mappedRoleSlug}, ${mappedScopeSlug})
			 SELECT DISTINCT role.${roleSlug}, 'project:manageMembers'
			 FROM ${roleTable} role
			 INNER JOIN ${roleScopeTable} role_scope
			   ON role.${roleSlug} = role_scope.${mappedRoleSlug}
			 WHERE role.${roleType} = 'project'
			   AND role.${systemRole} = :isSystemRole
			   AND role_scope.${mappedScopeSlug} = 'project:update'
			 ON CONFLICT (${mappedRoleSlug}, ${mappedScopeSlug}) DO NOTHING`,
			{ isSystemRole: false },
		);
	}

	private async grantToApiKeysWithUpdate({
		escape,
		runQuery,
		runInBatches,
		parseJson,
		logger,
		migrationName,
	}: MigrationContext) {
		const table = escape.tableName('user_api_keys');
		const idColumn = escape.columnName('id');
		const scopesColumn = escape.columnName('scopes');

		// Rows are filtered in Node rather than SQL: the column is `json` on
		// Postgres and `text` on SQLite, so a portable LIKE would need a cast.
		// ORDER BY keeps LIMIT/OFFSET pages stable while rows are updated mid-scan.
		await runInBatches<ApiKeyRow>(
			`SELECT ${idColumn} AS "id", ${scopesColumn} AS "scopes" FROM ${table} ORDER BY ${idColumn}`,
			async (rows) => {
				for (const row of rows) {
					try {
						const scopes = parseJson<string[]>(row.scopes ?? '[]');
						if (!Array.isArray(scopes)) continue;
						if (!scopes.includes(UPDATE_SCOPE)) continue;
						if (scopes.includes(MANAGE_MEMBERS_SCOPE)) continue;

						await runQuery(
							`UPDATE ${table} SET ${scopesColumn} = :scopes WHERE ${idColumn} = :id`,
							{ scopes: JSON.stringify([...scopes, MANAGE_MEMBERS_SCOPE]), id: row.id },
						);
					} catch (error) {
						logger.warn(
							`[${migrationName}] Could not update scopes for API key ${row.id}: ${(error as Error).message}. Skipping.`,
						);
					}
				}
			},
		);
	}
}
