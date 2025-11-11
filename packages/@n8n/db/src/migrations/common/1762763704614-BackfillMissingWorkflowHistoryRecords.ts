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
			SELECT w.${idColumn} as id
			FROM ${workflowTable} w
			WHERE
				w.${versionIdColumn} IS NULL OR w.${versionIdColumn} = ''
				OR (
					EXISTS (
						SELECT 1
						FROM ${workflowTable} w2
						WHERE w2.${versionIdColumn} = w.${versionIdColumn}
						AND w2.${idColumn} != w.${idColumn}
					)
					AND NOT EXISTS (
						SELECT 1
						FROM ${historyTable} wh
						WHERE wh.${versionIdColumn} = w.${versionIdColumn}
						AND wh.${workflowIdColumn} = w.${idColumn}
					)
				)
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
