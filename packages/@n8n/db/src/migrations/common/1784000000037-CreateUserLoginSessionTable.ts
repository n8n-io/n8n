import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'user_login_session';

export class CreateUserLoginSessionTable1784000000037 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('id').varchar(36).primary,
				column('userId').uuid.notNull,
				column('browserIdHash').varchar(64),
				column('userAgent').varchar(512),
				column('ipAddress').varchar(45),
				column('expiresAt').timestamp().notNull,
				column('lastActiveAt').timestamp(),
			)
			.withTimestamps.withIndexOn('userId')
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
