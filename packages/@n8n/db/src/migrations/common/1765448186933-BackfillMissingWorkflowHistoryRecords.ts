import type { IrreversibleMigration, MigrationContext } from '../migration-types';

// Some users still have missing workflow history records after pulling workflows using source control feature
export class BackfillMissingWorkflowHistoryRecords1765448186933 implements IrreversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
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
	}
}
