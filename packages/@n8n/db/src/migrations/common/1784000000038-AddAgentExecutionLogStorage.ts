import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const AGENT_EXECUTION_TABLE = 'agent_execution';
const AGENT_EXECUTION_THREADS_TABLE = 'agent_execution_threads';
const LOG_STORED_AT_VALUES = ['fs'];
const INLINE_LOG_COLUMNS = ['userMessage', 'assistantResponse', 'toolCalls', 'timeline', 'error'];

export class AddAgentExecutionLogStorage1784000000038 implements IrreversibleMigration {
	async up({ escape, runQuery, isPostgres, schemaBuilder }: MigrationContext) {
		const executionTable = escape.tableName(AGENT_EXECUTION_TABLE);
		const threadsTable = escape.tableName(AGENT_EXECUTION_THREADS_TABLE);
		const logStoredAt = escape.columnName('logStoredAt');
		const logSizeBytes = escape.columnName('logSizeBytes');
		const firstMessage = escape.columnName('firstMessage');

		await runQuery(`DELETE FROM ${threadsTable}`);
		await runQuery(
			`ALTER TABLE ${executionTable} ADD COLUMN ${logStoredAt} VARCHAR(2) NOT NULL DEFAULT 'fs' CHECK(${logStoredAt} IN (${LOG_STORED_AT_VALUES.map((value) => `'${value}'`).join(', ')}))`,
		);
		await runQuery(
			`ALTER TABLE ${executionTable} ADD COLUMN ${logSizeBytes} BIGINT NOT NULL DEFAULT 0`,
		);
		await runQuery(`ALTER TABLE ${threadsTable} ADD COLUMN ${firstMessage} TEXT DEFAULT NULL`);
		await schemaBuilder.dropColumns(AGENT_EXECUTION_TABLE, INLINE_LOG_COLUMNS, {
			recreatesOnSqlite: true,
		});

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${executionTable}.${logStoredAt} IS 'Storage location for the external agent execution log payload.'`,
			);
			await runQuery(
				`COMMENT ON COLUMN ${executionTable}.${logSizeBytes} IS 'Byte size of the external agent execution log payload.'`,
			);
			await runQuery(
				`COMMENT ON COLUMN ${threadsTable}.${firstMessage} IS 'First non-empty user message for session-list previews without reading execution log blobs.'`,
			);
		}
	}
}
