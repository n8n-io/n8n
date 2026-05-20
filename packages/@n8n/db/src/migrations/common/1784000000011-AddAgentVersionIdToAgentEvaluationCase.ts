import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentVersionIdToAgentEvaluationCase1784000000011 implements ReversibleMigration {
	async up({
		escape,
		isPostgres,
		runQuery,
		schemaBuilder: { addColumns, addNotNull, column, createIndex },
	}: MigrationContext) {
		await addColumns('agent_evaluation_case', [column('agentVersionId').varchar(255)]);

		const reviewTable = escape.tableName('agent_evaluation_case');
		const agentTable = escape.tableName('agents');
		const agentVersionId = escape.columnName('agentVersionId');
		const reviewAgentId = escape.columnName('agentId');
		const agentId = escape.columnName('id');
		const versionId = escape.columnName('versionId');
		const updatedAt = escape.columnName('updatedAt');
		const fallbackVersion = isPostgres
			? `${agentTable}.${updatedAt}::text`
			: `${agentTable}.${updatedAt}`;

		await runQuery(`
			UPDATE ${reviewTable}
			SET ${agentVersionId} = (
				SELECT COALESCE(${agentTable}.${versionId}, ${fallbackVersion})
				FROM ${agentTable}
				WHERE ${agentTable}.${agentId} = ${reviewTable}.${reviewAgentId}
			)
			WHERE ${agentVersionId} IS NULL
		`);

		await addNotNull('agent_evaluation_case', 'agentVersionId');
		await createIndex('agent_evaluation_case', [
			'agentId',
			'agentVersionId',
			'status',
			'updatedAt',
		]);
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex('agent_evaluation_case', ['agentId', 'agentVersionId', 'status', 'updatedAt']);
		await dropColumns('agent_evaluation_case', ['agentVersionId']);
	}
}
