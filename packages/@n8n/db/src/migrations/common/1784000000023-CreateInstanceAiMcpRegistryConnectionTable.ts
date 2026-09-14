import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'instance_ai_mcp_registry_connections';

export class CreateInstanceAiMcpRegistryConnectionTable1784000000023
	implements ReversibleMigration
{
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table)
			.withColumns(
				column('id').uuid.primary,
				column('credentialId').varchar(36).notNull,
				column('serverSlug').varchar(255).notNull,
				column('toolFilter').json.comment(
					'Optional MCP tool filter per registry connection: { mode: "allow" | "exclude", tools: string[] }',
				),
				column('userId').uuid.notNull,
			)
			.withIndexOn(['userId', 'serverSlug', 'credentialId'], true)
			.withForeignKey('credentialId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('serverSlug', {
				tableName: 'mcp_registry_server',
				columnName: 'slug',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table);
	}
}
