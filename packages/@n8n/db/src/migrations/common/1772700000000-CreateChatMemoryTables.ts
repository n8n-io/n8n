import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	memory: 'chat_memory',
	memorySessions: 'chat_memory_sessions',
	messages: 'chat_hub_messages',
} as const;

/**
 * Creates the 'chat_memory' and 'chat_memory_sessions' tables for storing persistent
 * agent memory entries from Simple Memory node on n8n's database.
 * - Supporting persistent Simple Memory Node functionality without having to configure external databases.
 * - Memory branching on Workflow Agent's edit/retry via turnId correlation on Chat hub executions.
 * - Access to memory is project scoped, knowing session ID and having execution access to the project is enough.
 */
export class CreateChatMemoryTables1772700000000 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, addColumns, column, createIndex },
		runQuery,
		escape,
	}: MigrationContext) {
		// Create chat_memory_sessions table (parent table for memory sessions)
		await createTable(table.memorySessions)
			.withColumns(
				column('sessionKey')
					.varchar(255)
					.primary.notNull.comment(
						'Unique key for the memory session, referenced by memory entries. User defined.',
					),
				column('projectId').varchar(36).notNull.comment('Project this memory session belongs to'),
				column('workflowId').varchar(36).comment('Workflow that created this session, if known'),
			)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createIndex(table.memorySessions, ['projectId']);

		// Create chat_memory table (to store actual memory entries)
		await createTable(table.memory)
			.withColumns(
				column('id').uuid.primary.notNull,
				column('sessionKey').varchar(255).notNull,
				column('turnId').uuid.comment('Correlation ID linking memory to an AI message turn'),
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
		await dropIndex(table.memorySessions, ['projectId']);
		await dropTable(table.memorySessions);
	}
}
