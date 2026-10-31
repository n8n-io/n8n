import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const settingsKey = 'instanceAi.settings';
const permissionKeys = ['mcpRead', 'mcpWrite'];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Removes the instance-wide MCP read and write permissions from the n8n Assistant settings.
 * MCP tool permissions are set for each connection. New connections use the built-in defaults.
 * Connections keep their own saved permissions.
 */
export class RemoveMcpToolPermissionSettings1792680641057 implements IrreversibleMigration {
	async up({ escape, logger, migrationName, parseJson, runQuery }: MigrationContext) {
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
		for (const key of permissionKeys) delete permissions[key];

		await runQuery(`UPDATE ${table} SET ${valueColumn} = :value WHERE ${keyColumn} = :key`, {
			key: settingsKey,
			value: JSON.stringify({ ...settings, permissions }),
		});
	}
}
