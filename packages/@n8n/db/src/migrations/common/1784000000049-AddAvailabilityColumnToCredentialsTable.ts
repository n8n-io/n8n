import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAvailabilityColumnToCredentialsTable1784000000049 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('availability');

		// The value set is intentionally extensible, so this is not a DB enum or CHECK constraint.
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${columnName} VARCHAR(16) NOT NULL DEFAULT 'workflow'`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('availability');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
