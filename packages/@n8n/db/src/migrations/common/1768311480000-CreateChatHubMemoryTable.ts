import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	memory: 'chat_hub_memory',
	sessions: 'chat_hub_sessions',
	messages: 'chat_hub_messages',
} as const;

/**
 * Creates the chat_hub_memory table for storing agent memory entries
 * separately from chat UI messages. This allows:
 * - Multiple memory nodes in the same workflow to have isolated memory
 * - Separation between what the agent remembers vs what the user sees
 * - Memory branching on edit/retry via turnId correlation
 *
 * The turnId is a correlation ID representing a single request-response execution cycle.
 * It's generated BEFORE workflow execution starts, so it can be used to link memory entries
 * to AI messages without requiring the AI message to exist first (avoiding FK constraint issues).
 *
 * Also makes ownerId nullable in chat_hub_sessions to enable anonymous sessions for:
 * - Manual executions where userId is lost on resume (waiting state)
 * - Public chat triggers (webhooks) with no authenticated user
 */
export class CreateChatHubMemoryTable1768311480000 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, addColumns, column, createIndex, dropNotNull },
		runQuery,
		escape,
	}: MigrationContext) {
		// Create chat_hub_memory table
		await createTable(table.memory)
			.withColumns(
				column('id').uuid.primary.notNull,
				column('sessionId').uuid.notNull,
				column('memoryNodeId').varchar(36).notNull.comment('n8n node ID of the MemoryChatHub node'),
				column('turnId').uuid.comment(
					'Correlation ID linking memory to an AI message turn (no FK constraint)',
				),
				column('role').varchar(16).notNull.comment('Role: "human", "ai", "system", "tool"'),
				column('content').json.notNull,
				column('name').varchar(256).notNull.comment('Actor name, tool name for tool messages'),
			)
			.withForeignKey('sessionId', {
				tableName: table.sessions,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createIndex(table.memory, ['sessionId', 'memoryNodeId', 'turnId']);

		// Add turnId column to chat_hub_messages
		await addColumns(table.messages, [
			column('turnId').uuid.comment('Correlation ID for this execution turn'),
		]);

		// Backfill turnId for existing AI messages using their own message ID
		await runQuery(
			`UPDATE ${escape.tableName(table.messages)} SET ${escape.columnName('turnId')} = ${escape.columnName('id')} WHERE ${escape.columnName('type')} = 'ai'`,
		);

		// Make ownerId nullable to support anonymous chat hub sessions
		await dropNotNull(table.sessions, 'ownerId');
	}

	async down({
		schemaBuilder: { dropTable, dropColumns, dropIndex, addNotNull },
		runQuery,
		escape,
	}: MigrationContext) {
		await runQuery(
			`DELETE FROM ${escape.tableName(table.sessions)} WHERE ${escape.columnName('ownerId')} IS NULL`,
		);
		await addNotNull(table.sessions, 'ownerId');
		await dropColumns(table.messages, ['turnId']);
		await dropIndex(table.memory, ['sessionId', 'memoryNodeId', 'turnId']);
		await dropTable(table.memory);
	}
}
