import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddStatsColumnsToTestRun1733494526213 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('test_run');
		const columnNames = ['total', 'passed', 'failed'].map((name) => escape.columnName(name));

		// Values can be NULL only if the test run is new, otherwise they must be non-negative integers
		for (const name of columnNames) {
			await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${name} INT CHECK(
				CASE
					WHEN status = 'new' THEN ${name} IS NULL
					ELSE ${name} >= 0
				END
			)`);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('test_run');
		const columnNames = ['total', 'passed', 'failed'].map((name) => escape.columnName(name));

		for (const name of columnNames) {
			await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${name}`);
		}
	}
}
