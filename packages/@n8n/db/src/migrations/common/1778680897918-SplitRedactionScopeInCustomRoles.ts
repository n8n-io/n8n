import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class SplitRedactionScopeInCustomRoles1778680897918 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const scopeTable = escape.tableName('scope');
		const slugCol = escape.columnName('slug');
		const displayNameCol = escape.columnName('displayName');
		const descriptionCol = escape.columnName('description');

		const roleScopeTable = escape.tableName('role_scope');
		const roleScopeRoleSlugCol = escape.columnName('roleSlug');
		const roleScopeScopeSlugCol = escape.columnName('scopeSlug');

		// Step 1: Insert the two new scope rows (idempotent)
		const insertScope = `
			INSERT INTO ${scopeTable} (${slugCol}, ${displayNameCol}, ${descriptionCol})
			VALUES (:slug, :displayName, :description)
			ON CONFLICT (${slugCol}) DO NOTHING
		`;

		await runQuery(insertScope, {
			slug: 'workflow:enableRedaction',
			displayName: 'Enable Data Redaction',
			description: 'Allows enabling data redaction on workflows.',
		});

		await runQuery(insertScope, {
			slug: 'workflow:disableRedaction',
			displayName: 'Disable Data Redaction',
			description: 'Allows disabling data redaction on workflows.',
		});

		// Step 2: Grant both new scopes to every role that had workflow:updateRedactionSetting
		const grantScope = `
			INSERT INTO ${roleScopeTable} (${roleScopeRoleSlugCol}, ${roleScopeScopeSlugCol})
			SELECT DISTINCT ${roleScopeRoleSlugCol}, :newScope
			FROM ${roleScopeTable}
			WHERE ${roleScopeScopeSlugCol} = :oldScope
			ON CONFLICT (${roleScopeRoleSlugCol}, ${roleScopeScopeSlugCol}) DO NOTHING
		`;

		await runQuery(grantScope, {
			oldScope: 'workflow:updateRedactionSetting',
			newScope: 'workflow:enableRedaction',
		});

		await runQuery(grantScope, {
			oldScope: 'workflow:updateRedactionSetting',
			newScope: 'workflow:disableRedaction',
		});

		// Step 3: Remove the old scope from role_scope (FK must be cleared before scope row)
		await runQuery(`DELETE FROM ${roleScopeTable} WHERE ${roleScopeScopeSlugCol} = :slug`, {
			slug: 'workflow:updateRedactionSetting',
		});

		// Step 4: Remove the old scope row itself — it no longer exists in the application
		await runQuery(`DELETE FROM ${scopeTable} WHERE ${slugCol} = :slug`, {
			slug: 'workflow:updateRedactionSetting',
		});
	}

	async down({ escape, runQuery }: MigrationContext) {
		const scopeTable = escape.tableName('scope');
		const slugCol = escape.columnName('slug');
		const displayNameCol = escape.columnName('displayName');
		const descriptionCol = escape.columnName('description');

		const roleScopeTable = escape.tableName('role_scope');
		const roleScopeRoleSlugCol = escape.columnName('roleSlug');
		const roleScopeScopeSlugCol = escape.columnName('scopeSlug');

		// Step 1: Re-insert the old scope row so the FK constraint is satisfied
		await runQuery(
			`INSERT INTO ${scopeTable} (${slugCol}, ${displayNameCol}, ${descriptionCol})
			 VALUES (:slug, :displayName, :description)
			 ON CONFLICT (${slugCol}) DO NOTHING`,
			{
				slug: 'workflow:updateRedactionSetting',
				displayName: 'Manage Data Redaction',
				description: 'Allows managing data redaction on workflows.',
			},
		);

		// Step 2: Restore workflow:updateRedactionSetting for any role that has either new scope
		await runQuery(
			`INSERT INTO ${roleScopeTable} (${roleScopeRoleSlugCol}, ${roleScopeScopeSlugCol})
			 SELECT DISTINCT ${roleScopeRoleSlugCol}, :oldScope
			 FROM ${roleScopeTable}
			 WHERE ${roleScopeScopeSlugCol} = :enableScope
			    OR ${roleScopeScopeSlugCol} = :disableScope
			 ON CONFLICT (${roleScopeRoleSlugCol}, ${roleScopeScopeSlugCol}) DO NOTHING`,
			{
				oldScope: 'workflow:updateRedactionSetting',
				enableScope: 'workflow:enableRedaction',
				disableScope: 'workflow:disableRedaction',
			},
		);

		// Step 3: Remove the two new scopes from role_scope and scope
		await runQuery(`DELETE FROM ${roleScopeTable} WHERE ${roleScopeScopeSlugCol} = :slug`, {
			slug: 'workflow:enableRedaction',
		});

		await runQuery(`DELETE FROM ${roleScopeTable} WHERE ${roleScopeScopeSlugCol} = :slug`, {
			slug: 'workflow:disableRedaction',
		});

		await runQuery(`DELETE FROM ${scopeTable} WHERE ${slugCol} = :slug`, {
			slug: 'workflow:enableRedaction',
		});

		await runQuery(`DELETE FROM ${scopeTable} WHERE ${slugCol} = :slug`, {
			slug: 'workflow:disableRedaction',
		});
	}
}
