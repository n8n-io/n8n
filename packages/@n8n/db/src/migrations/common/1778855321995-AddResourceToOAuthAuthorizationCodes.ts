import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'oauth_authorization_codes';
const COLUMN_NAME = 'resource';

/**
 * Migration adding the 'resource' column to 'oauth_authorization_codes'
 * to support RFC 8707 resource indicators.
 *
 * NULL values inside this column signify legacy flows initiated before resource indicator support
 * was added. These legacy flows default back to using the legacy 'mcp-server-api' audience.
 * This migration is fully reversible; down() will drop the column for safe rollback.
 */
export class AddResourceToOAuthAuthorizationCodes1778855321995 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(TABLE_NAME, [column(COLUMN_NAME).varchar()]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(TABLE_NAME, [COLUMN_NAME]);
	}
}
