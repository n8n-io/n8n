import type { MigrationContext, ReversibleMigration } from '../migration-types';

const LINK_COLUMNS = ['parentExecutionId', 'rootExecutionId'] as const;

export class AddAgentExecutionUsageAndLinks1791502830839 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres, tablePrefix, schemaBuilder }: MigrationContext) {
		const executionTable = escape.tableName('agent_execution');
		const executionId = escape.columnName('id');

		// Native ALTER TABLE ADD COLUMN does not recreate the table on SQLite. A
		// recreate would cascade deletes into the tables that reference
		// agent_execution. SQLite accepts a REFERENCES clause here because the
		// default is NULL.
		for (const name of ['cacheReadTokens', 'cacheWriteTokens']) {
			await runQuery(`ALTER TABLE ${executionTable} ADD COLUMN ${escape.columnName(name)} INTEGER`);
		}
		for (const name of LINK_COLUMNS) {
			const constraint = escape.columnName(`FK_${tablePrefix}agent_execution_${name}`);
			await runQuery(
				`ALTER TABLE ${executionTable} ADD COLUMN ${escape.columnName(name)} VARCHAR(36) DEFAULT NULL CONSTRAINT ${constraint} REFERENCES ${executionTable}(${executionId}) ON DELETE SET NULL`,
			);
			await schemaBuilder.createIndex('agent_execution', [name]);
		}

		if (isPostgres) {
			const comments: Record<string, string> = {
				cacheReadTokens:
					'Input tokens read from the provider prompt cache. A subset of promptTokens, not added to it',
				cacheWriteTokens:
					'Input tokens written to the provider prompt cache. A subset of promptTokens, not added to it',
				parentExecutionId:
					'Execution of the parent turn that delegated this run. Null for a top-level turn',
				rootExecutionId: 'Top-level execution of the delegation tree. Null for a top-level turn',
			};
			for (const [name, comment] of Object.entries(comments)) {
				await runQuery(
					`COMMENT ON COLUMN ${executionTable}.${escape.columnName(name)} IS '${comment}'`,
				);
			}
		}
	}

	async down({ escape, runQuery, schemaBuilder }: MigrationContext) {
		const executionTable = escape.tableName('agent_execution');
		// SQLite cannot drop an indexed column. Drop the indexes first.
		for (const name of LINK_COLUMNS) {
			await schemaBuilder.dropIndex('agent_execution', [name]);
		}
		for (const name of [...LINK_COLUMNS, 'cacheWriteTokens', 'cacheReadTokens']) {
			await runQuery(`ALTER TABLE ${executionTable} DROP COLUMN ${escape.columnName(name)}`);
		}
	}
}
