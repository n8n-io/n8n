import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWebauthnLastUsedAt1778728323878 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('webauthn_credential', [column('lastUsedAt').timestamp()]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('webauthn_credential', ['lastUsedAt']);
	}
}
