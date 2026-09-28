import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddConfigSourcedFieldsToSecretsProviderConnection1790613956314
	implements ReversibleMigration
{
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('secrets_provider_connection');
		const column = escape.columnName('configSourcedFields');

		// Nullable, no default: a comma-joined list is only ever written by the config-file
		// reconciler. Raw ALTER TABLE avoids a full-table recreation on SQLite, which would risk
		// this table's incoming FK from project_secrets_provider_access.
		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${column} TEXT`);

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${column} IS 'Comma-joined names of settings fields whose value came from the config file''s fromEnv/fromFile indirection. Redacted unconditionally in API responses, regardless of the provider''s own typeOptions.password flag. NULL for api-managed connections.'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('secrets_provider_connection');
		const column = escape.columnName('configSourcedFields');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${column}`);
	}
}
