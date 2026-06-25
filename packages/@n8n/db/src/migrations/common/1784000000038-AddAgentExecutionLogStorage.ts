import type { MigrationContext, ReversibleMigration } from '../migration-types';

const AGENT_EXECUTION_TABLE = 'agent_execution';
const AGENT_EXECUTION_THREADS_TABLE = 'agent_execution_threads';
const LOG_STORED_AT_VALUES = ['db', 'fs', 's3', 'az'];

export class AddAgentExecutionLogStorage1784000000038 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres, schemaBuilder }: MigrationContext) {
		const executionTable = escape.tableName(AGENT_EXECUTION_TABLE);
		const threadsTable = escape.tableName(AGENT_EXECUTION_THREADS_TABLE);
		const logStoredAt = escape.columnName('logStoredAt');
		const logSizeBytes = escape.columnName('logSizeBytes');
		const firstMessage = escape.columnName('firstMessage');

		await runQuery(
			`ALTER TABLE ${executionTable} ADD COLUMN ${logStoredAt} VARCHAR(2) DEFAULT NULL CHECK(${logStoredAt} IN (${LOG_STORED_AT_VALUES.map((value) => `'${value}'`).join(', ')}))`,
		);
		await runQuery(
			`ALTER TABLE ${executionTable} ADD COLUMN ${logSizeBytes} BIGINT NOT NULL DEFAULT 0`,
		);
		await runQuery(`ALTER TABLE ${threadsTable} ADD COLUMN ${firstMessage} TEXT DEFAULT NULL`);

		await schemaBuilder.dropNotNull(AGENT_EXECUTION_TABLE, 'userMessage', {
			recreatesOnSqlite: true,
		});
		await schemaBuilder.dropNotNull(AGENT_EXECUTION_TABLE, 'assistantResponse', {
			recreatesOnSqlite: true,
		});

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${executionTable}.${logStoredAt} IS 'Storage location for the external agent execution log payload.'`,
			);
			await runQuery(
				`COMMENT ON COLUMN ${executionTable}.${logSizeBytes} IS 'Byte size of the external agent execution log payload. 0 means unknown or legacy inline data.'`,
			);
			await runQuery(
				`COMMENT ON COLUMN ${threadsTable}.${firstMessage} IS 'First non-empty user message for session-list previews without reading execution log blobs.'`,
			);
		}
	}

	async down({ escape, runQuery, schemaBuilder }: MigrationContext) {
		const executionTable = escape.tableName(AGENT_EXECUTION_TABLE);
		const threadsTable = escape.tableName(AGENT_EXECUTION_THREADS_TABLE);
		const logStoredAt = escape.columnName('logStoredAt');
		const logSizeBytes = escape.columnName('logSizeBytes');
		const firstMessage = escape.columnName('firstMessage');
		const userMessage = escape.columnName('userMessage');
		const assistantResponse = escape.columnName('assistantResponse');

		await runQuery(`UPDATE ${executionTable} SET ${userMessage} = '' WHERE ${userMessage} IS NULL`);
		await runQuery(
			`UPDATE ${executionTable} SET ${assistantResponse} = '' WHERE ${assistantResponse} IS NULL`,
		);

		await schemaBuilder.addNotNull(AGENT_EXECUTION_TABLE, 'assistantResponse', {
			recreatesOnSqlite: true,
		});
		await schemaBuilder.addNotNull(AGENT_EXECUTION_TABLE, 'userMessage', {
			recreatesOnSqlite: true,
		});

		await runQuery(`ALTER TABLE ${threadsTable} DROP COLUMN ${firstMessage}`);
		await runQuery(`ALTER TABLE ${executionTable} DROP COLUMN ${logSizeBytes}`);
		await runQuery(`ALTER TABLE ${executionTable} DROP COLUMN ${logStoredAt}`);
	}
}
