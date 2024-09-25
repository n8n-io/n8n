import type { MigrationContext } from '@/databases/types';
import { generateNanoId } from '@/databases/utils/generators';

export class AddApiKeysTable1724951148974 {
	async up({ queryRunner, escape, schemaBuilder: { createTable, column } }: MigrationContext) {
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
			`SELECT id, "apiKey", 'My API Key' FROM ${userTable}user WHERE ${apiKeyColumn} IS NOT NULL`,
		)) as Array<{ id: string; apiKey: string }>;

		// Move the apiKey from the users table to the new table

		usersWithApiKeys.forEach(async (user: { id: string; apiKey: string }) => {
			await queryRunner.query(`INSERT INTO ${userApiKeysTable} ("id", "userId", "apiKey", label) VALUES (${generateNanoId()}, '${user.id}', '${user.apiKey}', 'My API Key')
		`);
		});

		await queryRunner.query(`
			INSERT INTO ${userApiKeysTable} (${userIdColumn}, ${apiKeyColumn}, ${labelColumn})
			SELECT ${idColumn}, ${apiKeyColumn}, 'My API Key' FROM ${userTable} WHERE ${apiKeyColumn} IS NOT NULL;
		`);

		//  Drop apiKey column on user's table
		await queryRunner.query(`ALTER TABLE ${userTable} DROP COLUMN ${apiKeyColumn};`);
	}
}
