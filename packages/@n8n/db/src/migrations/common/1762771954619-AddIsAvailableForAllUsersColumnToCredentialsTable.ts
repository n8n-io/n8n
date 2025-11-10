import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddIsAvailableForAllUsersColumnToCredentialsTable1762771954619
	implements ReversibleMigration
{
	async up({ escape, runQuery, isSqlite }: MigrationContext) {
		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('isAvailableForAllUsers');

		const defaultValue = isSqlite ? 0 : 'FALSE';

		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${columnName} BOOLEAN NOT NULL DEFAULT ${defaultValue}`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('isAvailableForAllUsers');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
