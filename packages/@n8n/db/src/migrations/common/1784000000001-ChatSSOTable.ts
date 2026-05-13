import type { MigrationContext, ReversibleMigration } from '../migration-types';

const chatAuthIdentityTable = 'chat_auth_identity';
const chatClientCodeTable = 'chat_client_code';

export class ChatSSOTable1784000000001 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(chatAuthIdentityTable)
			.withColumns(
				column('userId').uuid.notNull,
				column('providerId').varchar(255).primary.notNull,
				column('providerType').varchar().primary.notNull,
			)
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable(chatClientCodeTable).withColumns(
			column('providerId').varchar(255).primary.notNull,
			column('providerType').varchar().primary.notNull,
			column('codeHash').varchar().notNull,
			column('expiresAt').timestamp().notNull,
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(chatClientCodeTable);
		await dropTable(chatAuthIdentityTable);
	}
}
