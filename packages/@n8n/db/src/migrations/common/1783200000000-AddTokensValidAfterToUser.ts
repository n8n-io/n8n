import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddTokensValidAfterToUser1783200000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('user', [column('tokensValidAfter').timestamp()]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('user', ['tokensValidAfter']);
	}
}
