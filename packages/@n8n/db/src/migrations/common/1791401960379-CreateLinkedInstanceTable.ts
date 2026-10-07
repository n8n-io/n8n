import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateLinkedInstanceTable1791401960379 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('linked_instance')
			.withColumns(
				column('id').uuid.primary,
				column('userId').uuid.notNull.comment('User who linked the instance'),
				column('name').varchar(64).notNull.comment('Name that the user gave the instance'),
				column('baseUrl').varchar(2048).notNull.comment('Normalised origin of the instance'),
				column('tokenEncrypted').text.notNull.comment('Access token, encrypted with the cipher'),
				column('status')
					.varchar(16)
					.notNull.default("'unknown'")
					.withEnumCheck(['online', 'offline', 'unauthorised', 'mcp-disabled', 'unknown'])
					.comment('Result of the last check of the instance'),
				column('lastVerifiedAt').timestampTimezone(),
				column('createdAt').timestampTimezone().notNull.default('NOW()'),
				column('updatedAt').timestampTimezone().notNull.default('NOW()'),
			)
			.withIndexOn('userId')
			.withIndexOn(['userId', 'baseUrl'], true)
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('linked_instance');
	}
}
