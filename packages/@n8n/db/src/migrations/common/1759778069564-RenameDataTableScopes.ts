import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class RenameDataTableScopes1759778069564 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const roleScopeTable = escape.tableName('role_scope');
		const scopeTable = escape.tableName('scope');
		const scopeSlugColumn = escape.columnName('scopeSlug');
		const slugColumn = escape.columnName('slug');

		// Update role_scope table: rename dataStore:* to dataTable:*
		await runQuery(
			`UPDATE ${roleScopeTable} ` +
				`SET ${scopeSlugColumn} = REPLACE(${scopeSlugColumn}, 'dataStore:', 'dataTable:') ` +
				`WHERE ${scopeSlugColumn} LIKE 'dataStore:%'`,
		);

		// Delete obsolete dataStore:* entries from scope table
		await runQuery(`DELETE FROM ${scopeTable} ` + `WHERE ${slugColumn} LIKE 'dataStore:%'`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const roleScopeTable = escape.tableName('role_scope');
		const scopeTable = escape.tableName('scope');
		const scopeSlugColumn = escape.columnName('scopeSlug');
		const slugColumn = escape.columnName('slug');

		// Revert role_scope table: rename dataTable:* back to dataStore:*
		await runQuery(
			`UPDATE ${roleScopeTable} ` +
				`SET ${scopeSlugColumn} = REPLACE(${scopeSlugColumn}, 'dataTable:', 'dataStore:') ` +
				`WHERE ${scopeSlugColumn} LIKE 'dataTable:%'`,
		);

		// Delete dataTable:* entries from scope table
		await runQuery(`DELETE FROM ${scopeTable} ` + `WHERE ${slugColumn} LIKE 'dataTable:%'`);
	}
}
