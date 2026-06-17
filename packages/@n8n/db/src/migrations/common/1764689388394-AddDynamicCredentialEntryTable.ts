import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'dynamic_credential_entry';

export class AddDynamicCredentialEntryTable1764689388394 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('credential_id').varchar(16).primary.notNull,
				column('subject_id').varchar(16).primary.notNull,
				column('resolver_id').varchar(16).primary.notNull,
				column('data').text.notNull,
			)
			.withTimestamps.withForeignKey('credential_id', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('resolver_id', {
				tableName: 'dynamic_credential_resolver',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['subject_id'])
			.withIndexOn(['resolver_id']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
