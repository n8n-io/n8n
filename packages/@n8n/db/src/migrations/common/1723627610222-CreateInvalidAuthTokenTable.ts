import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'invalid_auth_token';

export class CreateInvalidAuthTokenTable1723627610222 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName).withColumns(
			column('token').varchar(512).primary,
			column('expiresAt').timestamp().notNull,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
