import type { MigrationContext, ReversibleMigration } from '../migration-types';

const testCaseExecutionTableName = 'test_case_execution';

export class CreateTestCaseExecutionTable1736947513045 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(testCaseExecutionTableName)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('testRunId').varchar(36).notNull,
				column('pastExecutionId').int, // Might be null if execution was deleted after the test run
				column('executionId').int, // Execution of the workflow under test. Might be null if execution was deleted after the test run
				column('evaluationExecutionId').int, // Execution of the evaluation workflow. Might be null if execution was deleted after the test run, or if the test run was cancelled
				column('status').varchar().notNull,
				column('runAt').timestamp(),
				column('completedAt').timestamp(),
				column('errorCode').varchar(),
				column('errorDetails').json,
				column('metrics').json,
			)
			.withIndexOn('testRunId')
			.withForeignKey('testRunId', {
				tableName: 'test_run',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('pastExecutionId', {
				tableName: 'execution_entity',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('executionId', {
				tableName: 'execution_entity',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('evaluationExecutionId', {
				tableName: 'execution_entity',
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(testCaseExecutionTableName);
	}
}
