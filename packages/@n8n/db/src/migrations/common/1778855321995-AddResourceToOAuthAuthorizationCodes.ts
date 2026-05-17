import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'oauth_authorization_codes';
const COLUMN_NAME = 'resource';

export class AddResourceToOAuthAuthorizationCodes1778855321995 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(TABLE_NAME, [column(COLUMN_NAME).varchar()]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(TABLE_NAME, [COLUMN_NAME]);
	}
}
