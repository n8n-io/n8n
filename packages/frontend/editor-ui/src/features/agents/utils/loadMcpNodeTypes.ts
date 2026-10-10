import type { AgentJsonMcpServerConfig } from '@n8n/api-types';

import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

const requestedNodeTypes = new Set<string>();
const failedNodeTypes = new Set<string>();
const pendingNames = new Set<string>();
let pendingLoad: Promise<void> | undefined;

/** Fetch missing node types once. Retry failed fetches when the user opens the modal. */
export function loadMissingMcpNodeTypes(
	servers: AgentJsonMcpServerConfig[],
	store: ReturnType<typeof useNodeTypesStore>,
	options: { retryFailed?: boolean } = {},
): Promise<void> | undefined {
	const missingNames = servers
		.map((server) => server.metadata?.nodeTypeName ?? AI_MCP_TOOL_NODE_TYPE)
		.filter((name) => !store.getNodeType(name));
	if (missingNames.length === 0) return undefined;

	const unrequestedNames = missingNames.filter(
		(name) => !requestedNodeTypes.has(name) || (options.retryFailed && failedNodeTypes.has(name)),
	);
	if (unrequestedNames.length === 0) return pendingLoad ?? Promise.resolve();
	unrequestedNames.forEach((name) => {
		requestedNodeTypes.add(name);
		failedNodeTypes.delete(name);
		pendingNames.add(name);
	});
	pendingLoad ??= store
		.getNodeTypes()
		.catch((error: unknown) => {
			pendingNames.forEach((name) => failedNodeTypes.add(name));
			throw error;
		})
		.finally(() => {
			pendingLoad = undefined;
			pendingNames.clear();
		});
	return pendingLoad;
}
