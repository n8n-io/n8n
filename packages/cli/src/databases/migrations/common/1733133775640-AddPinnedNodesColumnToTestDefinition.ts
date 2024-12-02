import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddPinnedNodesColumnToTestDefinition1733133775640 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('test_definition', [column('pinnedNodes').json.notNull.default("'[]'")]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('test_definition', ['pinnedNodes']);
	}
}
