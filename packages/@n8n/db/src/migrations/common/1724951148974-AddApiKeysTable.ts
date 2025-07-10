import type { ApiKey } from '../../entities';
import { generateNanoId } from '../../utils/generators';
import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddApiKeysTable1724951148974 implements ReversibleMigration {
	async up({
		queryRunner,
		escape,
		runQuery,
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		const userTable = escape.tableName('user');
		const userApiKeysTable = escape.tableName('user_api_keys');
		const userIdColumn = escape.columnName('userId');
		const apiKeyColumn = escape.columnName('apiKey');
		const labelColumn = escape.columnName('label');
		const idColumn = escape.columnName('id');

		// Create the new table
		await createTable('user_api_keys')
			.withColumns(
				column('id').varchar(36).primary,
				column('userId').uuid.notNull,
				column('label').varchar(100).notNull,
				column('apiKey').varchar().notNull,
			)
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['userId', 'label'], true)
			.withIndexOn(['apiKey'], true).withTimestamps;

		const usersWithApiKeys = (await queryRunner.query(
			`SELECT ${idColumn}, ${apiKeyColumn} FROM ${userTable} WHERE ${apiKeyColumn} IS NOT NULL`,
		)) as Array<Partial<ApiKey>>;

		// Move the apiKey from the users table to the new table
		await Promise.all(
			usersWithApiKeys.map(
				async (user: { id: string; apiKey: string }) =>
					await runQuery(
						`INSERT INTO ${userApiKeysTable} (${idColumn}, ${userIdColumn}, ${apiKeyColumn}, ${labelColumn}) VALUES (:id, :userId, :apiKey, :label)`,
						{
							id: generateNanoId(),
							userId: user.id,
							apiKey: user.apiKey,
							label: 'My API Key',
						},
					),
			),
		);

		//  Drop apiKey column on user's table
		await queryRunner.query(`ALTER TABLE ${userTable} DROP COLUMN ${apiKeyColumn};`);
	}

	async down({
		queryRunner,
		runQuery,
		schemaBuilder: { dropTable, addColumns, createIndex, column },
		escape,
		isMysql,
	}: MigrationContext) {
		const userTable = escape.tableName('user');
		const userApiKeysTable = escape.tableName('user_api_keys');
		const apiKeyColumn = escape.columnName('apiKey');
		const userIdColumn = escape.columnName('userId');
		const idColumn = escape.columnName('id');
		const createdAtColumn = escape.columnName('createdAt');

		await addColumns('user', [column('apiKey').varchar()]);

		await createIndex('user', ['apiKey'], true);

		const queryToGetUsersApiKeys = isMysql
			? `
			SELECT ${userIdColumn},
				${apiKeyColumn},
				${createdAtColumn}
			FROM ${userApiKeysTable} u
			WHERE ${createdAtColumn} = (SELECT Min(${createdAtColumn})
																	FROM   ${userApiKeysTable}
																	WHERE  ${userIdColumn} = u.${userIdColumn});`
			: `
				SELECT DISTINCT ON
					(${userIdColumn}) ${userIdColumn},
					${apiKeyColumn}, ${createdAtColumn}
				FROM ${userApiKeysTable}
				ORDER BY ${userIdColumn}, ${createdAtColumn} ASC;`;

		const oldestApiKeysPerUser = (await queryRunner.query(queryToGetUsersApiKeys)) as Array<
			Partial<ApiKey>
		>;

		await Promise.all(
			oldestApiKeysPerUser.map(
				async (user: { userId: string; apiKey: string }) =>
					await runQuery(
						`UPDATE ${userTable} SET ${apiKeyColumn} = :apiKey WHERE ${idColumn} = :userId`,
						user,
					),
			),
		);

		await dropTable('user_api_keys');
	}
}
