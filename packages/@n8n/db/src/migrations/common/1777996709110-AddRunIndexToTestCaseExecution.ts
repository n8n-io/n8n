import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddRunIndexToTestCaseExecution1777996709110 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('test_case_execution');
		const columnName = escape.columnName('runIndex');

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} INTEGER DEFAULT NULL`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('test_case_execution');
		const columnName = escape.columnName('runIndex');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
