import type { INodeUi } from '@/Interface';
import type { INodeParameters, IWorkflowSettings } from 'n8n-workflow';
// eslint-disable-next-line import-x/extensions
import { useAIGatewayStore } from './aiGateway.store';

const GATEWAY_CREDENTIAL_TYPE = 'n8nAiGatewayApi';
const GATEWAY_CREDENTIAL_NAME = 'n8n AI Gateway';
const GATEWAY_NODE_TYPE = '@n8n/n8n-nodes-langchain.lmChatN8nAiGateway';

/**
 * Returns true if the node type is one of the LLM chat model nodes
 * that should be prepopulated with AI Gateway defaults.
 */
export function isLlmChatNode(nodeType: string): boolean {
	return nodeType.startsWith('@n8n/n8n-nodes-langchain.lmChat');
}

/**
 * Apply AI Gateway credential to a newly-created gateway LLM node.
 * Only mutates when the node is a gateway node and credential is not already set.
 */
export function applyAIGatewayDefaultsToLlmNode(
	node: INodeUi,
	_workflowSettings?: IWorkflowSettings,
): void {
	if (node.type !== GATEWAY_NODE_TYPE) return;

	const store = useAIGatewayStore();
	store.initialize();

	if (node.credentials?.[GATEWAY_CREDENTIAL_TYPE]) return;

	node.credentials = {
		...node.credentials,
		[GATEWAY_CREDENTIAL_TYPE]: {
			id: null,
			name: GATEWAY_CREDENTIAL_NAME,
		},
	};
}

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
		credentials: {
			[GATEWAY_CREDENTIAL_TYPE]: {
				id: null,
				name: GATEWAY_CREDENTIAL_NAME,
			},
		},
	};
}
