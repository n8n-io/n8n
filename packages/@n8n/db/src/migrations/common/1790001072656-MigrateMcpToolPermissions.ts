import type { MigrationContext, ReversibleMigration } from '../migration-types';

type Permission = 'allow' | 'ask' | 'block';
type LegacyExecutionPermission = 'always_allow' | 'require_approval' | 'blocked';

interface ToolPermissions {
	categories: { read: Permission; write: Permission };
	tools?: Record<string, Permission>;
}

interface ConnectionRow {
	id: string;
	toolFilter: string | Record<string, unknown> | null;
}

interface ConnectionPermissionsRow {
	id: string;
	toolPermissions: string | Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mapExecutionPermission(value: LegacyExecutionPermission): Permission {
	switch (value) {
		case 'always_allow':
			return 'allow';
		case 'require_approval':
			return 'ask';
		case 'blocked':
			return 'block';
	}
}

function policy(permission: Permission): ToolPermissions {
	return { categories: { read: permission, write: permission } };
}

function policyForExecutionPermission(value: LegacyExecutionPermission): ToolPermissions {
	if (value === 'require_approval') {
		return { categories: { read: 'allow', write: 'ask' } };
	}
	return policy(mapExecutionPermission(value));
}

function readToolNames(value: unknown, path: string): string[] {
	if (
		!Array.isArray(value) ||
		value.some((tool) => typeof tool !== 'string' || tool.length === 0)
	) {
		throw new Error(`${path}.tools must contain non-empty strings`);
	}
	return [...new Set(value)];
}

function parseLegacyFilter(
	value: unknown,
	path: string,
): { mode: 'allow' | 'exclude'; tools: string[] } | undefined {
	if (value === undefined) return undefined;
	if (!isRecord(value) || (value.mode !== 'allow' && value.mode !== 'exclude')) {
		throw new Error(`${path} must be an allow or exclude filter`);
	}
	return { mode: value.mode, tools: readToolNames(value.tools, path) };
}

function convertConnectionPolicy(
	filterValue: unknown,
	defaultPolicy: ToolPermissions,
	allowedToolPermission: Permission,
	path: string,
): ToolPermissions {
	const filter = parseLegacyFilter(filterValue, path);
	if (!filter) return { categories: { ...defaultPolicy.categories } };

	const tools: Record<string, Permission> = {};
	if (filter.mode === 'exclude') {
		for (const tool of filter.tools) tools[tool] = 'block';
		return {
			categories: { ...defaultPolicy.categories },
			...(Object.keys(tools).length > 0 ? { tools } : {}),
		};
	}

	for (const tool of filter.tools) tools[tool] = allowedToolPermission;
	return {
		...policy('block'),
		...(Object.keys(tools).length > 0 ? { tools } : {}),
	};
}

function parseExecutionPermission(value: unknown): LegacyExecutionPermission {
	if (value === 'always_allow' || value === 'require_approval' || value === 'blocked') {
		return value;
	}
	throw new Error('instanceAi.settings permissions.executeMcpTool is invalid');
}

function parseToolPermissions(value: unknown, path: string): ToolPermissions {
	if (!isRecord(value) || !isRecord(value.categories)) {
		throw new Error(`${path} must contain permission categories`);
	}
	const { read, write } = value.categories;
	if (
		(read !== 'allow' && read !== 'ask' && read !== 'block') ||
		(write !== 'allow' && write !== 'ask' && write !== 'block')
	) {
		throw new Error(`${path}.categories contains an invalid permission`);
	}
	if (value.tools !== undefined && !isRecord(value.tools)) {
		throw new Error(`${path}.tools must be an object`);
	}
	const tools: Record<string, Permission> = {};
	for (const [tool, permission] of Object.entries(value.tools ?? {})) {
		if (permission !== 'allow' && permission !== 'ask' && permission !== 'block') {
			throw new Error(`${path}.tools.${tool} is invalid`);
		}
		tools[tool] = permission;
	}
	return {
		categories: { read, write },
		...(Object.keys(tools).length > 0 ? { tools } : {}),
	};
}

function toLegacyExecutionPermission(
	permissions: ToolPermissions | undefined,
): LegacyExecutionPermission {
	if (!permissions) return 'require_approval';
	const { read, write } = permissions.categories;
	if (read === 'allow' && write === 'allow') return 'always_allow';
	if (read === 'block' && write === 'block') return 'blocked';
	return 'require_approval';
}

function toLegacyFilter(
	permissions: ToolPermissions,
): { mode: 'allow' | 'exclude'; tools: string[] } | null {
	const tools = Object.entries(permissions.tools ?? {});
	if (permissions.categories.read === 'block' || permissions.categories.write === 'block') {
		return {
			mode: 'allow',
			tools: tools.filter(([, permission]) => permission !== 'block').map(([tool]) => tool),
		};
	}

	const blockedTools = tools
		.filter(([, permission]) => permission === 'block')
		.map(([tool]) => tool);
	return blockedTools.length > 0 ? { mode: 'exclude', tools: blockedTools } : null;
}

export class MigrateMcpToolPermissions1790001072656 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		try {
			await this.migratePermissions(ctx);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			ctx.logger.error(`[${ctx.migrationName}] Failed to migrate MCP tool permissions: ${message}`);
			throw error;
		}
	}

	async down(ctx: MigrationContext) {
		try {
			await this.restoreLegacyPermissions(ctx);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			ctx.logger.error(`[${ctx.migrationName}] Failed to restore MCP tool permissions: ${message}`);
			throw error;
		}
	}

	private async migratePermissions(ctx: MigrationContext) {
		const { escape, parseJson, runInBatches, runQuery, schemaBuilder } = ctx;
		const settingsTable = escape.tableName('settings');
		const settingsKey = escape.columnName('key');
		const settingsValue = escape.columnName('value');
		const connectionTable = escape.tableName('instance_ai_mcp_registry_connections');
		const connectionId = escape.columnName('id');
		const toolFilter = escape.columnName('toolFilter');
		const toolPermissions = escape.columnName('toolPermissions');

		await schemaBuilder.addColumns(
			'instance_ai_mcp_registry_connections',
			[schemaBuilder.column('toolPermissions').json],
			{ recreatesOnSqlite: true },
		);

		const settingsRows = await runQuery<Array<{ value: string }>>(
			`SELECT ${settingsValue} AS value FROM ${settingsTable} WHERE ${settingsKey} = :key`,
			{ key: 'instanceAi.settings' },
		);
		let legacyPermission: LegacyExecutionPermission = 'require_approval';
		let defaultPolicy = policyForExecutionPermission(legacyPermission);
		if (settingsRows.length > 0) {
			const settings = parseJson<unknown>(settingsRows[0].value);
			if (!isRecord(settings)) throw new Error('instanceAi.settings must be an object');
			const permissions = settings.permissions;
			if (permissions !== undefined && !isRecord(permissions)) {
				throw new Error('instanceAi.settings permissions must be an object');
			}
			const legacyValue = permissions?.executeMcpTool;
			legacyPermission =
				legacyValue === undefined ? 'require_approval' : parseExecutionPermission(legacyValue);
			defaultPolicy = policyForExecutionPermission(legacyPermission);
			const nextPermissions = { ...(permissions ?? {}) };
			delete nextPermissions.executeMcpTool;
			const nextSettings = {
				...settings,
				permissions: nextPermissions,
				mcpToolPermissions: defaultPolicy,
			};
			await runQuery(
				`UPDATE ${settingsTable} SET ${settingsValue} = :value WHERE ${settingsKey} = :key`,
				{ key: 'instanceAi.settings', value: JSON.stringify(nextSettings) },
			);
		}

		await runInBatches<ConnectionRow>(
			`SELECT ${connectionId} AS id, ${toolFilter} AS "toolFilter" FROM ${connectionTable}`,
			async (rows) => {
				for (const row of rows) {
					const path = `instance_ai_mcp_registry_connections.${row.id}.toolFilter`;
					let converted: ToolPermissions;
					try {
						const filter =
							row.toolFilter === null ? undefined : parseJson<unknown>(row.toolFilter);
						converted = convertConnectionPolicy(
							filter,
							defaultPolicy,
							mapExecutionPermission(legacyPermission),
							path,
						);
					} catch (error) {
						const message = error instanceof Error ? error.message : String(error);
						ctx.logger.warn(
							`[${ctx.migrationName}] Invalid ${path}: ${message}. Using the require approval policy.`,
						);
						converted = policyForExecutionPermission('require_approval');
					}
					await runQuery(
						`UPDATE ${connectionTable} SET ${toolPermissions} = :toolPermissions WHERE ${connectionId} = :id`,
						{ id: row.id, toolPermissions: JSON.stringify(converted) },
					);
				}
			},
		);

		await schemaBuilder.addNotNull('instance_ai_mcp_registry_connections', 'toolPermissions', {
			recreatesOnSqlite: true,
		});
		await schemaBuilder.dropColumns('instance_ai_mcp_registry_connections', ['toolFilter'], {
			recreatesOnSqlite: true,
		});
	}

	private async restoreLegacyPermissions(ctx: MigrationContext) {
		const { escape, parseJson, runInBatches, runQuery, schemaBuilder } = ctx;
		const settingsTable = escape.tableName('settings');
		const settingsKey = escape.columnName('key');
		const settingsValue = escape.columnName('value');
		const connectionTable = escape.tableName('instance_ai_mcp_registry_connections');
		const connectionId = escape.columnName('id');
		const toolFilter = escape.columnName('toolFilter');
		const toolPermissions = escape.columnName('toolPermissions');

		await schemaBuilder.addColumns(
			'instance_ai_mcp_registry_connections',
			[schemaBuilder.column('toolFilter').json],
			{ recreatesOnSqlite: true },
		);

		const settingsRows = await runQuery<Array<{ value: string }>>(
			`SELECT ${settingsValue} AS value FROM ${settingsTable} WHERE ${settingsKey} = :key`,
			{ key: 'instanceAi.settings' },
		);
		if (settingsRows.length > 0) {
			const settings = parseJson<unknown>(settingsRows[0].value);
			if (!isRecord(settings)) throw new Error('instanceAi.settings must be an object');
			const currentPermissions = settings.permissions;
			if (currentPermissions !== undefined && !isRecord(currentPermissions)) {
				throw new Error('instanceAi.settings permissions must be an object');
			}
			const mcpPermissions =
				settings.mcpToolPermissions === undefined
					? undefined
					: parseToolPermissions(
							settings.mcpToolPermissions,
							'instanceAi.settings.mcpToolPermissions',
						);
			const nextSettings = { ...settings };
			delete nextSettings.mcpToolPermissions;
			nextSettings.permissions = {
				...(currentPermissions ?? {}),
				executeMcpTool: toLegacyExecutionPermission(mcpPermissions),
			};
			await runQuery(
				`UPDATE ${settingsTable} SET ${settingsValue} = :value WHERE ${settingsKey} = :key`,
				{ key: 'instanceAi.settings', value: JSON.stringify(nextSettings) },
			);
		}

		await runInBatches<ConnectionPermissionsRow>(
			`SELECT ${connectionId} AS id, ${toolPermissions} AS "toolPermissions" FROM ${connectionTable}`,
			async (rows) => {
				for (const row of rows) {
					const permissions = parseToolPermissions(
						parseJson<unknown>(row.toolPermissions),
						`instance_ai_mcp_registry_connections.${row.id}.toolPermissions`,
					);
					const filter = toLegacyFilter(permissions);
					await runQuery(
						`UPDATE ${connectionTable} SET ${toolFilter} = :toolFilter WHERE ${connectionId} = :id`,
						{ id: row.id, toolFilter: filter === null ? null : JSON.stringify(filter) },
					);
				}
			},
		);

		await schemaBuilder.dropColumns('instance_ai_mcp_registry_connections', ['toolPermissions'], {
			recreatesOnSqlite: true,
		});
	}
}
