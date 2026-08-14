import type { MigrationContext, ReversibleMigration } from '../migration-types';

const PERSONAL_OWNER_ROLE_SLUG = 'project:personalOwner';
const OLD_SCOPE = 'workflow:updateRedactionSetting';
const NEW_SCOPES = ['workflow:enableRedaction', 'workflow:disableRedaction'] as const;

/**
 * Grants the two new redaction scopes (workflow:enableRedaction,
 * workflow:disableRedaction) to every custom role that previously held the
 * combined workflow:updateRedactionSetting scope.
 *
 * This migration:
 *   1. Ensures the two new scopes exist in the scope table.
 *   2. Grants both new scopes to any role (except project:personalOwner) that
 *      currently has workflow:updateRedactionSetting in role_scope.
 *
 * Note: the obsolete workflow:updateRedactionSetting row in the scope table
 * is removed by AuthRolesService at startup, so this migration does not
 * delete it.
 *
 * Compatible with SQLite and PostgreSQL.
 */
export class SplitRedactionScopeInCustomRoles1784000000013 implements ReversibleMigration {
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

		const insertScopeQuery = `INSERT INTO ${scopeTableName} (${scopeSlugColumn}, ${displayNameColumn}, ${descriptionColumn})
         VALUES (:slug, :displayName, :description)
         ON CONFLICT (${scopeSlugColumn}) DO NOTHING`;

		await runQuery(insertScopeQuery, {
			slug: 'workflow:enableRedaction',
			displayName: 'Enable Workflow Data Redaction',
			description: 'Allows enabling data redaction on workflows.',
		});

		await runQuery(insertScopeQuery, {
			slug: 'workflow:disableRedaction',
			displayName: 'Disable Workflow Data Redaction',
			description: 'Allows disabling data redaction on workflows.',
		});

		const batchInsertQuery = `
		INSERT INTO ${roleScopeTableName} (${roleScopeRoleSlugColumn}, ${roleScopeScopeSlugColumn})
		SELECT DISTINCT role.${roleSlugColumn}, :newScope
		FROM ${roleTableName} role
		INNER JOIN ${roleScopeTableName} role_scope
			ON role.${roleSlugColumn} = role_scope.${roleScopeRoleSlugColumn}
		WHERE role.${roleSlugColumn} != :personalOwnerSlug
			AND role_scope.${roleScopeScopeSlugColumn} = :oldScope
		ON CONFLICT (${roleScopeRoleSlugColumn}, ${roleScopeScopeSlugColumn}) DO NOTHING
		`;

		for (const newScope of NEW_SCOPES) {
			await runQuery(batchInsertQuery, {
				personalOwnerSlug: PERSONAL_OWNER_ROLE_SLUG,
				oldScope: OLD_SCOPE,
				newScope,
			});
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const roleScopeTableName = escape.tableName('role_scope');
		const roleScopeScopeSlugColumn = escape.columnName('scopeSlug');

		const deleteQuery = `
			DELETE FROM ${roleScopeTableName}
			WHERE ${roleScopeScopeSlugColumn} = :scope
		`;

		for (const newScope of NEW_SCOPES) {
			await runQuery(deleteQuery, { scope: newScope });
		}
	}
}
