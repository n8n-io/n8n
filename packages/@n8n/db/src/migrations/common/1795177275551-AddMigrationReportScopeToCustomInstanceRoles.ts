import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * `breakingChanges:list` (the Migration Report) is now a baseline scope that every
 * instance role carries, as the built-in Member role does. The role service adds
 * baseline scopes only when a role is saved, so this grants it to custom instance
 * roles that already exist.
 *
 * System roles are excluded: their scopes are reconciled from code on every
 * startup (AuthRolesService), so touching them here would only be undone.
 *
 * The scope row is inserted first because `role_scope.scopeSlug` references it,
 * and the startup sync that would normally create it runs after migrations.
 *
 * Irreversible: a faithful `down()` would have to know which roles already
 * carried the scope before this ran, and that state isn't captured.
 *
 * Compatible with SQLite and PostgreSQL.
 */
export class AddMigrationReportScopeToCustomInstanceRoles1795177275551
	implements IrreversibleMigration
{
	async up({ escape, runQuery }: MigrationContext) {
		const scopeTable = escape.tableName('scope');
		const scopeSlug = escape.columnName('slug');
		const displayName = escape.columnName('displayName');
		const description = escape.columnName('description');

		await runQuery(
			`INSERT INTO ${scopeTable} (${scopeSlug}, ${displayName}, ${description})
			 VALUES ('breakingChanges:list', 'breakingChanges:list', NULL)
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
			 SELECT role.${roleSlug}, 'breakingChanges:list'
			 FROM ${roleTable} role
			 WHERE role.${roleType} = 'global'
			   AND role.${systemRole} = :isSystemRole
			 ON CONFLICT (${mappedRoleSlug}, ${mappedScopeSlug}) DO NOTHING`,
			{ isSystemRole: false },
		);
	}
}
