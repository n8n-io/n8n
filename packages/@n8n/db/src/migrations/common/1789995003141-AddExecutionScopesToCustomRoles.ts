import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const executionScopes = [
	{
		slug: 'execution:read',
		displayName: 'View Execution',
		description: 'Allows viewing executions of workflows the role can view.',
	},
	{
		slug: 'execution:list',
		displayName: 'List Executions',
		description: 'Allows listing executions of workflows the role can view.',
	},
	{
		slug: 'execution:delete',
		displayName: 'Delete Execution',
		description: 'Allows deleting executions of workflows in the project.',
	},
];

/**
 * Executions get their own project-role scopes. Custom project roles receive
 * the ones their existing workflow scopes implied before this release, so no
 * role loses an ability on upgrade:
 * - `execution:read` and `execution:list` for roles that hold `workflow:read`.
 *   Viewing executions was gated on `workflow:read`; it is now gated on
 *   `execution:read`.
 * - `execution:delete` for roles that hold `workflow:execute` or
 *   `workflow:delete`. Deleting executions was gated on `workflow:execute` in
 *   the editor and on `workflow:delete` in the public API; it is now gated on
 *   `execution:delete`.
 *
 * System roles are excluded: their scopes are reconciled from code on every
 * startup (AuthRolesService), so touching them here would only be undone.
 *
 * The scope rows are inserted first because `role_scope.scopeSlug` references
 * them, and the startup sync that would normally create them runs after
 * migrations.
 *
 * Irreversible: a faithful `down()` would have to know which role_scope rows
 * already carried these scopes before this ran, and that state isn't captured.
 *
 * Compatible with SQLite and PostgreSQL.
 */
export class AddExecutionScopesToCustomRoles1789995003141 implements IrreversibleMigration {
	async up(ctx: MigrationContext) {
		await this.ensureScopes(ctx);
		await this.grantToCustomProjectRoles(
			ctx,
			['workflow:read'],
			['execution:read', 'execution:list'],
		);
		await this.grantToCustomProjectRoles(
			ctx,
			['workflow:execute', 'workflow:delete'],
			['execution:delete'],
		);
	}

	private async ensureScopes({ escape, runQuery }: MigrationContext) {
		const scopeTable = escape.tableName('scope');
		const slug = escape.columnName('slug');
		const displayName = escape.columnName('displayName');
		const description = escape.columnName('description');

		for (const scope of executionScopes) {
			await runQuery(
				`INSERT INTO ${scopeTable} (${slug}, ${displayName}, ${description})
				 VALUES (:slug, :displayName, :description)
				 ON CONFLICT (${slug}) DO NOTHING`,
				scope,
			);
		}
	}

	/** Grants each scope in `granted` to every custom project role that holds any scope in `holding`. */
	private async grantToCustomProjectRoles(
		{ escape, runQuery }: MigrationContext,
		holding: string[],
		granted: string[],
	) {
		const roleTable = escape.tableName('role');
		const roleScopeTable = escape.tableName('role_scope');
		const roleSlug = escape.columnName('slug');
		const roleType = escape.columnName('roleType');
		const systemRole = escape.columnName('systemRole');
		const mappedRoleSlug = escape.columnName('roleSlug');
		const mappedScopeSlug = escape.columnName('scopeSlug');

		// Scope slugs are migration constants, not user input, so they are inlined.
		const holdingList = holding.map((scope) => `'${scope}'`).join(', ');

		for (const scope of granted) {
			// systemRole is bound as a parameter so the driver renders the boolean the
			// way each engine expects (Postgres `false` vs SQLite `0`).
			await runQuery(
				`INSERT INTO ${roleScopeTable} (${mappedRoleSlug}, ${mappedScopeSlug})
				 SELECT DISTINCT role.${roleSlug}, '${scope}'
				 FROM ${roleTable} role
				 INNER JOIN ${roleScopeTable} role_scope
				   ON role.${roleSlug} = role_scope.${mappedRoleSlug}
				 WHERE role.${roleType} = 'project'
				   AND role.${systemRole} = :isSystemRole
				   AND role_scope.${mappedScopeSlug} IN (${holdingList})
				 ON CONFLICT (${mappedRoleSlug}, ${mappedScopeSlug}) DO NOTHING`,
				{ isSystemRole: false },
			);
		}
	}
}
