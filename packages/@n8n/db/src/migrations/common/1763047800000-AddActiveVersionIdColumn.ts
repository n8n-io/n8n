import type { MigrationContext, ReversibleMigration } from '../migration-types';

const WORKFLOWS_TABLE_NAME = 'workflow_entity';
const WORKFLOW_HISTORY_TABLE_NAME = 'workflow_history';

export class AddActiveVersionIdColumn1763047800000 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column, addForeignKey },
		queryRunner,
		escape,
		runQuery,
	}: MigrationContext) {
		const workflowsTableName = escape.tableName(WORKFLOWS_TABLE_NAME);

		await addColumns(WORKFLOWS_TABLE_NAME, [column('activeVersionId').varchar(36)]);

		await addForeignKey(
			WORKFLOWS_TABLE_NAME,
			'activeVersionId',
			[WORKFLOW_HISTORY_TABLE_NAME, 'versionId'],
			undefined,
			'RESTRICT',
		);

		// Fix for ADO-4517: some users pulled workflows to prod instances and ended up having missing records
		// Run AFTER adding column/FK to avoid CASCADE DELETE
		await this.backFillHistoryRecords(runQuery, escape);

		// For existing ACTIVE workflows, set activeVersionId = versionId
		const versionIdColumn = escape.columnName('versionId');
		const activeColumn = escape.columnName('active');
		const activeVersionIdColumn = escape.columnName('activeVersionId');

		await queryRunner.query(
			`UPDATE ${workflowsTableName}
			 SET ${activeVersionIdColumn} = ${versionIdColumn}
			 WHERE ${activeColumn} = true`,
		);
	}

	async down({ schemaBuilder: { dropColumns, dropForeignKey } }: MigrationContext) {
		await dropForeignKey(WORKFLOWS_TABLE_NAME, 'activeVersionId', [
			WORKFLOW_HISTORY_TABLE_NAME,
			'versionId',
		]);
		await dropColumns(WORKFLOWS_TABLE_NAME, ['activeVersionId']);
	}

	// Create workflow_history records for workflows missing them
	async backFillHistoryRecords(
		runQuery: MigrationContext['runQuery'],
		escape: MigrationContext['escape'],
	) {
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
