import type { MigrationContext, ReversibleMigration } from '../migration-types';

// We have to use raw query migration instead of schemaBuilder helpers,
// because the typeorm schema builder implements addColumns by a table recreate for sqlite
// which causes weird issues with the migration
export class AddErrorColumnsToTestRuns1737715421462 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('test_run');
		const errorCodeColumnName = escape.columnName('errorCode');
		const errorDetailsColumnName = escape.columnName('errorDetails');

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${errorCodeColumnName} VARCHAR(255);`);
		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${errorDetailsColumnName} TEXT;`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('test_run');
		const errorCodeColumnName = escape.columnName('errorCode');
		const errorDetailsColumnName = escape.columnName('errorDetails');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${errorCodeColumnName};`);
		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${errorDetailsColumnName};`);
	}
}
