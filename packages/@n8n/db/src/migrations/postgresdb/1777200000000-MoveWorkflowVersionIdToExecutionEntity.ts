import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class MoveWorkflowVersionIdToExecutionEntity1777200000000 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const executionEntityTable = escape.tableName('execution_entity');
		const executionDataTable = escape.tableName('execution_data');
		const workflowVersionId = escape.columnName('workflowVersionId');
		const executionId = escape.columnName('executionId');
		const idColumn = escape.columnName('id');

		await runQuery(
			`ALTER TABLE ${executionEntityTable} ADD COLUMN ${workflowVersionId} VARCHAR(36)`,
		);

		await runQuery(`
			UPDATE ${executionEntityTable} e
			SET ${workflowVersionId} = d.${workflowVersionId}
			FROM ${executionDataTable} d
			WHERE d.${executionId} = e.${idColumn}
				AND d.${workflowVersionId} IS NOT NULL
		`);

		await runQuery(`ALTER TABLE ${executionDataTable} DROP COLUMN ${workflowVersionId}`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const executionEntityTable = escape.tableName('execution_entity');
		const executionDataTable = escape.tableName('execution_data');
		const workflowVersionId = escape.columnName('workflowVersionId');
		const executionId = escape.columnName('executionId');
		const idColumn = escape.columnName('id');

		await runQuery(`ALTER TABLE ${executionDataTable} ADD COLUMN ${workflowVersionId} VARCHAR(36)`);

		await runQuery(`
			UPDATE ${executionDataTable} d
			SET ${workflowVersionId} = e.${workflowVersionId}
			FROM ${executionEntityTable} e
			WHERE d.${executionId} = e.${idColumn}
				AND e.${workflowVersionId} IS NOT NULL
		`);

		await runQuery(`ALTER TABLE ${executionEntityTable} DROP COLUMN ${workflowVersionId}`);
	}
}
