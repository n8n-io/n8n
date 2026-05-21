import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Migration to remove insights:read scope from API keys that have been created
 * by members in n8n versions spanning 2.16.x to 2.22.x.
 * See https://github.com/n8n-io/n8n/pull/27868 and https://github.com/n8n-io/n8n/pull/30778
 */
export class RemoveInsightsReadScopeFromMemberApiKeys1784000000009
	implements IrreversibleMigration
{
	async up(ctx: MigrationContext) {
		const { queryRunner, escape } = ctx;
		const userApiKeysTable = escape.tableName('user_api_keys');
		const userTable = escape.tableName('user');
		const userIdCol = escape.columnName('userId');
		const scopesCol = escape.columnName('scopes');
		const roleSlugCol = escape.columnName('roleSlug');
		const idCol = escape.columnName('id');
		const createdAtCol = escape.columnName('createdAt');

		const matchingKeys = await ctx.runQuery<Array<{ id: string }>>(`
			SELECT ${userApiKeysTable}.${idCol}
			FROM ${userApiKeysTable}
			JOIN ${userTable} ON ${userApiKeysTable}.${userIdCol} = ${userTable}.${idCol}
			WHERE ${userTable}.${roleSlugCol} = 'global:member'
			AND ${userApiKeysTable}.${createdAtCol} >= '2026-04-06'
			AND EXISTS (
				SELECT 1 FROM json_each(${userApiKeysTable}.${scopesCol}) WHERE value = 'insights:read'
			)
		`);

		if (matchingKeys.length === 0) {
			return;
		}

		const ids = matchingKeys.map((k) => `'${k.id}'`).join(', ');

		await queryRunner.query(`
			UPDATE ${userApiKeysTable}
			SET ${scopesCol} = (
				SELECT COALESCE(json_group_array(value), '[]')
				FROM json_each(${userApiKeysTable}.${scopesCol})
				WHERE value != 'insights:read'
			)
			WHERE ${idCol} IN (${ids})
		`);
	}
}
