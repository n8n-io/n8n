import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class DropAgentCodeColumn1779000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agents', ['code']);
	}

	async down({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('agents', [column('code').text.notNull.default("''")]);
	}
}
