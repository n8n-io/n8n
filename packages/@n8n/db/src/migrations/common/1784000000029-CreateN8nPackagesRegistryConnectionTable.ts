import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'n8n_packages_registry_connection';

export class CreateN8nPackagesRegistryConnectionTable1784000000029 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table)
			.withColumns(
				column('id').varchar(36).primary,
				column('name').varchar(128).notNull,
				column('type')
					.varchar(36)
					.notNull.withEnumCheck(['git'])
					.comment('Type of package registry connection. Possible values: git.'),
				column('config').json.notNull.comment('Registry connection configuration.'),
				column('credentialId').varchar(36).comment('Optional credential used by the registry.'),
				column('isEnabled').bool.default(true).notNull,
			)
			.withIndexOn(['type'])
			.withIndexOn(['isEnabled'])
			.withForeignKey('credentialId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table);
	}
}
