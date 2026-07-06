import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddScopeColumnToOAuthUserConsents1784000000044 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('oauth_user_consents', [column('scope').json], {
			recreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('oauth_user_consents', ['scope'], { recreatesOnSqlite: true });
	}
}
