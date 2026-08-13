import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Adds workflow:publish scope to all existing project roles that have workflow:update.
 *
 * This migration ensures backward compatibility after the introduction of the workflow:publish project scope.
 * Previously, only workflow:update was required for publishing workflows.
 * Now, a dedicated workflow:publish scope is required instead.
 *
 * This migration:
 * 1. Ensures the workflow:publish scope exists in the scope table
 * 2. Finds all project roles with workflow:update scope and grants workflow:publish to them
 *
 * Both system roles (managed by code) and custom roles (user-created) are updated.
 */
export class AddWorkflowPublishScopeToProjectRoles1766064542000 implements ReversibleMigration {
	async up({ escape, runQuery, logger }: MigrationContext) {
		const scopeTableName = escape.tableName('scope');
		const scopeSlugColumn = escape.columnName('slug');
		const displayNameColumn = escape.columnName('displayName');
		const descriptionColumn = escape.columnName('description');

		const roleTableName = escape.tableName('role');
		const roleScopeTableName = escape.tableName('role_scope');
		const roleSlugColumn = escape.columnName('slug');
		const roleTypeColumn = escape.columnName('roleType');
		const roleScopeRoleSlugColumn = escape.columnName('roleSlug');
		const roleScopeScopeSlugColumn = escape.columnName('scopeSlug');

		// Step 1: Ensure workflow:publish scope exists
		const insertScopeQuery = `INSERT INTO ${scopeTableName} (${scopeSlugColumn}, ${displayNameColumn}, ${descriptionColumn})
         VALUES (:slug, :displayName, :description)
         ON CONFLICT (${scopeSlugColumn}) DO NOTHING`;

		await runQuery(insertScopeQuery, {
			slug: 'workflow:publish',
			displayName: 'Publish Workflow',
			description: 'Allows publishing and unpublishing workflows.',
		});

		logger.debug('Ensured workflow:publish scope exists');

		// Step 2: Add workflow:publish to eligible project roles (batch operation)
		const batchInsertQuery = `
		INSERT INTO ${roleScopeTableName} (${roleScopeRoleSlugColumn}, ${roleScopeScopeSlugColumn})
		SELECT DISTINCT role.${roleSlugColumn}, :publishScope
		FROM ${roleTableName} role
		INNER JOIN ${roleScopeTableName} role_scope
			ON role.${roleSlugColumn} = role_scope.${roleScopeRoleSlugColumn}
		WHERE role.${roleTypeColumn} = :roleType
			AND role_scope.${roleScopeScopeSlugColumn} = :updateScope
		ON CONFLICT (${roleScopeRoleSlugColumn}, ${roleScopeScopeSlugColumn}) DO NOTHING
	`;

		await runQuery(batchInsertQuery, {
			roleType: 'project',
			updateScope: 'workflow:update',
			publishScope: 'workflow:publish',
		});

		logger.info('Added workflow:publish scope to project roles with workflow:update');
	}

	async down({ escape, runQuery, logger }: MigrationContext) {
		const roleScopeTableName = escape.tableName('role_scope');
		const roleScopeScopeSlugColumn = escape.columnName('scopeSlug');

		// Remove all workflow:publish scopes from all roles
		// Since the up migration only adds workflow:publish to roles with workflow:update,
		// all workflow:publish scopes can be safely removed to revert the migration.
		const deleteQuery = `
			DELETE FROM ${roleScopeTableName}
			WHERE ${roleScopeScopeSlugColumn} = :publishScope
		`;

		await runQuery(deleteQuery, {
			publishScope: 'workflow:publish',
		});

		logger.info('Removed workflow:publish scope from all roles');
	}
}
