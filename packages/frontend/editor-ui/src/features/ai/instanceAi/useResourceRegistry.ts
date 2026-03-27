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
	'setup-workflow',
	'publish-workflow',
	'apply-workflow-credentials',
	'setup-credentials',
	'create-data-table',
	'data-table-agent',
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

		if (typeof name === 'string') {
			map.set(name.toLowerCase(), { type: 'workflow', id: result.workflowId, name });
		}
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
export function useResourceRegistry(messages: () => InstanceAiMessage[]) {
	const registry = computed(() => {
		const map = new Map<string, ResourceEntry>();

		for (const msg of messages()) {
			if (!msg.agentTree) continue;
			collectFromAgentNode(msg.agentTree, map);
		}

		return map;
	});

	return { registry };
}
