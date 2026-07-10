import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddLastActiveAtToOAuthUserConsents1784000000049 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('oauth_user_consents', [column('lastActiveAt').bigint], {
			recreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('oauth_user_consents', ['lastActiveAt'], { recreatesOnSqlite: true });
	}
}
