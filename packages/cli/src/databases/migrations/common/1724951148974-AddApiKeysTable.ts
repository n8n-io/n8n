import type { MigrationContext } from '@/databases/types';

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

		// Move the apiKey from the users table to the new table
		await queryRunner.query(`
			INSERT INTO ${userApiKeysTable} (${userIdColumn}, ${apiKeyColumn}, ${labelColumn})
			SELECT ${idColumn}, ${apiKeyColumn}, 'My API Key' FROM ${userTable} WHERE ${apiKeyColumn} IS NOT NULL;
		`);

		//  Drop apiKey column on user's table
		await queryRunner.query(`ALTER TABLE ${userTable} DROP COLUMN ${apiKeyColumn};`);
	}
}
