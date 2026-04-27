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
			UPDATE ${executionEntityTable}
			SET ${workflowVersionId} = (
				SELECT ${workflowVersionId}
				FROM ${executionDataTable}
				WHERE ${executionDataTable}.${executionId} = ${executionEntityTable}.${idColumn}
			)
			WHERE EXISTS (
				SELECT 1
				FROM ${executionDataTable}
				WHERE ${executionDataTable}.${executionId} = ${executionEntityTable}.${idColumn}
					AND ${executionDataTable}.${workflowVersionId} IS NOT NULL
			)
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
			UPDATE ${executionDataTable}
			SET ${workflowVersionId} = (
				SELECT ${workflowVersionId}
				FROM ${executionEntityTable}
				WHERE ${executionEntityTable}.${idColumn} = ${executionDataTable}.${executionId}
			)
			WHERE EXISTS (
				SELECT 1
				FROM ${executionEntityTable}
				WHERE ${executionEntityTable}.${idColumn} = ${executionDataTable}.${executionId}
					AND ${executionEntityTable}.${workflowVersionId} IS NOT NULL
			)
		`);

		await runQuery(`ALTER TABLE ${executionEntityTable} DROP COLUMN ${workflowVersionId}`);
	}
}
