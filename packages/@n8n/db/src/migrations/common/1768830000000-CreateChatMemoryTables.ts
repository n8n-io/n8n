import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	memory: 'chat_memory',
	memorySessions: 'chat_memory_sessions',
	chatHubSessions: 'chat_hub_sessions',
	messages: 'chat_hub_messages',
} as const;

/**
 * Creates the chat_memory and chat_memory_sessions tables for storing agent memory entries
 * separately from chat UI messages. This allows:
 * - Supporting persistent Simple Memory Node functionality without Chat hub in the mix
 * - Separation between what the agent remembers vs what the user sees
 * - Memory branching on edit/retry via turnId correlation on Chat hub
 * - Flexible formats for session IDs (not just UUIDs)
 *
 * The turnId is a correlation ID representing a single request-response execution cycle.
 * It's generated before workflow execution starts, so it can be used to link memory entries
 * to AI messages without requiring the AI message to exist first (avoiding FK constraint issues).
 */
export class CreateChatMemoryTables1768830000000 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, addColumns, column, createIndex },
		runQuery,
		escape,
	}: MigrationContext) {
		// Create chat_memory_sessions table (parent table for memory sessions)
		await createTable(table.memorySessions)
			.withColumns(
				column('sessionKey').varchar(255).primary.notNull,
				column('chatHubSessionId').uuid.comment(
					'Optional link to chat_hub_sessions for chat hub context',
				),
				column('workflowId').varchar(36).comment('Which workflow created this session, if known'),
			)
			.withForeignKey('chatHubSessionId', {
				tableName: table.chatHubSessions,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		// Create chat_memory table (to store actual memory entries)
		await createTable(table.memory)
			.withColumns(
				column('id').uuid.primary.notNull,
				column('sessionKey').varchar(255).notNull,
				column('turnId').uuid.comment(
					'Correlation ID linking memory to an AI message turn (no FK constraint)',
				),
				column('role')
					.varchar(16)
					.notNull.comment('ChatMemoryRole: "human", "ai", "system", "tool"'),
				column('content').json.notNull,
				column('name').varchar(255).notNull.comment('Actor name, tool name for tool messages'),
				column('expiresAt')
					.timestampTimezone()
					.comment('Optional expiration timestamp after which entry will be deleted'),
			)
			.withForeignKey('sessionKey', {
				tableName: table.memorySessions,
				columnName: 'sessionKey',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createIndex(table.memory, ['sessionKey', 'turnId']);

		// Add turnId column to chat_hub_messages
		await addColumns(table.messages, [
			column('turnId').uuid.comment('Correlation ID for this execution turn'),
		]);

		// Backfill turnId for existing AI messages using their own message ID
		await runQuery(
			`UPDATE ${escape.tableName(table.messages)} SET ${escape.columnName('turnId')} = ${escape.columnName('id')} WHERE ${escape.columnName('type')} = 'ai'`,
		);
	}

	async down({ schemaBuilder: { dropTable, dropColumns, dropIndex } }: MigrationContext) {
		await dropColumns(table.messages, ['turnId']);
		await dropIndex(table.memory, ['sessionKey', 'turnId']);
		await dropTable(table.memory);
		await dropTable(table.memorySessions);
	}
}
