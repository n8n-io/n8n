import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Each execution records the published agent version that ran it. Null for a
 * test-chat or draft run, which runs no published version. Live checks count
 * failures per version, and nothing else on the execution says which ran.
 */
export class AddAgentVersionIdToAgentExecution1794187822353 implements ReversibleMigration {
	async up({
		isSqlite,
		escape,
		runQuery,
		schemaBuilder: { addColumns, addForeignKey, column, createIndex },
	}: MigrationContext) {
		const executions = escape.tableName('agent_execution');
		const versionId = escape.columnName('agentVersionId');
		// The schema builder rebuilds the table on SQLite, and other tables
		// reference agent_execution. Add this nullable column in place.
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${executions} ADD COLUMN ${versionId} varchar(36) REFERENCES ${escape.tableName('agent_history')} (${escape.columnName('versionId')}) ON DELETE SET NULL`,
			);
		} else {
			await addColumns(
				'agent_execution',
				[
					column('agentVersionId')
						.varchar(36)
						.comment(
							'Published agent version that ran this execution; null for test and draft runs',
						),
				],
				{ recreatesOnSqlite: true },
			);
			await addForeignKey(
				'agent_execution',
				'agentVersionId',
				['agent_history', 'versionId'],
				'FK_agent_execution_agentVersionId',
				'SET NULL',
			);
		}
		await createIndex('agent_execution', ['agentVersionId']);
	}

	async down({
		isSqlite,
		escape,
		runQuery,
		schemaBuilder: { dropColumns, dropForeignKey, dropIndex },
	}: MigrationContext) {
		await dropIndex('agent_execution', ['agentVersionId']);
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName('agent_execution')} DROP COLUMN ${escape.columnName('agentVersionId')}`,
			);
		} else {
			await dropForeignKey(
				'agent_execution',
				'agentVersionId',
				['agent_history', 'versionId'],
				'FK_agent_execution_agentVersionId',
			);
			await dropColumns('agent_execution', ['agentVersionId'], { recreatesOnSqlite: true });
		}
	}
}
