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
}

// ---------------------------------------------------------------------------
// Internal helpers (defined before use to satisfy no-use-before-define)
// ---------------------------------------------------------------------------

function registerResource(
	map: Map<string, ResourceEntry>,
	type: ResourceEntry['type'],
	obj: Record<string, unknown>,
): void {
	if (typeof obj.name === 'string' && typeof obj.id === 'string') {
		const entry: ResourceEntry = { type, id: obj.id, name: obj.name };
		if (typeof obj.createdAt === 'string') entry.createdAt = obj.createdAt;
		if (typeof obj.updatedAt === 'string') entry.updatedAt = obj.updatedAt;
		if (typeof obj.projectId === 'string') entry.projectId = obj.projectId;
		map.set(obj.name.toLowerCase(), entry);
	}
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

function extractFromToolCall(tc: InstanceAiToolCallState, map: Map<string, ResourceEntry>): void {
	if (!ARTIFACT_TOOLS.has(tc.toolName)) return;
	if (!tc.result || typeof tc.result !== 'object') return;
	const result = tc.result as Record<string, unknown>;

	// --- Workflows --------------------------------------------------------
	// Tool results that list workflows: { workflows: [{ id, name }, ...] }
	if (Array.isArray(result.workflows)) {
		for (const wf of result.workflows as Array<Record<string, unknown>>) {
			registerResource(map, 'workflow', wf);
		}
	}

	// build-workflow / build-workflow-with-agent result:
	// { workflowId: "...", workflowName?: "..." }
	if (typeof result.workflowId === 'string') {
		const name =
			typeof result.workflowName === 'string'
				? result.workflowName
				: typeof tc.args?.name === 'string'
					? tc.args.name
					: undefined;

		const resolvedName = name ?? 'Untitled';
		// Key by workflowId when unnamed to avoid collisions between multiple
		// unnamed workflows that would all map to the "untitled" key.
		const key = name ? name.toLowerCase() : result.workflowId;
		map.set(key, {
			type: 'workflow',
			id: result.workflowId,
			name: resolvedName,
		});
	}

	// Single workflow object: { workflow: { id, name } }
	if (result.workflow && typeof result.workflow === 'object') {
		registerResource(map, 'workflow', result.workflow as Record<string, unknown>);
	}

	// --- Credentials -----------------------------------------------------
	if (Array.isArray(result.credentials)) {
		for (const cred of result.credentials as Array<Record<string, unknown>>) {
			registerResource(map, 'credential', cred);
		}
	}

	// --- Data tables -----------------------------------------------------
	if (Array.isArray(result.tables)) {
		for (const table of result.tables as Array<Record<string, unknown>>) {
			registerResource(map, 'data-table', table);
		}
	}
	if (Array.isArray(result.dataTables)) {
		for (const table of result.dataTables as Array<Record<string, unknown>>) {
			registerResource(map, 'data-table', table);
		}
	}

	// Singular data table (e.g. create-data-table result)
	if (result.table && typeof result.table === 'object') {
		registerResource(map, 'data-table', result.table as Record<string, unknown>);
	}

	// Data table mutation results (insert/update/delete-data-table-rows)
	// These return { dataTableId, projectId } without a nested table object.
	// Merge projectId into existing registry entry or create a minimal one.
	if (typeof result.dataTableId === 'string' && typeof result.projectId === 'string') {
		const existingEntry = [...map.values()].find(
			(e) => e.type === 'data-table' && e.id === result.dataTableId,
		);
		if (existingEntry) {
			existingEntry.projectId = result.projectId as string;
		} else {
			const tableName =
				typeof result.tableName === 'string' ? result.tableName : (result.dataTableId as string);
			map.set(tableName.toLowerCase(), {
				type: 'data-table',
				id: result.dataTableId as string,
				name: tableName,
				projectId: result.projectId as string,
			});
		}
	}
}

function collectFromAgentNode(node: InstanceAiAgentNode, map: Map<string, ResourceEntry>): void {
	for (const tc of node.toolCalls) {
		extractFromToolCall(tc, map);
	}
	for (const child of node.children) {
		collectFromAgentNode(child, map);
	}
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Scans all tool-call results in the conversation to build a registry of
 * known resource names (workflows, credentials, data tables) and their IDs.
 *
 * The registry key is the **lowercase** name so lookups during markdown
 * post-processing are case-insensitive.
 */
export function useResourceRegistry(
	messages: () => InstanceAiMessage[],
	workflowNameLookup?: (id: string) => string | undefined,
) {
	const registry = computed(() => {
		const map = new Map<string, ResourceEntry>();

		for (const msg of messages()) {
			if (!msg.agentTree) continue;
			collectFromAgentNode(msg.agentTree, map);
		}

		// Enrich workflow names from the store when the registry only has a
		// fallback (e.g. 'Untitled' from a patch-only build-workflow call).
		if (workflowNameLookup) {
			for (const [key, entry] of map) {
				if (entry.type !== 'workflow') continue;
				const storeName = workflowNameLookup(entry.id);
				if (storeName && storeName !== entry.name) {
					map.delete(key);
					map.set(storeName.toLowerCase(), { ...entry, name: storeName });
				}
			}
		}

		return map;
	});

	return { registry };
}
