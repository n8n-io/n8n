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
 * 2. Finds all project roles with workflow:update scope
 * 3. Grants workflow:publish to those roles
 *
 * Both system roles (managed by code) and custom roles (user-created) are updated.
 */
export class AddWorkflowPublishScopeToProjectRoles1765892113000 implements ReversibleMigration {
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

		// Step 2: Find eligible project roles
		const findEligibleRolesQuery = `
			SELECT DISTINCT role.${roleSlugColumn} as roleSlug
			FROM ${roleTableName} role
			INNER JOIN ${roleScopeTableName} role_scope
				ON role.${roleSlugColumn} = role_scope.${roleScopeRoleSlugColumn}
			WHERE role.${roleTypeColumn} = :roleType
				AND role_scope.${roleScopeScopeSlugColumn} = :updateScope
				AND NOT EXISTS (
					SELECT 1
					FROM ${roleScopeTableName} role_scope_check
					WHERE role_scope_check.${roleScopeRoleSlugColumn} = role.${roleSlugColumn}
						AND role_scope_check.${roleScopeScopeSlugColumn} = :publishScope
				)
		`;

		const rolesToMigrate = await runQuery<Array<{ roleSlug: string }>>(findEligibleRolesQuery, {
			roleType: 'project',
			updateScope: 'workflow:update',
			publishScope: 'workflow:publish',
		});

		logger.info(`Found ${rolesToMigrate.length} project roles requiring workflow:publish scope`);

		if (rolesToMigrate.length === 0) {
			logger.info('No project roles require workflow:publish scope - migration is a no-op');
			return;
		}

		// Step 3: Add workflow:publish to eligible roles
		const insertRoleScopeQuery = `
			INSERT INTO ${roleScopeTableName} (${roleScopeRoleSlugColumn}, ${roleScopeScopeSlugColumn})
         	VALUES (:roleSlug, :scopeSlug)
         	ON CONFLICT (${roleScopeRoleSlugColumn}, ${roleScopeScopeSlugColumn}) DO NOTHING
		`;

		for (const role of rolesToMigrate) {
			await runQuery(insertRoleScopeQuery, {
				roleSlug: role.roleSlug,
				scopeSlug: 'workflow:publish',
			});
		}

		logger.info(`Added workflow:publish scope to ${rolesToMigrate.length} project roles`);
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
