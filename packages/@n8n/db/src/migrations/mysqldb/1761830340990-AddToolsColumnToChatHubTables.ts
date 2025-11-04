import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	sessions: 'chat_hub_sessions',
	agents: 'chat_hub_agents',
} as const;

export class AddToolsColumnToChatHubTables1761830340990 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column }, queryRunner, tablePrefix }: MigrationContext) {
		await addColumns(table.sessions, [
			column('tools').json.notNull.comment('Tools available to the agent as JSON node definitions'),
		]);
		await addColumns(table.agents, [
			column('tools').json.notNull.comment('Tools available to the agent as JSON node definitions'),
		]);

		// Add a default value for existing rows
		await Promise.all(
			[
				`UPDATE \`${tablePrefix}${table.sessions}\` SET \`tools\` = '[]' WHERE JSON_TYPE(\`tools\`) = 'NULL'`,
				`UPDATE \`${tablePrefix}${table.agents}\` SET \`tools\` = '[]' WHERE JSON_TYPE(\`tools\`) = 'NULL'`,
			].map(async (query) => {
				await queryRunner.query(query);
			}),
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(table.sessions, ['tools']);
		await dropColumns(table.agents, ['tools']);
	}
}
