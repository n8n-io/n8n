import type { MigrationContext, ReversibleMigration } from '../migration-types';

const PERSONAL_OWNER_ROLE_SLUG = 'project:personalOwner';

/**
 * Adds workflow:unshare and credential:unshare scopes to all custom roles that have
 * the corresponding share scope (workflow:share / credential:share).
 *
 * This migration ensures backward compatibility after the introduction of separate unshare scopes.
 * Roles that could share resources should also be able to unshare them.
 * project:personalOwner is excluded because it already has unshare scopes in its base definition
 * (PERSONAL_PROJECT_OWNER_SCOPES), which are synced on startup.
 *
 * This migration:
 * 1. Ensures workflow:unshare and credential:unshare scopes exist in the scope table
 * 2. Finds all roles (except project:personalOwner) with the corresponding share scope
 *    and grants the unshare scope to them
 *
 * Compatible with SQLite and PostgreSQL.
 */
export class AddUnshareScopeToCustomRoles1771500000001 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const scopeTableName = escape.tableName('scope');
		const scopeSlugColumn = escape.columnName('slug');
		const displayNameColumn = escape.columnName('displayName');
		const descriptionColumn = escape.columnName('description');

		const roleTableName = escape.tableName('role');
		const roleScopeTableName = escape.tableName('role_scope');
		const roleSlugColumn = escape.columnName('slug');
		const roleScopeRoleSlugColumn = escape.columnName('roleSlug');
		const roleScopeScopeSlugColumn = escape.columnName('scopeSlug');

		// Step 1: Ensure unshare scopes exist
		const insertScopeQuery = `INSERT INTO ${scopeTableName} (${scopeSlugColumn}, ${displayNameColumn}, ${descriptionColumn})
         VALUES (:slug, :displayName, :description)
         ON CONFLICT (${scopeSlugColumn}) DO NOTHING`;

		await runQuery(insertScopeQuery, {
			slug: 'workflow:unshare',
			displayName: 'Unshare Workflow',
			description: 'Allows removing workflow shares.',
		});

		await runQuery(insertScopeQuery, {
			slug: 'credential:unshare',
			displayName: 'Unshare Credential',
			description: 'Allows removing credential shares.',
		});

		// Step 2: Add unshare scopes to roles that have the corresponding share scope,
		// excluding project:personalOwner (gets it from startup sync)
		const batchInsertQuery = `
		INSERT INTO ${roleScopeTableName} (${roleScopeRoleSlugColumn}, ${roleScopeScopeSlugColumn})
		SELECT DISTINCT role.${roleSlugColumn}, :unshareScope
		FROM ${roleTableName} role
		INNER JOIN ${roleScopeTableName} role_scope
			ON role.${roleSlugColumn} = role_scope.${roleScopeRoleSlugColumn}
		WHERE role.${roleSlugColumn} != :personalOwnerSlug
			AND role_scope.${roleScopeScopeSlugColumn} = :shareScope
		ON CONFLICT (${roleScopeRoleSlugColumn}, ${roleScopeScopeSlugColumn}) DO NOTHING
		`;

		await runQuery(batchInsertQuery, {
			personalOwnerSlug: PERSONAL_OWNER_ROLE_SLUG,
			shareScope: 'workflow:share',
			unshareScope: 'workflow:unshare',
		});

		await runQuery(batchInsertQuery, {
			personalOwnerSlug: PERSONAL_OWNER_ROLE_SLUG,
			shareScope: 'credential:share',
			unshareScope: 'credential:unshare',
		});
	}

	async down({ escape, runQuery }: MigrationContext) {
		const roleScopeTableName = escape.tableName('role_scope');
		const roleScopeScopeSlugColumn = escape.columnName('scopeSlug');

		const deleteQuery = `
			DELETE FROM ${roleScopeTableName}
			WHERE ${roleScopeScopeSlugColumn} = :unshareScope
		`;

		await runQuery(deleteQuery, { unshareScope: 'workflow:unshare' });
		await runQuery(deleteQuery, { unshareScope: 'credential:unshare' });
	}
}
