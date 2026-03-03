import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateChatHubContextMemoryItemsTable1772000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('chat_hub_context_memory_items')
			.withColumns(
				column('id').uuid.primary.notNull,
				column('userId').uuid.notNull,
				column('sessionId').uuid.notNull,
				column('messageId').uuid.notNull,
				column('item').text.notNull,
			)
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('sessionId', {
				tableName: 'chat_hub_sessions',
				columnName: 'id',
			})
			.withForeignKey('messageId', {
				tableName: 'chat_hub_messages',
				columnName: 'id',
			})
			.withIndexOn(['userId']).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('chat_hub_context_memory_items');
	}
}
