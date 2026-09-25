import { z } from 'zod';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const permissionSchema = z.enum(['always_allow', 'require_approval', 'blocked']);
const toolNamesSchema = z.array(z.string().min(1));
const legacyApprovalSchema = z
	.discriminatedUnion('mode', [
		z.object({ mode: z.literal('global') }).strict(),
		z.object({ mode: z.literal('selected'), tools: toolNamesSchema }).strict(),
	]);
const legacyFilterSchema = z
	.discriminatedUnion('mode', [
		z.object({ mode: z.literal('allow'), tools: toolNamesSchema }).strict(),
		z.object({ mode: z.literal('exclude'), tools: toolNamesSchema }).strict(),
	]);

type Permission = z.infer<typeof permissionSchema>;
type LegacyApproval = z.infer<typeof legacyApprovalSchema>;
type LegacyFilter = z.infer<typeof legacyFilterSchema>;

type ConfigRow = {
	id: string;
	schema: string | Record<string, unknown>;
};

type MigrationResult =
	| { status: 'unchanged' }
	| { status: 'malformed'; reason: string }
	| { status: 'migrated'; schema: Record<string, unknown> };

const tables = [
	{ name: 'agents', idColumn: 'id' },
	{ name: 'agent_history', idColumn: 'versionId' },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLegacyApproval(value: unknown): LegacyApproval | null {
	const result = legacyApprovalSchema.safeParse(value);
	return result.success ? result.data : null;
}

function parseLegacyFilter(value: unknown): LegacyFilter | null {
	const result = legacyFilterSchema.safeParse(value);
	return result.success ? result.data : null;
}

function permissionForTool(toolName: string, approval: LegacyApproval | undefined): Permission {
	if (approval?.mode === 'global') return 'require_approval';
	if (approval?.mode === 'selected' && approval.tools.includes(toolName)) {
		return 'require_approval';
	}
	return 'always_allow';
}

function migrateServer(server: unknown): Record<string, unknown> | null {
	if (!isRecord(server)) return null;

	const hasLegacyFields = Object.hasOwn(server, 'toolFilter') || Object.hasOwn(server, 'approval');
	if (Object.hasOwn(server, 'toolPermissions')) {
		if (!hasLegacyFields) return server;
		const rest = { ...server };
		delete rest.toolFilter;
		delete rest.approval;
		return rest;
	}

	const approval = Object.hasOwn(server, 'approval')
		? parseLegacyApproval(server.approval)
		: undefined;
	const filter = Object.hasOwn(server, 'toolFilter')
		? parseLegacyFilter(server.toolFilter)
		: undefined;
	// null when parsing failed
	if (approval === null || filter === null) return null;

	const baseline: Permission = approval?.mode === 'global' ? 'require_approval' : 'always_allow';
	const categories =
		filter?.mode === 'allow'
			? { read: 'blocked' as const, write: 'blocked' as const }
			: { read: baseline, write: baseline };
	const toolPermissions = new Map<string, Permission>();

	if (approval?.mode === 'selected' && filter?.mode !== 'allow') {
		for (const toolName of approval.tools) {
			toolPermissions.set(toolName, 'require_approval');
		}
	}
	if (filter?.mode === 'allow') {
		for (const toolName of filter.tools) {
			toolPermissions.set(toolName, permissionForTool(toolName, approval));
		}
	}
	if (filter?.mode === 'exclude') {
		for (const toolName of filter.tools) {
			toolPermissions.set(toolName, 'blocked');
		}
	}

	const rest = { ...server };
	delete rest.toolFilter;
	delete rest.approval;
	return {
		...rest,
		toolPermissions: {
			categories,
			...(toolPermissions.size > 0 ? { tools: Object.fromEntries(toolPermissions) } : {}),
		},
	};
}

function migrateConfig(value: unknown): MigrationResult {
	if (!isRecord(value)) return { status: 'malformed', reason: 'schema is not an object' };
	if (!Object.hasOwn(value, 'mcpServers')) return { status: 'unchanged' };
	if (!Array.isArray(value.mcpServers)) {
		return { status: 'malformed', reason: 'mcpServers is not an array' };
	}

	const migratedServers: Array<Record<string, unknown>> = [];
	let changed = false;
	for (const server of value.mcpServers) {
		const migrated = migrateServer(server);
		if (!migrated) {
			return { status: 'malformed', reason: 'mcpServers contains an invalid entry' };
		}
		migratedServers.push(migrated);
		changed ||= migrated !== server;
	}

	return changed
		? { status: 'migrated', schema: { ...value, mcpServers: migratedServers } }
		: { status: 'unchanged' };
}

export class MigrateAgentMcpToolPermissions1790261671925 implements IrreversibleMigration {
	async up(context: MigrationContext) {
		for (const table of tables) {
			await this.migrateTable(context, table.name, table.idColumn);
		}
	}

	private async migrateTable(
		{ escape, logger, migrationName, parseJson, runInBatches, runQuery }: MigrationContext,
		tableName: (typeof tables)[number]['name'],
		idColumnName: (typeof tables)[number]['idColumn'],
	) {
		const table = escape.tableName(tableName);
		const idColumn = escape.columnName(idColumnName);
		const schemaColumn = escape.columnName('schema');
		let migratedCount = 0;
		let skippedCount = 0;

		await runInBatches<ConfigRow>(
			`SELECT ${idColumn} AS id, ${schemaColumn} AS schema
			 FROM ${table}
			 WHERE ${schemaColumn} IS NOT NULL
			 ORDER BY ${idColumn}`,
			async (rows) => {
				for (const row of rows) {
					let schema: unknown;
					try {
						schema = parseJson<unknown>(row.schema);
					} catch (error) {
						skippedCount++;
						logger.warn(
							`[${migrationName}] Skipped malformed ${tableName} row ${row.id}: ${error instanceof Error ? error.message : 'invalid JSON'}`,
						);
						continue;
					}

					const result = migrateConfig(schema);
					if (result.status === 'unchanged') continue;
					if (result.status === 'malformed') {
						skippedCount++;
						logger.warn(
							`[${migrationName}] Skipped malformed ${tableName} row ${row.id}: ${result.reason}`,
						);
						continue;
					}

					await runQuery(`UPDATE ${table} SET ${schemaColumn} = :schema WHERE ${idColumn} = :id`, {
						id: row.id,
						schema: JSON.stringify(result.schema),
					});
					migratedCount++;
				}
			},
		);

		logger.info(
			`[${migrationName}] Migrated ${migratedCount} ${tableName} rows; skipped ${skippedCount} malformed rows.`,
		);
	}
}
