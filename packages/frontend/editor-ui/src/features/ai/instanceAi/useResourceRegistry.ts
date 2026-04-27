import { computed } from 'vue';
import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
	InstanceAiWorkflowReferences,
} from '@n8n/api-types';

export interface ResourceEntry {
	type: 'workflow' | 'credential' | 'data-table';
	id: string;
	name: string;
	createdAt?: string;
	updatedAt?: string;
	projectId?: string;
	/**
	 * Set to true when the run-finish reap archived this workflow — a
	 * stepping-stone the agent created but never promoted to the main
	 * deliverable. The artifacts panel renders these as dimmed with an
	 * "Archived" label.
	 */
	archived?: boolean;
}

interface Collections {
	produced: Map<string, ResourceEntry>;
	byName: Map<string, ResourceEntry>;
	refsByWorkflow: Map<string, Map<string, ResourceEntry>>;
}

function optionalString(val: unknown): string | undefined {
	return typeof val === 'string' ? val : undefined;
}

function recordProduced(col: Collections, entry: ResourceEntry): void {
	const existing = col.produced.get(entry.id);
	const merged: ResourceEntry = existing
		? {
				type: entry.type,
				id: entry.id,
				name: entry.name,
				createdAt: entry.createdAt ?? existing.createdAt,
				updatedAt: entry.updatedAt ?? existing.updatedAt,
				projectId: entry.projectId ?? existing.projectId,
			}
		: entry;
	col.produced.set(entry.id, merged);
	if (existing && existing.name.toLowerCase() !== merged.name.toLowerCase()) {
		col.byName.delete(existing.name.toLowerCase());
	}
	col.byName.set(merged.name.toLowerCase(), merged);
}

function indexByName(col: Collections, entry: ResourceEntry): void {
	col.byName.set(entry.name.toLowerCase(), entry);
}

function recordReferencesForWorkflow(col: Collections, refs: InstanceAiWorkflowReferences): void {
	const inner = new Map<string, ResourceEntry>();
	for (const t of refs.referencedDataTables) {
		const entry: ResourceEntry = {
			type: 'data-table',
			id: t.id,
			name: t.name,
			projectId: t.projectId,
		};
		inner.set(t.id, entry);
		indexByName(col, entry);
	}
	for (const c of refs.appliedCredentials) {
		const entry: ResourceEntry = { type: 'credential', id: c.id, name: c.name };
		inner.set(c.id, entry);
		indexByName(col, entry);
	}
	col.refsByWorkflow.set(refs.workflowId, inner);
}

function entryFromListItem(
	type: ResourceEntry['type'],
	obj: Record<string, unknown>,
): ResourceEntry | undefined {
	if (typeof obj.name !== 'string' || typeof obj.id !== 'string') return undefined;
	const entry: ResourceEntry = { type, id: obj.id, name: obj.name };
	const createdAt = optionalString(obj.createdAt);
	const updatedAt = optionalString(obj.updatedAt);
	const projectId = optionalString(obj.projectId);
	if (createdAt !== undefined) entry.createdAt = createdAt;
	if (updatedAt !== undefined) entry.updatedAt = updatedAt;
	if (projectId !== undefined) entry.projectId = projectId;
	return entry;
}

const ARTIFACT_TOOLS = new Set([
	'build-workflow',
	'build-workflow-with-agent',
	'submit-workflow',
	'apply-workflow-credentials',
	'workflows',
	'credentials',
	'data-tables',
	'data-table-agent',
	'insert-data-table-rows',
	'update-data-table-rows',
	'delete-data-table-rows',
]);

function isWorkflowReferences(val: unknown): val is InstanceAiWorkflowReferences {
	if (!val || typeof val !== 'object') return false;
	const r = val as Partial<InstanceAiWorkflowReferences>;
	return (
		typeof r.workflowId === 'string' &&
		Array.isArray(r.referencedDataTables) &&
		Array.isArray(r.appliedCredentials)
	);
}

function extractFromToolCall(tc: InstanceAiToolCallState, col: Collections): void {
	if (!ARTIFACT_TOOLS.has(tc.toolName)) return;
	if (!tc.result || typeof tc.result !== 'object') return;
	const result = tc.result as Record<string, unknown>;

	if (isWorkflowReferences(result.references)) {
		recordReferencesForWorkflow(col, result.references);
	}

	if (Array.isArray(result.workflows)) {
		for (const wf of result.workflows as Array<Record<string, unknown>>) {
			const entry = entryFromListItem('workflow', wf);
			if (entry) indexByName(col, entry);
		}
	}

	if (typeof result.workflowId === 'string') {
		const existing = col.produced.get(result.workflowId);
		const name =
			optionalString(result.workflowName) ??
			optionalString(tc.args?.name) ??
			existing?.name ??
			'Untitled';
		recordProduced(col, { type: 'workflow', id: result.workflowId, name });
	}

	if (result.workflow && typeof result.workflow === 'object') {
		const obj = result.workflow as Record<string, unknown>;
		if (typeof obj.id === 'string') {
			const existing = col.produced.get(obj.id);
			const name = optionalString(obj.name) ?? existing?.name ?? 'Untitled';
			const entry: ResourceEntry = { type: 'workflow', id: obj.id, name };
			const createdAt = optionalString(obj.createdAt);
			const updatedAt = optionalString(obj.updatedAt);
			const projectId = optionalString(obj.projectId);
			if (createdAt !== undefined) entry.createdAt = createdAt;
			if (updatedAt !== undefined) entry.updatedAt = updatedAt;
			if (projectId !== undefined) entry.projectId = projectId;
			recordProduced(col, entry);
		}
	}

	if (Array.isArray(result.credentials)) {
		for (const cred of result.credentials as Array<Record<string, unknown>>) {
			const entry = entryFromListItem('credential', cred);
			if (entry) indexByName(col, entry);
		}
	}

	if (Array.isArray(result.tables)) {
		for (const table of result.tables as Array<Record<string, unknown>>) {
			const entry = entryFromListItem('data-table', table);
			if (entry) indexByName(col, entry);
		}
	}
	if (Array.isArray(result.dataTables)) {
		for (const table of result.dataTables as Array<Record<string, unknown>>) {
			const entry = entryFromListItem('data-table', table);
			if (entry) indexByName(col, entry);
		}
	}

	if (result.table && typeof result.table === 'object') {
		const obj = result.table as Record<string, unknown>;
		if (typeof obj.id === 'string') {
			const existing = col.produced.get(obj.id);
			const name = optionalString(obj.name) ?? existing?.name ?? obj.id;
			const entry: ResourceEntry = { type: 'data-table', id: obj.id, name };
			const createdAt = optionalString(obj.createdAt);
			const updatedAt = optionalString(obj.updatedAt);
			const projectId = optionalString(obj.projectId);
			if (createdAt !== undefined) entry.createdAt = createdAt;
			if (updatedAt !== undefined) entry.updatedAt = updatedAt;
			if (projectId !== undefined) entry.projectId = projectId;
			recordProduced(col, entry);
		}
	}

	if (typeof result.dataTableId === 'string' && typeof result.projectId === 'string') {
		const existing = col.produced.get(result.dataTableId);
		const name = optionalString(result.tableName) ?? existing?.name ?? result.dataTableId;
		recordProduced(col, {
			type: 'data-table',
			id: result.dataTableId,
			name,
			projectId: result.projectId,
		});
	}
}

function collectToolCalls(node: InstanceAiAgentNode, out: InstanceAiToolCallState[]): void {
	for (const tc of node.toolCalls) out.push(tc);
	for (const child of node.children) collectToolCalls(child, out);
}

function compareByStartedAt(a: InstanceAiToolCallState, b: InstanceAiToolCallState): number {
	if (a.startedAt && b.startedAt) {
		if (a.startedAt < b.startedAt) return -1;
		if (a.startedAt > b.startedAt) return 1;
		return 0;
	}
	if (a.startedAt) return -1;
	if (b.startedAt) return 1;
	return 0;
}

function enrichWorkflowNames(
	col: Collections,
	workflowNameLookup: (id: string) => string | undefined,
): void {
	for (const entry of col.produced.values()) {
		if (entry.type !== 'workflow') continue;
		const storeName = workflowNameLookup(entry.id);
		if (storeName && storeName !== entry.name) {
			col.byName.delete(entry.name.toLowerCase());
			entry.name = storeName;
			col.byName.set(storeName.toLowerCase(), entry);
		}
	}
}

export function useResourceRegistry(
	messages: () => InstanceAiMessage[],
	workflowNameLookup?: (id: string) => string | undefined,
	archivedWorkflowIds?: () => ReadonlySet<string>,
) {
	const collections = computed((): Collections => {
		const col: Collections = {
			produced: new Map<string, ResourceEntry>(),
			byName: new Map<string, ResourceEntry>(),
			refsByWorkflow: new Map<string, Map<string, ResourceEntry>>(),
		};

		const toolCalls: InstanceAiToolCallState[] = [];
		for (const msg of messages()) {
			if (!msg.agentTree) continue;
			collectToolCalls(msg.agentTree, toolCalls);
		}
		toolCalls.sort(compareByStartedAt);
		for (const tc of toolCalls) extractFromToolCall(tc, col);

		if (workflowNameLookup) {
			enrichWorkflowNames(col, workflowNameLookup);
		}

		const archived = archivedWorkflowIds?.();
		if (archived && archived.size > 0) {
			for (const entry of col.produced.values()) {
				if (entry.type === 'workflow' && archived.has(entry.id)) {
					entry.archived = true;
				}
			}
		}

		return col;
	});

	const referencedArtifacts = computed((): Map<string, ResourceEntry> => {
		const result = new Map<string, ResourceEntry>();
		for (const inner of collections.value.refsByWorkflow.values()) {
			for (const [id, entry] of inner) {
				if (collections.value.produced.has(id)) continue;
				result.set(id, entry);
			}
		}
		return result;
	});

	return {
		producedArtifacts: computed(() => collections.value.produced),
		referencedArtifacts,
		resourceNameIndex: computed(() => collections.value.byName),
	};
}
