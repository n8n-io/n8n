import type { MigrationContext, ReversibleMigration } from '@db/types';
import { v4 as uuidv4 } from 'uuid';

type Workflow = { id: number };

export class AddWorkflowVersionIdColumn1669739707124 implements ReversibleMigration {
	async up({ escape, executeQuery }: MigrationContext) {
		const tableName = escape.tableName('workflow_entity');
		const columnName = escape.columnName('versionId');

		await executeQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} CHAR(36)`);

		const workflowIds: Workflow[] = await executeQuery(`SELECT id FROM ${tableName}`);
		for (const { id } of workflowIds) {
			await executeQuery(
				`UPDATE ${tableName} SET ${columnName} = :versionId WHERE id = :id`,
				{ versionId: uuidv4() },
				{ id },
			);
		}
	}

	async down({ escape, executeQuery }: MigrationContext) {
		const tableName = escape.tableName('workflow_entity');
		const columnName = escape.columnName('versionId');
		await executeQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
