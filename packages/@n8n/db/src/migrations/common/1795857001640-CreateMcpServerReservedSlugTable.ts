import type { MigrationContext, ReversibleMigration } from '../migration-types';

const RESERVED_SLUG_TABLE = 'mcp_server_reserved_slug';
const SERVER_TABLE = 'mcp_server';

/**
 * Keeps the old URL slugs of custom MCP servers reserved after a builder changes a server URL.
 * Deleting the project deletes the server row and cascades to this table, so the slugs are free
 * again.
 */
export class CreateMcpServerReservedSlugTable1795857001640 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(RESERVED_SLUG_TABLE)
			.withColumns(
				column('slug')
					.varchar(128)
					.primary.comment('Old URL slug of a server. Stays reserved until its project is deleted'),
				column('serverId').uuid.notNull.comment('Server that used this slug before'),
				column('reservedAt').timestampTimezone().notNull.default('NOW()'),
			)
			.withIndexOn('serverId')
			.withForeignKey('serverId', {
				tableName: SERVER_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		// Drops the reserved slugs recorded when builders changed custom MCP server URLs.
		await dropTable(RESERVED_SLUG_TABLE);
	}
}
