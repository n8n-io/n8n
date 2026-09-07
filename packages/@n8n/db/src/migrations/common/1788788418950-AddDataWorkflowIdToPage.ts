import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'page';
const FOREIGN_KEY_NAME = 'page_dataWorkflowId_foreign';

export class AddDataWorkflowIdToPage1788788418950 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, addForeignKey, column } }: MigrationContext) {
		await addColumns(
			table,
			[column('dataWorkflowId').varchar(36).comment('Workflow this page calls to fetch its data')],
			{ recreatesOnSqlite: true },
		);

		// The workflow isn't owned by the page, so deleting it un-links the page
		// instead of cascading and destroying it.
		await addForeignKey(
			table,
			'dataWorkflowId',
			['workflow_entity', 'id'],
			FOREIGN_KEY_NAME,
			'SET NULL',
		);
	}

	async down({ schemaBuilder: { dropColumns, dropForeignKey } }: MigrationContext) {
		await dropForeignKey(table, 'dataWorkflowId', ['workflow_entity', 'id'], FOREIGN_KEY_NAME);
		await dropColumns(table, ['dataWorkflowId'], { recreatesOnSqlite: true });
	}
}
