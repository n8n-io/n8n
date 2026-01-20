import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'dynamic_credential_user_entry';

export class AddDynamicCredentialUserEntryTable1768901721000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('credential_id').varchar(16).primary.notNull,
				column('user_id').varchar().primary.notNull,
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
			.withForeignKey('user_id', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['user_id'])
			.withIndexOn(['resolver_id']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
