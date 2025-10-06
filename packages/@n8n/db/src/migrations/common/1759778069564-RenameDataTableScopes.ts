import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class RenameDataTableScopes1759778069564 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const roleScopeTable = escape.tableName('role_scope');
		const scopeTable = escape.tableName('scope');
		const scopeSlugColumn = escape.columnName('scopeSlug');
		const slugColumn = escape.columnName('slug');

		const updateQuery = `UPDATE ${roleScopeTable} SET ${scopeSlugColumn} = REPLACE(${scopeSlugColumn}, 'dataStore:', 'dataTable:') WHERE ${scopeSlugColumn} LIKE 'dataStore:%';`;

		const updateResult = await runQuery(updateQuery);

		const deleteQuery = `DELETE FROM ${scopeTable} WHERE ${slugColumn} LIKE 'dataStore:%';`;

		const deleteResult = await runQuery(deleteQuery);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const roleScopeTable = escape.tableName('role_scope');
		const scopeTable = escape.tableName('scope');
		const scopeSlugColumn = escape.columnName('scopeSlug');
		const slugColumn = escape.columnName('slug');

		const updateQuery = `UPDATE ${roleScopeTable} SET ${scopeSlugColumn} = REPLACE(${scopeSlugColumn}, 'dataTable:', 'dataStore:') WHERE ${scopeSlugColumn} LIKE 'dataTable:%';`;

		const updateResult = await runQuery(updateQuery);

		const deleteQuery = `DELETE FROM ${scopeTable} WHERE ${slugColumn} LIKE 'dataTable:%';`;

		const deleteResult = await runQuery(deleteQuery);
	}
}
