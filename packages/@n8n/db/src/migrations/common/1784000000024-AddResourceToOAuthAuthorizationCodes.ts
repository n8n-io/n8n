import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'oauth_authorization_codes';
const COLUMN_NAME = 'resource';

/**
 * Migration adding the 'resource' column to 'oauth_authorization_codes'
 * to support RFC 8707 resource indicators.
 *
 * NULL values inside this column signify legacy flows initiated before resource indicator support
 * was added. These legacy flows default back to the instance's canonical MCP resource URL.
 * This migration is fully reversible; down() will drop the column for safe rollback.
 */
export class AddResourceToOAuthAuthorizationCodes1784000000024 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(TABLE_NAME, [
			column(COLUMN_NAME).text.comment(
				'RFC 8707 resource indicator URI (e.g. https://n8n.example.com/mcp-server/http). ' +
					'NULL = legacy flow predating resource indicator support; defaults to the instance canonical MCP resource URL.',
			),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(TABLE_NAME, [COLUMN_NAME]);
	}
}
