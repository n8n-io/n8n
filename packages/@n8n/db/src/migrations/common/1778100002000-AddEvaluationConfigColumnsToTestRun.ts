import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TEST_RUN_TABLE = 'test_run';
const EVALUATION_CONFIG_TABLE = 'evaluation_config';
const FK_NAME = 'FK_test_run_evaluation_config_id';

export class AddEvaluationConfigColumnsToTestRun1778100002000 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, addForeignKey, createIndex, column },
		escape,
		runQuery,
		dbType,
	}: MigrationContext) {
		await addColumns(TEST_RUN_TABLE, [column('evaluationConfigId').varchar(36)]);

		await addForeignKey(
			TEST_RUN_TABLE,
			'evaluationConfigId',
			[EVALUATION_CONFIG_TABLE, 'id'],
			FK_NAME,
			'SET NULL',
		);

		await createIndex(TEST_RUN_TABLE, ['evaluationConfigId']);

		// Use JSONB on Postgres for queryability; SQLite stores JSON as TEXT.
		const testRunTable = escape.tableName(TEST_RUN_TABLE);
		const snapshotCol = escape.columnName('evaluationConfigSnapshot');
		const jsonType = dbType === 'postgresdb' ? 'JSONB' : 'TEXT';
		await runQuery(`ALTER TABLE ${testRunTable} ADD COLUMN ${snapshotCol} ${jsonType};`);
	}

	async down({ schemaBuilder: { dropColumns, dropForeignKey, dropIndex } }: MigrationContext) {
		await dropColumns(TEST_RUN_TABLE, ['evaluationConfigSnapshot']);
		await dropIndex(TEST_RUN_TABLE, ['evaluationConfigId']);
		await dropForeignKey(
			TEST_RUN_TABLE,
			'evaluationConfigId',
			[EVALUATION_CONFIG_TABLE, 'id'],
			FK_NAME,
		);
		await dropColumns(TEST_RUN_TABLE, ['evaluationConfigId']);
	}
}
