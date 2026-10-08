import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError } from 'n8n-workflow';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

type IdMap = Map<string, string>;
type IdVisitor = (id: string) => string;
type JsonRow = Record<string, unknown>;
type JsonVisitor = (values: JsonRow) => void;

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
	throw new UnexpectedError('Could not generate a unique agent resource ID');
}

function allocateSkillIds(ids: IdMap): IdMap {
	const reserved = new Set(ids.keys());
	const changes: IdMap = new Map();
	for (const id of ids.keys()) {
		if (!id.startsWith('skill_') || !nanoId.test(id.slice('skill_'.length))) continue;
		let replacement = id.slice('skill_'.length);
		if (reserved.has(replacement)) replacement = unusedId(reserved);
		reserved.add(replacement);
		changes.set(id, replacement);
	}
	return changes;
}

function visitId(value: unknown, visit: IdVisitor): unknown {
	return typeof value === 'string' ? visit(value) : value;
}

function visitKeys(value: unknown, visit: IdVisitor): unknown {
	if (!isRecord(value)) return value;
	return Object.fromEntries(Object.entries(value).map(([id, body]) => [visit(id), body]));
}

function visitRefs(config: unknown, property: string, type: string, visit: IdVisitor) {
	if (!isRecord(config) || !Array.isArray(config[property])) return;
	for (const ref of config[property]) {
		if (isRecord(ref) && ref.type === type) ref.id = visitId(ref.id, visit);
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
	visit(values);
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
	where = '',
) {
	const { escape, runQuery } = ctx;
	const columns = [key, ...jsonColumns].map(escape.columnName).join(', ');
	const keyColumn = escape.columnName(key);
	const batchSize = 100;
	let lastKey: unknown;
	while (true) {
		let pageWhere = where;
		if (lastKey !== undefined) {
			pageWhere += `${where ? ' AND' : ' WHERE'} ${keyColumn} > :lastKey`;
		}
		const rows = await runQuery<JsonRow[]>(
			`SELECT ${columns} FROM ${escape.tableName(table)} ${pageWhere} ORDER BY ${keyColumn} LIMIT ${batchSize}`,
			{ lastKey },
		);
		for (const row of rows) {
			await visitJsonRow(ctx, table, key, jsonColumns, visit, row);
		}
		if (rows.length < batchSize) return;
		lastKey = rows[rows.length - 1][key];
	}
}

async function visitAgents(ctx: MigrationContext, visit: JsonVisitor) {
	await visitJsonRows(ctx, 'agents', 'id', ['schema', 'skills'], visit);
	await visitJsonRows(ctx, 'agent_history', 'versionId', ['schema', 'skills'], visit);
}

function visitInlineNodes(ctx: MigrationContext, nodes: unknown, visit: (inline: JsonRow) => void) {
	if (!Array.isArray(nodes)) return;
	for (const node of nodes) {
		if (
			!isRecord(node) ||
			node.type !== 'n8n-nodes-base.messageAnAgent' ||
			!isRecord(node.parameters)
		)
			continue;
		const raw = node.parameters.inlineAgent;
		let inline: unknown;
		try {
			inline = ctx.parseJson<unknown>(raw);
		} catch {
			continue;
		}
		if (!isRecord(inline)) continue;
		const before = JSON.stringify(inline);
		visit(inline);
		if (typeof raw === 'string' && JSON.stringify(inline) !== before) {
			node.parameters.inlineAgent = JSON.stringify(inline);
		}
	}
}

async function visitInlineAgents(ctx: MigrationContext, visit: (inline: JsonRow) => void) {
	const { escape } = ctx;
	for (const [table, key] of [
		['workflow_entity', 'id'],
		['workflow_history', 'versionId'],
	]) {
		await visitJsonRows(ctx, table, key, ['nodes'], (values) => {
			visitInlineNodes(ctx, values.nodes, visit);
		});
	}
	// Waiting executions resume from their own workflow snapshot.
	await visitJsonRows(
		ctx,
		'execution_data',
		'executionId',
		['workflowData'],
		(values) => {
			if (isRecord(values.workflowData)) visitInlineNodes(ctx, values.workflowData.nodes, visit);
		},
		`WHERE ${escape.columnName('executionId')} IN (
		SELECT ${escape.columnName('id')} FROM ${escape.tableName('execution_entity')}
		WHERE ${escape.columnName('status')} IN ('new', 'running', 'waiting')
	)`,
	);
}

function visitSkillCall(call: unknown, visit: IdVisitor) {
	if (!isRecord(call)) return;
	if (Array.isArray(call.activatedSkillIds)) {
		call.activatedSkillIds = call.activatedSkillIds.map((id) => visitId(id, visit));
	}
	if (call.toolName !== 'load_skill') return;
	if (isRecord(call.input) && 'skillId' in call.input) {
		call.input.skillId = visitId(call.input.skillId, visit);
	}
	if (isRecord(call.output) && 'skillId' in call.output) {
		call.output.skillId = visitId(call.output.skillId, visit);
	}
}

function visitMessageSkills(message: unknown, visit: IdVisitor) {
	if (!isRecord(message) || !Array.isArray(message.content)) return;
	for (const part of message.content) {
		if (isRecord(part) && part.type === 'tool-call') visitSkillCall(part, visit);
	}
}

function visitBackgroundSnapshotSkills(
	ctx: MigrationContext,
	persistence: unknown,
	visit: IdVisitor,
) {
	if (!isRecord(persistence) || !isRecord(persistence.hostMetadata)) return;
	const metadata = persistence.hostMetadata.n8nBackgroundSubAgent;
	if (!isRecord(metadata) || typeof metadata.runtimeSnapshot !== 'string') return;
	let snapshot: unknown;
	try {
		snapshot = ctx.parseJson<unknown>(metadata.runtimeSnapshot);
	} catch {
		ctx.logger.warn(`[${ctx.migrationName}] Skipped malformed background runtime snapshot.`);
		return;
	}
	if (!isRecord(snapshot)) return;
	const before = JSON.stringify(snapshot);
	snapshot.skills = visitKeys(snapshot.skills, visit);
	if (isRecord(snapshot.source)) {
		visitRefs(snapshot.source.config, 'skills', 'skill', visit);
	}
	const after = JSON.stringify(snapshot);
	if (after !== before) metadata.runtimeSnapshot = after;
}

async function visitSkillRuntimeState(ctx: MigrationContext, visit: IdVisitor) {
	await visitJsonRows(ctx, 'agent_checkpoints', 'runId', ['state'], ({ state }) => {
		if (!isRecord(state)) return;
		visitBackgroundSnapshotSkills(ctx, state.persistence, visit);
		if (isRecord(state.messageList)) {
			if (Array.isArray(state.messageList.activeSkillIds)) {
				state.messageList.activeSkillIds = state.messageList.activeSkillIds.map((id) =>
					visitId(id, visit),
				);
			}
			if (Array.isArray(state.messageList.messages)) {
				for (const message of state.messageList.messages) visitMessageSkills(message, visit);
			}
		}
		if (isRecord(state.pendingToolCalls)) {
			for (const call of Object.values(state.pendingToolCalls)) visitSkillCall(call, visit);
		}
	});
	await visitJsonRows(ctx, 'agents_messages', 'id', ['content', 'modelContent'], (values) => {
		for (const message of Object.values(values)) visitMessageSkills(message, visit);
	});
}

async function collectSkillIds(ctx: MigrationContext): Promise<IdMap> {
	const skills: IdMap = new Map();

	// Collect every version before allocation so a removed skill keeps its identity on restore.
	await visitAgents(ctx, (values) => {
		collectIds(skills, [...keys(values.skills), ...referenceIds(values.schema, 'skills', 'skill')]);
	});
	await visitInlineAgents(ctx, (inline) => {
		collectIds(skills, [...keys(inline.skills), ...referenceIds(inline.config, 'skills', 'skill')]);
	});
	await visitSkillRuntimeState(ctx, (id) => {
		skills.set(id, id);
		return id;
	});
	return allocateSkillIds(skills);
}

/**
 * The migration discards the skill ID mapping, so it cannot reverse normalization or random collision replacements.
 * Keep existing task IDs because they also identify retained sandboxes.
 */
export class NormalizeAgentSkillIds1791454646995 implements IrreversibleMigration {
	async up(ctx: MigrationContext) {
		const skills = await collectSkillIds(ctx);
		if (skills.size === 0) return;
		const normalizeId: IdVisitor = (id) => skills.get(id) ?? id;

		await visitAgents(ctx, (values) => {
			values.skills = visitKeys(values.skills, normalizeId);
			visitRefs(values.schema, 'skills', 'skill', normalizeId);
		});
		await visitInlineAgents(ctx, (inline) => {
			inline.skills = visitKeys(inline.skills, normalizeId);
			visitRefs(inline.config, 'skills', 'skill', normalizeId);
		});
		await visitSkillRuntimeState(ctx, normalizeId);
	}
}
