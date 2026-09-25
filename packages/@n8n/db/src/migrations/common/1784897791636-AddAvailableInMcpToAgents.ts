import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAvailableInMcpToAgents1784897791636 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'agents',
			[
				column('availableInMCP')
					.bool.notNull.default(false)
					.comment('Whether MCP clients granted agent scopes may operate on this agent'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agents', ['availableInMCP'], { recreatesOnSqlite: true });
	}
}
