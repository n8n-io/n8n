import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSessionInvalidationAndWebauthnLastUsedAt1783200000000
	implements ReversibleMigration
{
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('user', [column('tokensValidAfter').timestamp()]);
		await addColumns('webauthn_credential', [column('lastUsedAt').timestamp()]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('webauthn_credential', ['lastUsedAt']);
		await dropColumns('user', ['tokensValidAfter']);
	}
}
