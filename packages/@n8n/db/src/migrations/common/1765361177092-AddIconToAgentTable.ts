import type { MigrationContext, ReversibleMigration } from '../migration-types';

const agentsTableName = 'chat_hub_agents';
const sessionsTableName = 'chat_hub_sessions';

export class AddIconToAgentTable1765361177092 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		// Add icon column to agents table (nullable)
		await addColumns(agentsTableName, [column('icon').json]);

		// Add agentIcon column to sessions table (nullable)
		await addColumns(sessionsTableName, [column('agentIcon').json]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(agentsTableName, ['icon']);
		await dropColumns(sessionsTableName, ['agentIcon']);
	}
}
