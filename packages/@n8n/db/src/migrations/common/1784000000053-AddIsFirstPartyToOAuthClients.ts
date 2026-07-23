import type { MigrationContext, ReversibleMigration } from '../migration-types';

const OAUTH_CLIENTS_TABLE = 'oauth_clients';
const OAUTH_IS_FIRST_PARTY_COLUMN = 'isFirstParty';

export class AddIsFirstPartyToOAuthClients1784000000053 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			OAUTH_CLIENTS_TABLE,
			[column(OAUTH_IS_FIRST_PARTY_COLUMN).bool.notNull.default(false)],
			{
				recreatesOnSqlite: true,
			},
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(OAUTH_CLIENTS_TABLE, [OAUTH_IS_FIRST_PARTY_COLUMN], {
			recreatesOnSqlite: true,
		});
	}
}
