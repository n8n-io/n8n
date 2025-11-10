import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class BackfillMissingWorkflowHistoryRecords1762763704614 implements IrreversibleMigration {
	/**
	 * 1. Generate versionIds for workflows with NULL versionId (only possible for manual inserts)
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

		// Step 1: Generate versionIds for workflows that have NULL or empty versionId
		const workflowsWithoutVersionId = await runQuery<Array<{ id: string }>>(`
			SELECT ${idColumn} as id
			FROM ${workflowTable}
			WHERE ${versionIdColumn} IS NULL OR ${versionIdColumn} = ''
		`);

		// Running in a loop to avoid using DB-specific syntax for generating UUIDs
		for (const workflow of workflowsWithoutVersionId) {
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
