import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddLastUsedAtToApiKey1784000000017 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('user_api_keys', [column('lastUsedAt').timestampTimezone()], {
			recreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('user_api_keys', ['lastUsedAt'], { recreatesOnSqlite: true });
	}
}
