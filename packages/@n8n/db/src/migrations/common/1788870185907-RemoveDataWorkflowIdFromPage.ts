import type { MigrationContext, ReversibleMigration } from '../migration-types';

const PAGE_TABLE = 'page';
const FOREIGN_KEY_NAME = 'page_dataWorkflowId_foreign';

/**
 * Pages no longer load data through a linked workflow (App content blocks
 * fetch their own data now), so this column has no reader left.
 */
export class RemoveDataWorkflowIdFromPage1788870185907 implements ReversibleMigration {
	async up({ schemaBuilder: { dropColumns, dropForeignKey } }: MigrationContext) {
		await dropForeignKey(PAGE_TABLE, 'dataWorkflowId', ['workflow_entity', 'id'], FOREIGN_KEY_NAME);
		await dropColumns(PAGE_TABLE, ['dataWorkflowId'], { recreatesOnSqlite: true });
	}

	async down({ schemaBuilder: { addColumns, addForeignKey, column } }: MigrationContext) {
		await addColumns(
			PAGE_TABLE,
			[column('dataWorkflowId').varchar(36).comment('Workflow this page calls to fetch its data')],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			PAGE_TABLE,
			'dataWorkflowId',
			['workflow_entity', 'id'],
			FOREIGN_KEY_NAME,
			'SET NULL',
		);
	}
}
