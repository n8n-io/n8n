import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateChatHubContextMemoryItemsTable1772000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('chat_hub_context_memory_items')
			.withColumns(
				column('id').uuid.primary.notNull,
				column('userId').uuid.notNull,
				column('item').text.notNull,
			)
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['userId']).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('chat_hub_context_memory_items');
	}
}
