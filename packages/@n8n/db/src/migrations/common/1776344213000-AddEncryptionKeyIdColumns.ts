import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tables = [
	'credentials_entity',
	'secrets_provider_connection',
	'dynamic_credential_resolver',
	'dynamic_credential_user_entry',
] as const;

export class AddEncryptionKeyIdColumns1776344213000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
		for (const table of tables) {
			await addColumns(table, [column('encryptionKeyId').varchar(36)]);
			await createIndex(table, ['encryptionKeyId'], false);
		}
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		for (const table of [...tables].reverse()) {
			await dropIndex(table, ['encryptionKeyId']);
			await dropColumns(table, ['encryptionKeyId']);
		}
	}
}
