import type { MigrationContext, ReversibleMigration } from '../migration-types';

const columns = ['totalCases', 'passedCases', 'failedCases'] as const;

// Note: This migration was separated from common after release to remove column check constraints
// because they were causing issues with MySQL

export class AddStatsColumnsToTestRun1736172058779 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('test_run');
		const columnNames = columns.map((name) => escape.columnName(name));

		// Values can be NULL only if the test run is new, otherwise they must be non-negative integers.
		// Test run might be cancelled or interrupted by unexpected error at any moment, so values can be either NULL or non-negative integers.
		for (const name of columnNames) {
			await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${name} INT;`);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('test_run');
		const columnNames = columns.map((name) => escape.columnName(name));

		for (const name of columnNames) {
			await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${name}`);
		}
	}
}
