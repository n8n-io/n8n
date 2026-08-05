import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'oauth_clients';
const FOREIGN_KEY_NAME = 'oauth_clients_createdBy_foreign';

/**
 * Marks an OAuth client as manually pre-registered by a user, for MCP clients
 * that don't implement Dynamic Client Registration. `NULL` means the client
 * self-registered over the DCR endpoint.
 */
export class AddCreatedByToOAuthClients1785500832700 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, addForeignKey, column } }: MigrationContext) {
		await addColumns(
			TABLE_NAME,
			[
				column('createdBy').uuid.comment(
					'User who manually registered this client; NULL for DCR clients',
				),
			],
			{ recreatesOnSqlite: true },
		);

		await addForeignKey(TABLE_NAME, 'createdBy', ['user', 'id'], FOREIGN_KEY_NAME, 'SET NULL');
	}

	async down({ schemaBuilder: { dropColumns, dropForeignKey } }: MigrationContext) {
		await dropForeignKey(TABLE_NAME, 'createdBy', ['user', 'id'], FOREIGN_KEY_NAME);
		await dropColumns(TABLE_NAME, ['createdBy'], { recreatesOnSqlite: true });
	}
}
