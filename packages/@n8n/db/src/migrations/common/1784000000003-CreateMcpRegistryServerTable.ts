import type { MigrationContext, ReversibleMigration } from '../migration-types';

// NOTE: this migration that has a timestamp that's in the future at the time
// of writing. The reason is that previous migrations are also in the future,
// so using the actual timestamp would place this migration in between existing
// ones. This leads to different order of migrations depending on whether the
// database is empty or not. So to avoid unexpected behavior, this migration
// has a timestamp that's 1 ms after the previous migration's timestamp
export class CreateMcpRegistryServerTable1784000000003 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('mcp_registry_server')
			.withColumns(
				column('id').int.primary,
				column('slug').varchar(255).notNull,
				column('status')
					.varchar(50)
					.notNull.withEnumCheck(['active', 'deprecated'])
					.comment(
						'Server status in the MCP registry. Deprecated servers are not surfaced to users.',
					),
				column('version').varchar(50).notNull,
				column('registryUpdatedAt').timestampNoTimezone(3).notNull,
				column('data')
					.json.notNull.default("'{}'")
					.comment('JSON object containing server metadata (icons, remotes, tools, etc.)'),
			)
			.withUniqueConstraintOn(['slug']).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('mcp_registry_server');
	}
}
