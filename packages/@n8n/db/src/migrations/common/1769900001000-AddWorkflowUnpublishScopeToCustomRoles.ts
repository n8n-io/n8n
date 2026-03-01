import type { MigrationContext, ReversibleMigration } from '../migration-types';

const PERSONAL_OWNER_ROLE_SLUG = 'project:personalOwner';

function isMySQLOrMariaDB(dbType: string): boolean {
	return dbType === 'mysqldb' || dbType === 'mariadb';
}

/**
 * Adds workflow:unpublish scope to all custom (non-personal-owner) roles that have workflow:publish.
 *
 * This migration ensures backward compatibility after the introduction of the workflow:unpublish scope.
 * Roles that could publish workflows should also be able to unpublish them.
 * project:personalOwner is excluded because it already has workflow:unpublish in its base definition (PERSONAL_PROJECT_OWNER_SCOPES).
 *
 * This migration:
 * 1. Ensures the workflow:unpublish scope exists in the scope table
 * 2. Finds all roles (except project:personalOwner) with workflow:publish and grants workflow:unpublish to them
 *
 * Compatible with SQLite, PostgreSQL, MySQL, and MariaDB.
 */
export class AddWorkflowUnpublishScopeToCustomRoles1769900001000 implements ReversibleMigration {
	async up({ escape, runQuery, dbType }: MigrationContext) {
		const scopeTableName = escape.tableName('scope');
		const scopeSlugColumn = escape.columnName('slug');
		const displayNameColumn = escape.columnName('displayName');
		const descriptionColumn = escape.columnName('description');

		const roleTableName = escape.tableName('role');
		const roleScopeTableName = escape.tableName('role_scope');
		const roleSlugColumn = escape.columnName('slug');
		const roleScopeRoleSlugColumn = escape.columnName('roleSlug');
		const roleScopeScopeSlugColumn = escape.columnName('scopeSlug');

		const dbTypeStr = dbType as string;
		const useInsertIgnore = isMySQLOrMariaDB(dbTypeStr);

		// Step 1: Ensure workflow:unpublish scope exists
		const insertScopeQuery = useInsertIgnore
			? `INSERT IGNORE INTO ${scopeTableName} (${scopeSlugColumn}, ${displayNameColumn}, ${descriptionColumn})
         VALUES (:slug, :displayName, :description)`
			: `INSERT INTO ${scopeTableName} (${scopeSlugColumn}, ${displayNameColumn}, ${descriptionColumn})
         VALUES (:slug, :displayName, :description)
         ON CONFLICT (${scopeSlugColumn}) DO NOTHING`;

		await runQuery(insertScopeQuery, {
			slug: 'workflow:unpublish',
			displayName: 'Unpublish Workflow',
			description: 'Allows unpublishing workflows.',
		});

		// Step 2: Add workflow:unpublish to roles that have workflow:publish, excluding project:personalOwner
		const batchInsertBase = `
		INSERT ${useInsertIgnore ? 'IGNORE ' : ''}INTO ${roleScopeTableName} (${roleScopeRoleSlugColumn}, ${roleScopeScopeSlugColumn})
		SELECT DISTINCT role.${roleSlugColumn}, :unpublishScope
		FROM ${roleTableName} role
		INNER JOIN ${roleScopeTableName} role_scope
			ON role.${roleSlugColumn} = role_scope.${roleScopeRoleSlugColumn}
		WHERE role.${roleSlugColumn} != :personalOwnerSlug
			AND role_scope.${roleScopeScopeSlugColumn} = :publishScope
		`;
		const batchInsertQuery = useInsertIgnore
			? batchInsertBase
			: `${batchInsertBase}
		ON CONFLICT (${roleScopeRoleSlugColumn}, ${roleScopeScopeSlugColumn}) DO NOTHING
		`;

		await runQuery(batchInsertQuery, {
			personalOwnerSlug: PERSONAL_OWNER_ROLE_SLUG,
			publishScope: 'workflow:publish',
			unpublishScope: 'workflow:unpublish',
		});
	}

	async down({ escape, runQuery }: MigrationContext) {
		const roleScopeTableName = escape.tableName('role_scope');
		const roleScopeScopeSlugColumn = escape.columnName('scopeSlug');

		// Remove workflow:unpublish only from roles that are not project:personalOwner
		// (personal owner keeps workflow:unpublish from base definition)
		const deleteQuery = `
			DELETE FROM ${roleScopeTableName}
			WHERE ${roleScopeScopeSlugColumn} = :unpublishScope
		`;

		await runQuery(deleteQuery, {
			unpublishScope: 'workflow:unpublish',
			personalOwnerSlug: PERSONAL_OWNER_ROLE_SLUG,
		});
	}
}
