import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Safe testing: mark the threads of test chats, so every later turn and resume
 * of a test chat is a test run. Plain ALTER TABLE on both dialects, because
 * recreating the table on SQLite would cascade-delete its agent_execution rows.
 */
export class AddTestChatToAgentExecutionThreads1794583011921 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const threads = escape.tableName('agent_execution_threads');
		const testChat = escape.columnName('testChat');

		await runQuery(`ALTER TABLE ${threads} ADD COLUMN ${testChat} boolean NOT NULL DEFAULT false`);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${threads}.${testChat} IS 'True for a test chat: its tool calls go to a simulation, not to real services.'`,
			);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('agent_execution_threads')} DROP COLUMN ${escape.columnName('testChat')}`,
		);
	}
}
