import type { MigrationContext, ReversibleMigration } from '../migration-types';

const connectionTable = 'instance_ai_mcp_registry_connections';
const settingsKey = 'instanceAi.settings';
const defaultToolPermissions = '{"categories":{"read":"always_allow","write":"require_approval"}}';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Replaces the MCP tool filter with read and write tool permissions.
 * Existing filters and the `executeMcpTool` setting are not converted.
 * Every connection gets the default permissions, and the settings fall back to the new defaults.
 */
export class MigrateMcpToolPermissions1790236643232 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { escape, runQuery, schemaBuilder } = ctx;

		await schemaBuilder.addColumns(
			connectionTable,
			[schemaBuilder.column('toolPermissions').json],
			{
				recreatesOnSqlite: true,
			},
		);
		await runQuery(
			`UPDATE ${escape.tableName(connectionTable)} SET ${escape.columnName('toolPermissions')} = '${defaultToolPermissions}'`,
		);
		await schemaBuilder.addNotNull(connectionTable, 'toolPermissions', {
			recreatesOnSqlite: true,
		});
		await schemaBuilder.dropColumns(connectionTable, ['toolFilter'], { recreatesOnSqlite: true });

		await this.removePermissionKeys(ctx, ['executeMcpTool']);
	}

	async down(ctx: MigrationContext) {
		const { schemaBuilder } = ctx;

		await schemaBuilder.addColumns(connectionTable, [schemaBuilder.column('toolFilter').json], {
			recreatesOnSqlite: true,
		});
		await schemaBuilder.dropColumns(connectionTable, ['toolPermissions'], {
			recreatesOnSqlite: true,
		});

		await this.removePermissionKeys(ctx, ['mcpRead', 'mcpWrite']);
	}

	/** Missing permission keys resolve to the defaults when the settings load. */
	private async removePermissionKeys(
		{ escape, logger, migrationName, parseJson, runQuery }: MigrationContext,
		keys: string[],
	) {
		const table = escape.tableName('settings');
		const keyColumn = escape.columnName('key');
		const valueColumn = escape.columnName('value');

		const rows = await runQuery<Array<{ value: string }>>(
			`SELECT ${valueColumn} AS value FROM ${table} WHERE ${keyColumn} = :key`,
			{ key: settingsKey },
		);
		if (rows.length === 0) return;

		let settings: unknown;
		try {
			settings = parseJson<unknown>(rows[0].value);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.warn(`[${migrationName}] Skipped ${settingsKey}: ${message}`);
			return;
		}
		if (!isRecord(settings) || !isRecord(settings.permissions)) return;

		const permissions = { ...settings.permissions };
		for (const key of keys) delete permissions[key];

		await runQuery(`UPDATE ${table} SET ${valueColumn} = :value WHERE ${keyColumn} = :key`, {
			key: settingsKey,
			value: JSON.stringify({ ...settings, permissions }),
		});
	}
}
