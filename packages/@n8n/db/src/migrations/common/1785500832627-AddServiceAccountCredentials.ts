import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddServiceAccountCredentials1785500832627 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('service_account_credential')
			.withColumns(
				column('id').uuid.primary,
				column('userId').uuid.notNull,
				column('credentialType').varchar(100).notNull,
				column('clientId').varchar().notNull,
				column('clientSecret').varchar().notNull,
			)
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['userId', 'credentialType'], false)
			.withIndexOn(['clientId'], true).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('service_account_credential');
	}
}
