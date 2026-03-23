import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddRequestedDistTagToInstalledPackages1772800000000 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('installed_packages');
		const columnName = escape.columnName('requestedDistTag');

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} VARCHAR(255)`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('installed_packages');
		const columnName = escape.columnName('requestedDistTag');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
