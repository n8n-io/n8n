import type { INodeUi } from '@/Interface';
import type { INodeParameters, IWorkflowSettings } from 'n8n-workflow';
// eslint-disable-next-line import-x/extensions
import { useAIGatewayStore } from './aiGateway.store';

const GATEWAY_NODE_TYPE = '@n8n/n8n-nodes-langchain.lmChatN8nAiGateway';

/**
 * Returns true if the node type is one of the LLM chat model nodes
 * that should be prepopulated with AI Gateway defaults.
 */
export function isLlmChatNode(nodeType: string): boolean {
	return nodeType.startsWith('@n8n/n8n-nodes-langchain.lmChat');
}

/**
 * No-op: the gateway node no longer requires credential assignment.
 * Kept for API compatibility with callers.
 */
export function applyAIGatewayDefaultsToLlmNode(
	_node: INodeUi,
	_workflowSettings?: IWorkflowSettings,
): void {}

/**
 * Returns the node type + parameters for creating the gateway LLM node.
 * Always returns the dedicated lmChatN8nAiGateway node — no provider mapping needed.
 */
export async function getGatewayLlmNodeData(_workflowSettings?: IWorkflowSettings): Promise<{
	type: string;
	parameters: INodeParameters;
	credentials: Record<string, { id: string | null; name: string }>;
} | null> {
	const store = useAIGatewayStore();
	await store.initialize();

	if (!store.enabled) return null;

	return {
		type: GATEWAY_NODE_TYPE,
		parameters: {},
		credentials: {},
	};
}
