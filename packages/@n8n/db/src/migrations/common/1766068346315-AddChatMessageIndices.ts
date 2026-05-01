import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddChatMessageIndices1766068346315 implements ReversibleMigration {
	async up({ schemaBuilder: { addNotNull }, runQuery, escape }: MigrationContext) {
		const sessionsTable = escape.tableName('chat_hub_sessions');
		const idColumn = escape.columnName('id');
		const createdAtColumn = escape.columnName('createdAt');
		const ownerIdColumn = escape.columnName('ownerId');
		const lastMessageAtColumn = escape.columnName('lastMessageAt');

		const messagesTable = escape.tableName('chat_hub_messages');
		const sessionIdColumn = escape.columnName('sessionId');

		// Backfill lastMessageAt for existing rows to allow adding a NOT NULL constraint
		await runQuery(
			`UPDATE ${sessionsTable}
			SET ${lastMessageAtColumn} = ${createdAtColumn}
			WHERE ${lastMessageAtColumn} IS NULL`,
		);

		await addNotNull('chat_hub_sessions', 'lastMessageAt');

		// Index intended for faster sessionRepository.getManyByUserId queries
		await runQuery(
			`CREATE INDEX IF NOT EXISTS ${escape.indexName('chat_hub_sessions_owner_lastmsg_id')}
			ON ${sessionsTable}(${ownerIdColumn}, ${lastMessageAtColumn} DESC, ${idColumn})`,
		);

		// Index intended for faster sessionRepository.getOneByIdAndUserId queries and joins
		await runQuery(
			`CREATE INDEX IF NOT EXISTS ${escape.indexName('chat_hub_messages_sessionId')}
			ON ${messagesTable}(${sessionIdColumn})`,
		);
	}

	async down({ schemaBuilder: { dropNotNull }, runQuery, escape }: MigrationContext) {
		await runQuery(
			`DROP INDEX IF EXISTS ${escape.indexName('chat_hub_sessions_owner_lastmsg_id')}`,
		);
		await runQuery(`DROP INDEX IF EXISTS ${escape.indexName('chat_hub_messages_sessionId')}`);

		await dropNotNull('chat_hub_sessions', 'lastMessageAt');
	}
}
