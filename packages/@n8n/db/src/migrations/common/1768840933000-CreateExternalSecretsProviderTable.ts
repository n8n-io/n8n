import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateExternalSecretsProviderTable1768840933000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('external_secrets_provider')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('displayName').varchar(128).notNull,
				column('type').varchar(64).notNull,
				column('projectId').varchar(36).default(null),
				column('settings').text.notNull,
				column('connected').bool.notNull.default(false),
				column('connectedAt').timestamp().default(null),
				column('state').varchar(32).notNull.default("'initializing'"),
			)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['name', 'projectId'], true).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('external_secrets_provider');
	}
}
