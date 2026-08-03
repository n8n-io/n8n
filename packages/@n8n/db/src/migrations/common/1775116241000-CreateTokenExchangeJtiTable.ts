import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'token_exchange_jti';

export class CreateTokenExchangeJtiTable1775116241000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName).withColumns(
			column('jti').varchar(255).primary,
			column('expiresAt').timestamp().notNull,
			column('createdAt').timestamp().notNull,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
