import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddManagedByToSecretsProviderConnection1790104310258 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('secrets_provider_connection');
		const column = escape.columnName('managedBy');

		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${column} VARCHAR(20) NOT NULL DEFAULT 'api'`,
		);

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${column} IS 'Whether this connection is managed through the internal REST API/UI (api) or provisioned declaratively from the external secrets config file (config-file).'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('secrets_provider_connection');
		const column = escape.columnName('managedBy');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${column}`);
	}
}
