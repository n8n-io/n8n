import type { MigrationContext, ReversibleMigration } from '../migration-types';

const EXECUTION_TABLE = 'agent_execution';

export class AddAgentVersionIdToAgentExecution1784000000013 implements ReversibleMigration {
	async up({
		escape,
		isPostgres,
		runQuery,
		schemaBuilder: { addColumns, addNotNull, column },
	}: MigrationContext) {
		await addColumns(EXECUTION_TABLE, [column('agentVersionId').varchar(255)]);

		const executionTable = escape.tableName(EXECUTION_TABLE);
		const threadTable = escape.tableName('agent_execution_threads');
		const agentTable = escape.tableName('agents');
		const agentVersionId = escape.columnName('agentVersionId');
		const executionThreadId = escape.columnName('threadId');
		const threadId = escape.columnName('id');
		const threadAgentId = escape.columnName('agentId');
		const agentId = escape.columnName('id');
		const versionId = escape.columnName('versionId');
		const updatedAt = escape.columnName('updatedAt');
		const fallbackVersion = isPostgres
			? `${agentTable}.${updatedAt}::text`
			: `${agentTable}.${updatedAt}`;

		await runQuery(`
			UPDATE ${executionTable}
			SET ${agentVersionId} = (
				SELECT COALESCE(${agentTable}.${versionId}, ${fallbackVersion})
				FROM ${threadTable}
				INNER JOIN ${agentTable}
					ON ${agentTable}.${agentId} = ${threadTable}.${threadAgentId}
				WHERE ${threadTable}.${threadId} = ${executionTable}.${executionThreadId}
			)
			WHERE ${agentVersionId} IS NULL
		`);

		await addNotNull(EXECUTION_TABLE, 'agentVersionId');
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(EXECUTION_TABLE, ['agentVersionId']);
	}
}
