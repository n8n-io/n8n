import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'chat_hub_agents';

export class AddIconToAgentTable1765788427674 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		// Add icon column to agents table (nullable)
		await addColumns(table, [column('icon').json]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		// Drop icon column
		await dropColumns(table, ['icon']);
	}
}
