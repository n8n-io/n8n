import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class UseSlugAsPrimaryKeyInMcpRegistryServer1784000000013 implements IrreversibleMigration {
	async up({
		copyTable,
		runQuery,
		escape,
		schemaBuilder: { createTable, dropTable, column },
	}: MigrationContext) {
		const tableName = 'mcp_registry_server';
		const tempTableName = 'tmp_mcp_registry_server';

		await createTable(tempTableName).withColumns(
			column('slug').varchar(255).primary,
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
		).withTimestamps;

		await copyTable(
			tableName,
			tempTableName,
			['slug', 'status', 'version', 'registryUpdatedAt', 'data', 'createdAt', 'updatedAt'],
			['slug', 'status', 'version', 'registryUpdatedAt', 'data', 'createdAt', 'updatedAt'],
		);

		await dropTable(tableName);
		await runQuery(
			`ALTER TABLE ${escape.tableName(tempTableName)} RENAME TO ${escape.tableName(tableName)}`,
		);
	}
}
