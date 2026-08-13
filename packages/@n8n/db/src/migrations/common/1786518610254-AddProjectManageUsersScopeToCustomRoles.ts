import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Granting a project role used to ride on `project:update`. It now has its own
 * `project:manageUsers` scope, so custom project roles that could manage members
 * before must keep being able to, otherwise member management silently stops
 * working for them on upgrade.
 *
 * System roles are excluded: their scopes are reconciled from code on every
 * startup (AuthRolesService), so touching them here would only be undone.
 *
 * The scope row is inserted first because `role_scope.scopeSlug` references it,
 * and the startup sync that would normally create it runs after migrations.
 *
 * Compatible with SQLite and PostgreSQL.
 */
export class AddProjectManageUsersScopeToCustomRoles1786518610254 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const scopeTable = escape.tableName('scope');
		const scopeSlug = escape.columnName('slug');
		const displayName = escape.columnName('displayName');
		const description = escape.columnName('description');

		await runQuery(
			`INSERT INTO ${scopeTable} (${scopeSlug}, ${displayName}, ${description})
			 VALUES ('project:manageUsers', 'Manage Project Members', 'Allows adding members to a project, changing a member''s project role, and removing members.')
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
			 SELECT DISTINCT role.${roleSlug}, 'project:manageUsers'
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

	async down({ escape, runQuery }: MigrationContext) {
		const roleScopeTable = escape.tableName('role_scope');
		const mappedScopeSlug = escape.columnName('scopeSlug');

		await runQuery(
			`DELETE FROM ${roleScopeTable} WHERE ${mappedScopeSlug} = 'project:manageUsers'`,
		);
	}
}
