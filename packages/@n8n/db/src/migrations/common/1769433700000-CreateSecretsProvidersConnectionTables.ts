import type { MigrationContext, ReversibleMigration } from '../migration-types';

const secretsProviderConnectionTable = 'secrets_provider_connection';
const projectSecretsProviderAccessTable = 'project_secrets_provider_access';

export class CreateSecretsProviderConnectionTables1769433700000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column, createIndex } }: MigrationContext) {
		// Create secrets_provider_connection table first (parent table)
		await createTable(secretsProviderConnectionTable).withColumns(
			column('id').int.primary.autoGenerate2,
			column('providerKey').varchar(128).notNull,
			column('type')
				.varchar(36)
				.notNull.comment(
					'Type of secrets provider. Possible values: awsSecretsManager, gcpSecretsManager, vault, azureKeyVault, infisical',
				),
			column('encryptedSettings').text.notNull,
			column('isEnabled').bool.default(false).notNull,
		).withTimestamps;

		await createIndex(secretsProviderConnectionTable, ['providerKey'], true);

		// Create project_secrets_provider_access table (join table with FKs)
		await createTable(projectSecretsProviderAccessTable)
			.withColumns(
				column('secretsProviderConnectionId').int.primary.notNull,
				column('projectId').varchar(36).primary.notNull,
			)
			.withTimestamps.withForeignKey('secretsProviderConnectionId', {
				tableName: secretsProviderConnectionTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		// Drop in reverse order (child table first)
		await dropTable(projectSecretsProviderAccessTable);
		await dropTable(secretsProviderConnectionTable);
	}
}
