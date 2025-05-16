import type { GlobalRole } from '@n8n/permissions';
import { getApiKeyScopesForRole } from '@n8n/permissions';

import { ApiKey } from '../../entities';
import type { MigrationContext, ReversibleMigration } from '../migration-types';

type ApiKeyWithRole = { id: string; role: GlobalRole };

export class AddScopesColumnToApiKeys1742918400000 implements ReversibleMigration {
	async up({
		runQuery,
		escape,
		queryRunner,
		schemaBuilder: { addColumns, column },
	}: MigrationContext) {
		await addColumns('user_api_keys', [column('scopes').json]);

		const userApiKeysTable = escape.tableName('user_api_keys');
		const userTable = escape.tableName('user');
		const idColumn = escape.columnName('id');
		const userIdColumn = escape.columnName('userId');
		const roleColumn = escape.columnName('role');

		const apiKeysWithRoles = await runQuery<ApiKeyWithRole[]>(
			`SELECT ${userApiKeysTable}.${idColumn} AS id, ${userTable}.${roleColumn} AS role FROM ${userApiKeysTable} JOIN ${userTable} ON ${userTable}.${idColumn} = ${userApiKeysTable}.${userIdColumn}`,
		);

		for (const { id, role } of apiKeysWithRoles) {
			const scopes = getApiKeyScopesForRole(role);
			await queryRunner.manager.update(ApiKey, { id }, { scopes });
		}
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('user_api_keys', ['scopes']);
	}
}
