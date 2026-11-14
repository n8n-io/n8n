import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddLastUsedAtToOAuthUserConsents1794585552646 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'oauth_user_consents',
			[
				column('lastUsedAt')
					.timestampTimezone()
					.comment(
						'Last time the client used this grant on the instance MCP server; NULL if never',
					),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('oauth_user_consents', ['lastUsedAt'], { recreatesOnSqlite: true });
	}
}
