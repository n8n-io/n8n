import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { isRecord } from '@n8n/utils/is-record';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

type IdMap = Map<string, string>;
type JsonRow = Record<string, unknown>;
type ToolIds = { ids: IdMap; namedTools: Set<string> };
type JsonVisitor = (values: JsonRow, row: JsonRow) => void;

const nanoId = /^[A-Za-z0-9]{16}$/;

function collectIds(ids: IdMap, values: unknown[]) {
	for (const value of values) {
		if (typeof value === 'string') ids.set(value, value);
	}
}

function referenceIds(config: unknown, property: string, type: string): string[] {
	if (!isRecord(config) || !Array.isArray(config[property])) return [];
	return config[property].flatMap((ref: unknown) =>
		isRecord(ref) && ref.type === type && typeof ref.id === 'string' ? [ref.id] : [],
	);
}

function keys(value: unknown): string[] {
	return isRecord(value) ? Object.keys(value) : [];
}

function unusedId(reserved: Set<string>): string {
	for (let attempt = 0; attempt < 10; attempt++) {
		const id = generateNanoId();
		if (!reserved.has(id)) return id;
	}
	throw new Error('Could not generate a unique agent resource ID');
}

function allocateToolIds(tools: ToolIds): IdMap {
	const reserved = new Set(tools.ids.keys());
	const changes: IdMap = new Map();
	for (const id of tools.ids.keys()) {
		if (nanoId.test(id) && !tools.namedTools.has(id)) continue;
		const replacement = unusedId(reserved);
		reserved.add(replacement);
		changes.set(id, replacement);
	}
	return changes;
}

function replaceId(value: unknown, ids: IdMap): unknown {
	return typeof value === 'string' ? (ids.get(value) ?? value) : value;
}

function replaceKeys(value: unknown, ids: IdMap): unknown {
	if (!isRecord(value)) return value;
	return Object.fromEntries(Object.entries(value).map(([id, body]) => [ids.get(id) ?? id, body]));
}

function replaceRefs(config: unknown, property: string, type: string, ids: IdMap) {
	if (!isRecord(config) || !Array.isArray(config[property])) return;
	for (const ref of config[property]) {
		if (isRecord(ref) && ref.type === type) ref.id = replaceId(ref.id, ids);
	}
}

async function updateRow(
	{ escape, runQuery }: MigrationContext,
	table: string,
	key: string,
	id: unknown,
	changes: JsonRow,
) {
	const columns = Object.keys(changes);
	if (columns.length === 0) return;
	const assignments = columns.map(
		(column, index) => `${escape.columnName(column)} = :value${index}`,
	);
	const parameters = Object.fromEntries(
		columns.map((column, index) => [`value${index}`, changes[column]]),
	);
	await runQuery(
		`UPDATE ${escape.tableName(table)} SET ${assignments.join(', ')} WHERE ${escape.columnName(key)} = :rowId`,
		{ ...parameters, rowId: id },
	);
}

async function visitJsonRow(
	ctx: MigrationContext,
	table: string,
	key: string,
	jsonColumns: string[],
	visit: JsonVisitor,
	row: JsonRow,
) {
	let values: JsonRow;
	try {
		values = Object.fromEntries(
			jsonColumns.map((column) => [column, ctx.parseJson<unknown>(row[column])]),
		);
	} catch {
		ctx.logger.warn(
			`[${ctx.migrationName}] Skipped malformed JSON in ${table} row ${String(row[key])}.`,
		);
		return;
	}
	const before = jsonColumns.map((column) => JSON.stringify(values[column]));
	visit(values, row);
	const changes: JsonRow = {};
	for (const [index, column] of jsonColumns.entries()) {
		const after = JSON.stringify(values[column]);
		if (after !== before[index]) changes[column] = after;
	}
	await updateRow(ctx, table, key, row[key], changes);
}

/** Read and change only the named JSON columns. Pagination keys stay unchanged. */
async function visitJsonRows(
	ctx: MigrationContext,
	table: string,
	key: string,
	jsonColumns: string[],
	visit: JsonVisitor,
	extraColumns: string[] = [],
) {
	const { escape, runInBatches } = ctx;
	const columns = [key, ...extraColumns, ...jsonColumns].map(escape.columnName).join(', ');
	await runInBatches<JsonRow>(
		`SELECT ${columns} FROM ${escape.tableName(table)} ORDER BY ${escape.columnName(key)}`,
		async (rows) => {
			for (const row of rows) {
				await visitJsonRow(ctx, table, key, jsonColumns, visit, row);
			}
		},
	);
}

function collectToolIds(values: JsonRow, tools: ToolIds) {
	collectIds(tools.ids, [...keys(values.tools), ...referenceIds(values.schema, 'tools', 'custom')]);
	if (!isRecord(values.tools)) return;
	for (const [id, body] of Object.entries(values.tools)) {
		if (isRecord(body) && isRecord(body.descriptor) && body.descriptor.name === id) {
			tools.namedTools.add(id);
		}
	}
}

async function visitAgents(
	ctx: MigrationContext,
	visit: (values: JsonRow, agentId: string) => void,
) {
	await visitJsonRows(ctx, 'agents', 'id', ['schema', 'tools'], (values, row) => {
		if (typeof row.id === 'string') visit(values, row.id);
	});
	await visitJsonRows(
		ctx,
		'agent_history',
		'versionId',
		['schema', 'tools'],
		(values, row) => {
			if (typeof row.agentId === 'string') visit(values, row.agentId);
		},
		['agentId'],
	);
}

async function collectToolIdsByAgent(ctx: MigrationContext): Promise<Map<string, IdMap>> {
	const toolsByAgent = new Map<string, ToolIds>();

	// Collect every version before allocation so a removed tool keeps its identity on restore.
	await visitAgents(ctx, (values, agentId) => {
		const tools = toolsByAgent.get(agentId) ?? { ids: new Map(), namedTools: new Set<string>() };
		toolsByAgent.set(agentId, tools);
		collectToolIds(values, tools);
	});
	return new Map(Array.from(toolsByAgent, ([agentId, tools]) => [agentId, allocateToolIds(tools)]));
}

export class NormalizeAgentCustomToolIds1791549491949 implements IrreversibleMigration {
	async up(ctx: MigrationContext) {
		const toolsByAgent = await collectToolIdsByAgent(ctx);

		await visitAgents(ctx, (values, agentId) => {
			const tools = toolsByAgent.get(agentId);
			if (!tools || tools.size === 0) return;
			values.tools = replaceKeys(values.tools, tools);
			replaceRefs(values.schema, 'tools', 'custom', tools);
		});
	}
}
