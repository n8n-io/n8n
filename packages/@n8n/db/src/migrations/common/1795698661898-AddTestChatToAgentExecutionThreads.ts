import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Safe testing: mark the threads of test chats, so every later turn and resume
 * of a test chat is a test run. Plain ALTER TABLE on both dialects, because
 * recreating the table on SQLite would cascade-delete its agent_execution rows.
 */
export class AddTestChatToAgentExecutionThreads1795698661898 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const threads = escape.tableName('agent_execution_threads');
		const isTestChat = escape.columnName('isTestChat');

		await runQuery(
			`ALTER TABLE ${threads} ADD COLUMN ${isTestChat} boolean NOT NULL DEFAULT false`,
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${threads}.${isTestChat} IS 'True for a test chat: its tool calls go to a simulation, not to real services.'`,
			);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		// A revert only drops the marker and keeps the test threads. Deleting them would
		// also delete their chat history and executions, which is worse data loss.
		// After a new upgrade, these threads are real chats again.
		await runQuery(
			`ALTER TABLE ${escape.tableName('agent_execution_threads')} DROP COLUMN ${escape.columnName('isTestChat')}`,
		);
	}
}
