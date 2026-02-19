import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class RemoveIsEnabledFlagExternalSecrets1771490438204 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('secrets_provider_connection');
		const isEnabledColumnName = escape.columnName('isEnabled');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${isEnabledColumnName};`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('secrets_provider_connection');
		const isEnabledColumnName = escape.columnName('isEnabled');

		// Default to true as when you move to secret provider mode we enable all connections
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${isEnabledColumnName} BOOLEAN NOT NULL DEFAULT TRUE;`,
		);
	}
}
