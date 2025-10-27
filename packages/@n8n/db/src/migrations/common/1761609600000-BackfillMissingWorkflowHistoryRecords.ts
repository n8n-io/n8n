import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class BackfillMissingWorkflowHistoryRecords1761609600000 implements ReversibleMigration {
	/**
	 * Create workflow_history records for workflows where the versionId
	 * doesn't exist in workflow_history table.
	 *
	 * This ensures all workflows have a history record for their current version.
	 */
	async up({ escape, runQuery, logger }: MigrationContext) {
		const workflowTable = escape.tableName('workflow_entity');
		const historyTable = escape.tableName('workflow_history');
		const versionIdColumn = escape.columnName('versionId');
		const idColumn = escape.columnName('id');
		const workflowIdColumn = escape.columnName('workflowId');
		const nodesColumn = escape.columnName('nodes');
		const connectionsColumn = escape.columnName('connections');
		const authorsColumn = escape.columnName('authors');
		const createdAtColumn = escape.columnName('createdAt');
		const updatedAtColumn = escape.columnName('updatedAt');

		// Find workflows with versionIds that don't exist in workflow_history
		const workflowsWithMissingHistory = await runQuery<
			Array<{
				workflowId: string;
				versionId: string;
				nodes: string;
				connections: string;
			}>
		>(`
			SELECT
				w.${idColumn} as workflowId,
				w.${versionIdColumn} as versionId,
				w.${nodesColumn} as nodes,
				w.${connectionsColumn} as connections
			FROM ${workflowTable} w
			LEFT JOIN ${historyTable} wh ON w.${versionIdColumn} = wh.${versionIdColumn}
			WHERE w.${versionIdColumn} IS NOT NULL
			AND wh.${versionIdColumn} IS NULL
		`);

		if (workflowsWithMissingHistory.length === 0) {
			logger.info('No missing workflow history records found - skipping backfill');
			return;
		}

		logger.info(
			`Found ${workflowsWithMissingHistory.length} workflows with missing history records`,
		);

		const now = new Date();
		const authors = 'system migration';

		// Insert missing records in batches to avoid overwhelming the database
		const batchSize = 100;
		for (let i = 0; i < workflowsWithMissingHistory.length; i += batchSize) {
			const batch = workflowsWithMissingHistory.slice(i, i + batchSize);

			// Insert each record in the batch
			for (const workflow of batch) {
				await runQuery(
					`INSERT INTO ${historyTable}
						(${versionIdColumn}, ${workflowIdColumn}, ${authorsColumn}, ${nodesColumn}, ${connectionsColumn}, ${createdAtColumn}, ${updatedAtColumn})
					VALUES (:versionId, :workflowId, :authors, :nodes, :connections, :createdAt, :updatedAt)`,
					{
						versionId: workflow.versionId,
						workflowId: workflow.workflowId,
						authors,
						nodes: workflow.nodes,
						connections: workflow.connections,
						createdAt: now,
						updatedAt: now,
					},
				);
			}

			logger.info(
				`Backfilled batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(workflowsWithMissingHistory.length / batchSize)}`,
			);
		}

		logger.info(
			`Successfully backfilled ${workflowsWithMissingHistory.length} workflow history records`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const historyTable = escape.tableName('workflow_history');
		const authorsColumn = escape.columnName('authors');

		await runQuery(
			`
			DELETE FROM ${historyTable}
			WHERE ${authorsColumn} = :authors
		`,
			{
				authors: 'system migration',
			},
		);
	}
}
