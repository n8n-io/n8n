import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	agents: 'agents',
	executions: 'agent_execution',
	threads: 'agent_execution_threads',
} as const;

const columnName = 'executionCount';

export class AddAgentExecutionCount1783000000002 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const agentsTable = escape.tableName(table.agents);
		const executionsTable = escape.tableName(table.executions);
		const threadsTable = escape.tableName(table.threads);
		const executionCountColumn = escape.columnName(columnName);

		await runQuery(
			`ALTER TABLE ${agentsTable} ADD COLUMN ${executionCountColumn} BIGINT NOT NULL DEFAULT 0`,
		);

		await runQuery(`
			UPDATE ${agentsTable}
			SET ${executionCountColumn} = counts."executionCount"
			FROM (
				SELECT aet."agentId" AS "agentId", COUNT(*) AS "executionCount"
				FROM ${executionsTable} ae
				JOIN ${threadsTable} aet ON aet."id" = ae."threadId"
				GROUP BY aet."agentId"
			) counts
			WHERE ${agentsTable}."id" = counts."agentId"
		`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const agentsTable = escape.tableName(table.agents);
		const executionCountColumn = escape.columnName(columnName);

		await runQuery(`ALTER TABLE ${agentsTable} DROP COLUMN ${executionCountColumn}`);
	}
}
