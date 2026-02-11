import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'dynamic_credential_user_entry';

export class AddDynamicCredentialUserEntryTable1768901721000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('credentialId').varchar(16).primary.notNull,
				column('userId').uuid.primary.notNull,
				column('resolverId').varchar(16).primary.notNull,
				column('data').text.notNull,
			)
			.withTimestamps.withForeignKey('credentialId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('resolverId', {
				tableName: 'dynamic_credential_resolver',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['userId'])
			.withIndexOn(['resolverId']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
