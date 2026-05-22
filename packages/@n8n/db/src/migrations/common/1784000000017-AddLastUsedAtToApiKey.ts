import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddLastUsedAtToApiKey1784000000017 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
		await addColumns('user_api_keys', [column('lastUsedAt').timestampTimezone()]);
		await createIndex('user_api_keys', ['lastUsedAt']);
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex('user_api_keys', ['lastUsedAt']);
		await dropColumns('user_api_keys', ['lastUsedAt']);
	}
}
