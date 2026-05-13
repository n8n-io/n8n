import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddLastUsedAtToWebauthnCredential1783300000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('webauthn_credential', [column('lastUsedAt').timestamp()]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('webauthn_credential', ['lastUsedAt']);
	}
}
