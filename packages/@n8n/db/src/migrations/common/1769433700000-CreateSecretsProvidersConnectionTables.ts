import type { MigrationContext, ReversibleMigration } from '../migration-types';

const secretsProviderConnectionTable = 'secrets_provider_connection';
const projectSecretsProviderAccessTable = 'project_secrets_provider_access';

export class CreateSecretsProviderConnectionTables1769433700000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		// Create secrets_provider_connection table first (parent table)
		await createTable(secretsProviderConnectionTable).withColumns(
			column('providerKey').varchar().primary.notNull,
			column('type').varchar().notNull,
			column('encryptedSettings').text.notNull,
			column('isEnabled').bool.default(false).notNull,
		).withTimestamps;

		// Create project_secrets_provider_access table (join table with FKs)
		await createTable(projectSecretsProviderAccessTable)
			.withColumns(
				column('providerKey').varchar().primary.notNull,
				column('projectId').varchar(36).primary.notNull,
			)
			.withTimestamps.withForeignKey('providerKey', {
				tableName: secretsProviderConnectionTable,
				columnName: 'providerKey',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn('providerKey')
			.withIndexOn('projectId');
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		// Drop in reverse order (child table first)
		await dropTable(projectSecretsProviderAccessTable);
		await dropTable(secretsProviderConnectionTable);
	}
}
