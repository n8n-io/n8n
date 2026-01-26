import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'dynamic_credential_resolver';

export class CreateDynamicCredentialResolverTable1764682447000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('id').varchar(16).primary,
				column('name').varchar(128).notNull,
				column('type').varchar(128).notNull,
				column('config').text.notNull.comment(
					'Encrypted resolver configuration (JSON encrypted as string)',
				),
			)
			.withTimestamps.withIndexOn('type');
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
