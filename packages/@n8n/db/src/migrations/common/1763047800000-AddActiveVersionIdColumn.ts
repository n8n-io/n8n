import type { MigrationContext, ReversibleMigration } from '../migration-types';

const WORKFLOWS_TABLE_NAME = 'workflow_entity';
const WORKFLOW_HISTORY_TABLE_NAME = 'workflow_history';

export class AddActiveVersionIdColumn1763047800000 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column, addForeignKey },
		queryRunner,
		escape,
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
}
