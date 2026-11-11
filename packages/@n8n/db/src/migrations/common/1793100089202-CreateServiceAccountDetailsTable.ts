import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'service_account_details';

/**
 * Data of a service account that does not belong on the `user` table. Each
 * service account has at most one row, keyed by its `user.id`.
 */
export class CreateServiceAccountDetailsTable1793100089202 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('userId').uuid.primary.comment('ID of the service account in the user table'),
				column('name').varchar(128).notNull.comment('Display name of the service account'),
			)
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}service_account_details_userId`,
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
