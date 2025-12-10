import type { MigrationContext, ReversibleMigration } from '../migration-types';

const agentsTableName = 'chat_hub_agents';
const sessionsTableName = 'chat_hub_sessions';
const defaultIcon = JSON.stringify({ type: 'icon', value: 'bot' });

export class AddIconToAgentTable1765361177092 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column }, queryRunner, escape }: MigrationContext) {
		// Add icon column to agents table
		await addColumns(agentsTableName, [column('icon').json]);

		// Update all existing agents with default icon
		await queryRunner.query(
			`UPDATE ${escape.tableName(agentsTableName)} SET ${escape.columnName('icon')} = '${defaultIcon}' WHERE ${escape.columnName('icon')} IS NULL`,
		);

		// Add agentIcon column to sessions table (nullable, no default update needed)
		await addColumns(sessionsTableName, [column('agentIcon').json]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(agentsTableName, ['icon']);
		await dropColumns(sessionsTableName, ['agentIcon']);
	}
}
