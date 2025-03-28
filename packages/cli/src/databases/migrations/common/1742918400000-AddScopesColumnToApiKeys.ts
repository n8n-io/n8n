import type { GlobalRole } from '@n8n/permissions';

import type { MigrationContext, ReversibleMigration } from '@/databases/types';
import { getApiKeyScopesForRole } from '@/public-api/permissions.ee';

type ApiKeyWithRole = { id: string; role: GlobalRole };

export class AddScopesColumnToApiKeys1742918400000 implements ReversibleMigration {
	async up({ runQuery, escape, schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('user_api_keys', [column('scopes').json]);

		const userApiKeysTable = escape.tableName('user_api_keys');
		const userTable = escape.tableName('user');
		const idColumn = escape.columnName('id');
		const userIdColumn = escape.columnName('userId');
		const roleColumn = escape.columnName('role');
		const scopesColumn = escape.columnName('scopes');

		const apiKeysWithRoles = await runQuery<ApiKeyWithRole[]>(
			`SELECT ${userApiKeysTable}.${idColumn} AS id, ${userTable}.${roleColumn} AS role FROM ${userApiKeysTable} JOIN ${userTable} ON ${userTable}.${idColumn} = ${userApiKeysTable}.${userIdColumn}`,
		);

		for (const { id, role } of apiKeysWithRoles) {
			const scopes = JSON.stringify(getApiKeyScopesForRole(role));

			await runQuery(
				`UPDATE ${userApiKeysTable} SET ${scopesColumn} = '${scopes}' WHERE ${idColumn} = "${id}"`,
			);
		}
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('user_api_keys', ['scopes']);
	}
}
