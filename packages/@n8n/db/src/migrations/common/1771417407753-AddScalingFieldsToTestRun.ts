import type { MigrationContext, ReversibleMigration } from '../migration-types';

// We have to use raw query migration instead of schemaBuilder helpers,
// because the typeorm schema builder implements addColumns by a table recreate for sqlite
// which causes weird issues with the migration
export class AddScalingFieldsToTestRun1771417407753 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('test_run');
		const runningInstanceIdColumnName = escape.columnName('runningInstanceId');
		const cancelRequestedColumnName = escape.columnName('cancelRequested');

		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${runningInstanceIdColumnName} VARCHAR(255);`,
		);
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${cancelRequestedColumnName} BOOLEAN NOT NULL DEFAULT FALSE;`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('test_run');
		const runningInstanceIdColumnName = escape.columnName('runningInstanceId');
		const cancelRequestedColumnName = escape.columnName('cancelRequested');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${runningInstanceIdColumnName};`);
		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${cancelRequestedColumnName};`);
	}
}
