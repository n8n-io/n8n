import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	sessions: 'chat_sessions',
	messages: 'chat_messages',
	user: 'user',
} as const;

export class CreateChatHubTables1760019379982 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.sessions)
			.withColumns(
				column('id').varchar(36).primary,
				column('name').varchar(256).notNull,
				column('userId').varchar(36).notNull,
				column('lastMessageAt').timestampTimezone(),
			)
			.withForeignKey('userId', {
				tableName: table.user,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable(table.messages)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('sessionId').varchar(36).notNull,
				column('type').varchar(16).notNull, // 'human', 'ai', 'system', 'tool', 'generic'
				column('role').varchar(16), // 'user', 'assistant', 'system', 'tool'
				column('name').varchar(128).notNull,
				column('content').text.notNull,
				column('additionalKwargs').text,
				column('toolCallId').text,
			)
			.withForeignKey('sessionId', {
				tableName: table.sessions,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table.messages);
		await dropTable(table.sessions);
	}
}
