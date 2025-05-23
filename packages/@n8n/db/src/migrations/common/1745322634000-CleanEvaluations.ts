import type { MigrationContext, IrreversibleMigration } from '../migration-types';

const testRunTableName = 'test_run';
const testCaseExecutionTableName = 'test_case_execution';
export class ClearEvaluation1745322634000 implements IrreversibleMigration {
	async up({
		schemaBuilder: { dropTable, column, createTable },
		queryRunner,
		tablePrefix,
		isSqlite,
		isPostgres,
		isMysql,
	}: MigrationContext) {
		// Drop test_metric, test_definition
		await dropTable(testCaseExecutionTableName);
		await dropTable(testRunTableName);
		await dropTable('test_metric');
		if (isSqlite) {
			await queryRunner.query(`DROP TABLE IF EXISTS ${tablePrefix}test_definition;`);
		} else if (isPostgres) {
			await queryRunner.query(`DROP TABLE IF EXISTS ${tablePrefix}test_definition CASCADE;`);
		} else if (isMysql) {
			await queryRunner.query(`DROP TABLE IF EXISTS ${tablePrefix}test_definition CASCADE;`);
		}

		await createTable(testRunTableName)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('workflowId').varchar(36).notNull,
				column('status').varchar().notNull,
				column('errorCode').varchar(),
				column('errorDetails').json,
				column('runAt').timestamp(),
				column('completedAt').timestamp(),
				column('metrics').json,
			)
			.withIndexOn('workflowId')
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable(testCaseExecutionTableName)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('testRunId').varchar(36).notNull,
				column('executionId').int, // Execution of the workflow under test. Might be null if execution was deleted after the test run
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
			.withForeignKey('executionId', {
				tableName: 'execution_entity',
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;
	}
}
