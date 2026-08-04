import type { MigrationContext, ReversibleMigration } from '../migration-types';

const OAUTH_CLIENTS_TABLE = 'oauth_clients';
const APPLICATION_TYPE_COLUMN = 'applicationType';

export class AddApplicationTypeToOAuthClients1785500900001 implements ReversibleMigration {
	// Existing rows default to `native`: before this column, every client got
	// RFC 8252 port-agnostic loopback matching, so `native` preserves that.
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			OAUTH_CLIENTS_TABLE,
			[column(APPLICATION_TYPE_COLUMN).varchar(255).notNull.default("'native'")],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(OAUTH_CLIENTS_TABLE, [APPLICATION_TYPE_COLUMN], {
			recreatesOnSqlite: true,
		});
	}
}
