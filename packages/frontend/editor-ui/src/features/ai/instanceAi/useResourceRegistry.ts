import { computed } from 'vue';
import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
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

// ---------------------------------------------------------------------------
// Internal helpers (defined before use to satisfy no-use-before-define)
// ---------------------------------------------------------------------------

interface Collections {
	/** Resources produced/mutated by the agent in this thread, keyed by resource ID. */
	produced: Map<string, ResourceEntry>;
	/** Every resource seen in any tool call, keyed by lowercased name — for markdown linking. */
	byName: Map<string, ResourceEntry>;
}

function optionalString(val: unknown): string | undefined {
	return typeof val === 'string' ? val : undefined;
}

/**
 * Upsert a produced artifact. When an entry for the same `id` already exists,
 * optional fields provided by the new call win; fields it omits are preserved
 * from the existing entry. Callers are responsible for resolving `name` using
 * the existing entry as a fallback so partial updates (e.g. a patch
 * `build-workflow` call that carries only a `workflowId`) don't regress a
 * known name to 'Untitled'.
 */
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

/** Tools whose results may contain resource info (workflows, credentials, data tables). */
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

function extractFromToolCall(tc: InstanceAiToolCallState, col: Collections): void {
	if (!ARTIFACT_TOOLS.has(tc.toolName)) return;
	if (!tc.result || typeof tc.result !== 'object') return;
	const result = tc.result as Record<string, unknown>;

	// --- Workflows --------------------------------------------------------
	// List result: { workflows: [{ id, name }, ...] } — index by name only.
	if (Array.isArray(result.workflows)) {
		for (const wf of result.workflows as Array<Record<string, unknown>>) {
			const entry = entryFromListItem('workflow', wf);
			if (entry) indexByName(col, entry);
		}
	}

	// build-workflow / build-workflow-with-agent / submit-workflow:
	// { workflowId, workflowName? } — produced. Patch calls may omit the name,
	// so fall back to the existing entry before regressing to 'Untitled'.
	if (typeof result.workflowId === 'string') {
		const existing = col.produced.get(result.workflowId);
		const name =
			optionalString(result.workflowName) ??
			optionalString(tc.args?.name) ??
			existing?.name ??
			'Untitled';
		recordProduced(col, { type: 'workflow', id: result.workflowId, name });
	}

	// Single workflow object: { workflow: { id, name, ... } } — produced.
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

	// --- Credentials -----------------------------------------------------
	// Credentials never show in the panel; only needed for name linking.
	if (Array.isArray(result.credentials)) {
		for (const cred of result.credentials as Array<Record<string, unknown>>) {
			const entry = entryFromListItem('credential', cred);
			if (entry) indexByName(col, entry);
		}
	}

	// --- Data tables -----------------------------------------------------
	// List results — index by name only.
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

	// Singular data table (e.g. data-tables action=create) — produced.
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

	// Data table mutation results (insert/update/delete-data-table-rows):
	// { dataTableId, projectId, tableName? } — produced. Preserves an
	// existing name if the mutation result doesn't carry `tableName`.
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

function collectFromAgentNode(node: InstanceAiAgentNode, col: Collections): void {
	for (const tc of node.toolCalls) {
		extractFromToolCall(tc, col);
	}
	for (const child of node.children) {
		collectFromAgentNode(child, col);
	}
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

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Scans tool-call results in the conversation and returns two collections:
 *
 * - `producedArtifacts` (keyed by resource id) — things the agent built,
 *   submitted, created, or mutated. Powers the Artifacts panel and the
 *   canvas preview tabs. Repeated writes to the same resource update the
 *   existing entry instead of creating a duplicate.
 *
 * - `resourceNameIndex` (keyed by lowercased name) — every named resource
 *   seen in any tool call, including list results. Used only for markdown
 *   name→link replacement so references to listed workflows/tables still
 *   resolve.
 */
export function useResourceRegistry(
	messages: () => InstanceAiMessage[],
	workflowNameLookup?: (id: string) => string | undefined,
	archivedWorkflowIds?: () => ReadonlySet<string>,
) {
	const collections = computed((): Collections => {
		const col: Collections = {
			produced: new Map<string, ResourceEntry>(),
			byName: new Map<string, ResourceEntry>(),
		};

		for (const msg of messages()) {
			if (!msg.agentTree) continue;
			collectFromAgentNode(msg.agentTree, col);
		}

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

	return {
		producedArtifacts: computed(() => collections.value.produced),
		resourceNameIndex: computed(() => collections.value.byName),
	};
}
