import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class BackfillMissingWorkflowHistoryRecords1762763704614 implements IrreversibleMigration {
	/**
	 * 1. Generate/regenerate versionIds for workflows that need them:
	 *    - NULL/empty versionId
	 *    - duplicate versionIds that do not own the history record
	 *    (i.e., no history record with matching versionId AND workflowId)
	 * 2. Create workflow_history records for all workflows missing them
	 * 3. Make versionId NOT NULL to ensure data consistency
	 */
	async up({ escape, runQuery, schemaBuilder }: MigrationContext) {
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

		// Step 1: Generate versionIds that do not exist in workflow history
		const workflowsNeedingNewVersionId = await runQuery<Array<{ id: string }>>(`
			-- Find duplicate versionIds (appear in more than one workflow)
			WITH dup_version AS (
				SELECT ${versionIdColumn}
				FROM ${workflowTable}
				WHERE ${versionIdColumn} IS NOT NULL AND ${versionIdColumn} <> ''
				GROUP BY ${versionIdColumn}
				HAVING COUNT(*) > 1
			)
			SELECT w.${idColumn} AS id
			FROM ${workflowTable} w
			LEFT JOIN ${historyTable} wh
				ON wh.${versionIdColumn} = w.${versionIdColumn}
				AND wh.${workflowIdColumn} = w.${idColumn}
			LEFT JOIN dup_version d
				ON d.${versionIdColumn} = w.${versionIdColumn}
			WHERE
				-- missing or empty versionId
				w.${versionIdColumn} IS NULL OR w.${versionIdColumn} = ''
				-- duplicate versionId without matching history entry by both versionId and workflowId
				OR (
					d.${versionIdColumn} IS NOT NULL
					AND wh.${workflowIdColumn} IS NULL
				);
		`);

		// Running in a loop to avoid using DB-specific syntax for generating UUIDs
		for (const workflow of workflowsNeedingNewVersionId) {
			const versionId = crypto.randomUUID();
			await runQuery(
				`
				UPDATE ${workflowTable}
				SET ${versionIdColumn} = :versionId
				WHERE ${idColumn} = :id
				`,
				{ versionId, id: workflow.id },
			);
		}

		// Step 2: Create workflow_history records for workflows missing them
		await runQuery(
			`
			INSERT INTO ${historyTable} (
				${versionIdColumn},
				${workflowIdColumn},
				${authorsColumn},
				${nodesColumn},
				${connectionsColumn},
				${createdAtColumn},
				${updatedAtColumn}
			)
			SELECT
				w.${versionIdColumn},
				w.${idColumn},
				:authors,
				w.${nodesColumn},
				w.${connectionsColumn},
				:createdAt,
				:updatedAt
		    FROM ${workflowTable} w
	        LEFT JOIN ${historyTable} wh
				ON w.${versionIdColumn} = wh.${versionIdColumn}
			WHERE wh.${versionIdColumn} IS NULL
			`,
			{
				authors: 'system migration',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);

		// Step 3: Make versionId NOT NULL
		await schemaBuilder.addNotNull('workflow_entity', 'versionId');
	}
}
