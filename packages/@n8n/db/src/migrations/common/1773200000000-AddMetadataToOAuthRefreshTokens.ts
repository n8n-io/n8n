import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class AddMetadataToOAuthRefreshTokens1773200000000 implements IrreversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('oauth_refresh_tokens', [column('metadata').text]);
		await addColumns('oauth_authorization_codes', [column('metadata').text]);
	}
}
