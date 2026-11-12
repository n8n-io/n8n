import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Safe testing: keep the test chat marker and the simulated world on the
 * thread. Plain ALTER TABLE on both dialects, because recreating the table on
 * SQLite would cascade-delete its agent_execution rows.
 */
export class AddTestChatToAgentExecutionThreads1794514039327 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const threads = escape.tableName('agent_execution_threads');
		const simulation = escape.columnName('simulation');

		await runQuery(
			`ALTER TABLE ${threads} ADD COLUMN ${simulation} ${isPostgres ? 'json' : 'TEXT'}`,
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${threads}.${simulation} IS 'Test chat marker and simulated world (backend, worldId, state). Null for a live chat.'`,
			);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('agent_execution_threads')} DROP COLUMN ${escape.columnName('simulation')}`,
		);
	}
}
