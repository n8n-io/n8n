import type { MigrationContext, ReversibleMigration } from '../migration-types';

const cacheTokensComment = 'A subset of promptTokens, not added to it';

export class AddAgentExecutionUsageAndLinks1792679908817 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex }, escape, runQuery, isPostgres }: MigrationContext) {
		const table = escape.tableName('agent_execution');
		const cacheReadTokens = escape.columnName('cacheReadTokens');
		const cacheWriteTokens = escape.columnName('cacheWriteTokens');
		const parentExecutionId = escape.columnName('parentExecutionId');

		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${cacheReadTokens} integer`);
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${cacheWriteTokens} integer`);
		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${parentExecutionId} varchar(36) ` +
				'CONSTRAINT "FK_agent_execution_parentExecutionId" ' +
				`REFERENCES ${table} (${escape.columnName('id')}) ON DELETE SET NULL`,
		);
		await createIndex('agent_execution', ['parentExecutionId']);

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${cacheReadTokens} IS 'Input tokens read from the provider prompt cache. ${cacheTokensComment}'`,
			);
			await runQuery(
				`COMMENT ON COLUMN ${table}.${cacheWriteTokens} IS 'Input tokens written to the provider prompt cache. ${cacheTokensComment}'`,
			);
			await runQuery(
				`COMMENT ON COLUMN ${table}.${parentExecutionId} IS 'Execution of the parent turn that delegated this run. Null for a top-level turn'`,
			);
		}
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex('agent_execution', ['parentExecutionId']);
		await dropColumns(
			'agent_execution',
			['parentExecutionId', 'cacheReadTokens', 'cacheWriteTokens'],
			{ recreatesOnSqlite: true },
		);
	}
}
