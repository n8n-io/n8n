import type { MigrationContext, ReversibleMigration } from '../migration-types';

const GLOBAL_ROLE_SLUGS = ['global:owner', 'global:admin', 'global:member'] as const;

export class AddInsightsReadScopeToApiKeyRoles1775000000000 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const scopeTableName = escape.tableName('scope');
		const scopeSlugColumn = escape.columnName('slug');
		const displayNameColumn = escape.columnName('displayName');
		const descriptionColumn = escape.columnName('description');

		const roleScopeTableName = escape.tableName('role_scope');
		const roleScopeRoleSlugColumn = escape.columnName('roleSlug');
		const roleScopeScopeSlugColumn = escape.columnName('scopeSlug');

		const insertScopeQuery = `INSERT INTO ${scopeTableName} (${scopeSlugColumn}, ${displayNameColumn}, ${descriptionColumn})
		VALUES (:slug, :displayName, :description)
		ON CONFLICT (${scopeSlugColumn}) DO NOTHING`;

		await runQuery(insertScopeQuery, {
			slug: 'insights:read',
			displayName: 'Read Insights',
			description: 'Allows reading insights data.',
		});

		const insertRoleScopeQuery = `INSERT INTO ${roleScopeTableName} (${roleScopeRoleSlugColumn}, ${roleScopeScopeSlugColumn})
		VALUES (:roleSlug, :scopeSlug)
		ON CONFLICT (${roleScopeRoleSlugColumn}, ${roleScopeScopeSlugColumn}) DO NOTHING`;

		for (const roleSlug of GLOBAL_ROLE_SLUGS) {
			await runQuery(insertRoleScopeQuery, {
				roleSlug,
				scopeSlug: 'insights:read',
			});
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const scopeTableName = escape.tableName('scope');
		const scopeSlugColumn = escape.columnName('slug');

		const roleScopeTableName = escape.tableName('role_scope');
		const roleScopeRoleSlugColumn = escape.columnName('roleSlug');
		const roleScopeScopeSlugColumn = escape.columnName('scopeSlug');

		const deleteRoleScopeQuery = `DELETE FROM ${roleScopeTableName}
		WHERE ${roleScopeScopeSlugColumn} = :scopeSlug
			AND ${roleScopeRoleSlugColumn} = :roleSlug`;

		for (const roleSlug of GLOBAL_ROLE_SLUGS) {
			await runQuery(deleteRoleScopeQuery, {
				scopeSlug: 'insights:read',
				roleSlug,
			});
		}

		const deleteScopeQuery = `DELETE FROM ${scopeTableName}
		WHERE ${scopeSlugColumn} = :scopeSlug
			AND NOT EXISTS (
				SELECT 1 FROM ${roleScopeTableName}
				WHERE ${roleScopeScopeSlugColumn} = :scopeSlug
			)`;

		await runQuery(deleteScopeQuery, {
			scopeSlug: 'insights:read',
		});
	}
}
