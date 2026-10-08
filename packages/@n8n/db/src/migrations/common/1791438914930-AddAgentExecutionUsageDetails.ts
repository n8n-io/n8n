import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentExecutionUsageDetails1791438914930 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const executionTable = escape.tableName('agent_execution');
		const usageDetails = escape.columnName('usageDetails');
		// Native ALTER TABLE does not recreate the table on SQLite. A recreate
		// would cascade deletes into the tables that reference agent_execution.
		await runQuery(
			`ALTER TABLE ${executionTable} ADD COLUMN ${usageDetails} ${isPostgres ? 'JSON' : 'TEXT'}`,
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${executionTable}.${usageDetails} IS 'Usage the token columns do not hold, as {cacheReadTokens, cacheWriteTokens, subAgents}'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('agent_execution')} DROP COLUMN ${escape.columnName('usageDetails')}`,
		);
	}
}
