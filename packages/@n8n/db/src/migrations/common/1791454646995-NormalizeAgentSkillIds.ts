import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { isRecord } from '@n8n/utils/is-record';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

type IdMap = Map<string, string>;
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
	throw new Error('Could not generate a unique agent resource ID');
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
	const { escape, runInBatches } = ctx;
	const columns = [key, ...jsonColumns].map(escape.columnName).join(', ');
	await runInBatches<JsonRow>(
		`SELECT ${columns} FROM ${escape.tableName(table)} ${where} ORDER BY ${escape.columnName(key)}`,
		async (rows) => {
			for (const row of rows) {
				await visitJsonRow(ctx, table, key, jsonColumns, visit, row);
			}
		},
	);
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
	const inlineNodes = `WHERE CAST(${escape.columnName('nodes')} AS TEXT) LIKE '%n8n-nodes-base.messageAnAgent%'`;
	for (const [table, key] of [
		['workflow_entity', 'id'],
		['workflow_history', 'versionId'],
	]) {
		await visitJsonRows(
			ctx,
			table,
			key,
			['nodes'],
			(values) => {
				visitInlineNodes(ctx, values.nodes, visit);
			},
			inlineNodes,
		);
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

function replaceSkillCall(call: unknown, skills: IdMap) {
	if (!isRecord(call)) return;
	if (Array.isArray(call.activatedSkillIds)) {
		call.activatedSkillIds = call.activatedSkillIds.map((id) => replaceId(id, skills));
	}
	if (call.toolName !== 'load_skill') return;
	if (isRecord(call.input)) {
		for (const field of ['skillId', 'name']) {
			if (field in call.input) call.input[field] = replaceId(call.input[field], skills);
		}
	}
	if (isRecord(call.output) && 'skillId' in call.output) {
		call.output.skillId = replaceId(call.output.skillId, skills);
	}
}

function replaceMessageSkills(message: unknown, skills: IdMap) {
	if (!isRecord(message) || !Array.isArray(message.content)) return;
	for (const part of message.content) {
		if (isRecord(part) && part.type === 'tool-call') replaceSkillCall(part, skills);
	}
}

function replaceBackgroundSnapshotSkills(
	ctx: MigrationContext,
	persistence: unknown,
	skills: IdMap,
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
	snapshot.skills = replaceKeys(snapshot.skills, skills);
	if (isRecord(snapshot.source)) {
		replaceRefs(snapshot.source.config, 'skills', 'skill', skills);
	}
	const after = JSON.stringify(snapshot);
	if (after !== before) metadata.runtimeSnapshot = after;
}

async function migrateSkillRuntimeState(ctx: MigrationContext, skills: IdMap) {
	await visitJsonRows(ctx, 'agent_checkpoints', 'runId', ['state'], ({ state }) => {
		if (!isRecord(state)) return;
		replaceBackgroundSnapshotSkills(ctx, state.persistence, skills);
		if (isRecord(state.messageList)) {
			if (Array.isArray(state.messageList.activeSkillIds)) {
				state.messageList.activeSkillIds = state.messageList.activeSkillIds.map((id) =>
					replaceId(id, skills),
				);
			}
			if (Array.isArray(state.messageList.messages)) {
				for (const message of state.messageList.messages) replaceMessageSkills(message, skills);
			}
		}
		if (isRecord(state.pendingToolCalls)) {
			for (const call of Object.values(state.pendingToolCalls)) replaceSkillCall(call, skills);
		}
	});
	await visitJsonRows(ctx, 'agents_messages', 'id', ['content', 'modelContent'], (values) => {
		for (const message of Object.values(values)) replaceMessageSkills(message, skills);
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
	return allocateSkillIds(skills);
}

/** Keep existing task IDs because they also identify retained sandboxes. */
export class NormalizeAgentSkillIds1791454646995 implements IrreversibleMigration {
	async up(ctx: MigrationContext) {
		const skills = await collectSkillIds(ctx);
		if (skills.size === 0) return;

		await visitAgents(ctx, (values) => {
			values.skills = replaceKeys(values.skills, skills);
			replaceRefs(values.schema, 'skills', 'skill', skills);
		});
		await visitInlineAgents(ctx, (inline) => {
			inline.skills = replaceKeys(inline.skills, skills);
			replaceRefs(inline.config, 'skills', 'skill', skills);
		});
		await migrateSkillRuntimeState(ctx, skills);
	}
}
