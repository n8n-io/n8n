import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'chat_hub_agents';

export class AddSuggestedPromptsToAgentTable1772000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(table, [column('suggestedPrompts').json.notNull.default("'[]'")]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(table, ['suggestedPrompts']);
	}
}
