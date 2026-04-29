import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddEvaluationConfigColumnsToTestRun1778100002000 implements ReversibleMigration {
	async up({ escape, runQuery, dbType }: MigrationContext) {
		const testRunTable = escape.tableName('test_run');
		const evaluationConfigTable = escape.tableName('evaluation_config');
		const idCol = escape.columnName('evaluationConfigId');
		const snapshotCol = escape.columnName('evaluationConfigSnapshot');
		const idColRef = escape.columnName('id');
		const indexName = 'IDX_test_run_evaluation_config_id';
		const jsonType = dbType === 'postgresdb' ? 'JSONB' : 'TEXT';

		await runQuery(`ALTER TABLE ${testRunTable} ADD COLUMN ${idCol} VARCHAR(36);`);

		if (dbType !== 'sqlite') {
			await runQuery(
				`ALTER TABLE ${testRunTable}
				 ADD CONSTRAINT FK_test_run_evaluation_config_id
				 FOREIGN KEY (${idCol})
				 REFERENCES ${evaluationConfigTable}(${idColRef})
				 ON DELETE SET NULL;`,
			);
		}

		await runQuery(`CREATE INDEX ${indexName} ON ${testRunTable}(${idCol});`);

		await runQuery(`ALTER TABLE ${testRunTable} ADD COLUMN ${snapshotCol} ${jsonType};`);
	}

	async down({ escape, runQuery, dbType }: MigrationContext) {
		const testRunTable = escape.tableName('test_run');
		const idCol = escape.columnName('evaluationConfigId');
		const snapshotCol = escape.columnName('evaluationConfigSnapshot');
		const indexName = 'IDX_test_run_evaluation_config_id';

		await runQuery(`ALTER TABLE ${testRunTable} DROP COLUMN ${snapshotCol};`);
		await runQuery(`DROP INDEX ${indexName};`);
		if (dbType !== 'sqlite') {
			await runQuery(
				`ALTER TABLE ${testRunTable} DROP CONSTRAINT FK_test_run_evaluation_config_id;`,
			);
		}
		await runQuery(`ALTER TABLE ${testRunTable} DROP COLUMN ${idCol};`);
	}
}
