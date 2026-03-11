import type { INodeUi } from '@/Interface';
import type { INodeParameters, IWorkflowSettings } from 'n8n-workflow';
// eslint-disable-next-line import-x/extensions
import { useAIGatewayStore } from './aiGateway.store';

const LLM_CHAT_NODE_PREFIX = '@n8n/n8n-nodes-langchain.lmChat';

/**
 * Returns true if the node type is one of the LLM chat model nodes
 * that should be prepopulated with AI Gateway defaults.
 */
export function isLlmChatNode(nodeType: string): boolean {
	return nodeType.startsWith(LLM_CHAT_NODE_PREFIX);
}

/**
 * Resolve the effective model ID and provider mapping by checking
 * workflow-level category override first, then falling back to global.
 */
function resolveEffectiveModel(
	store: ReturnType<typeof useAIGatewayStore>,
	workflowSettings?: IWorkflowSettings,
) {
	const workflowCategory = workflowSettings?.aiGatewayCategory;
	if (workflowCategory && workflowCategory !== 'DEFAULT') {
		const workflowModel = workflowSettings?.aiGatewayModel;
		const modelId = workflowModel || store.resolveModelForCategory(workflowCategory);
		return {
			modelId,
			mapping: store.getProviderNodeMappingForModel(modelId),
		};
	}
	return {
		modelId: store.selectedModel,
		mapping: store.getProviderNodeMapping(),
	};
}

/**
 * Apply AI Gateway default model and credential to a newly-created LLM node.
 * Only mutates when the node's model parameter is empty / at default.
 */
export function applyAIGatewayDefaultsToLlmNode(
	node: INodeUi,
	workflowSettings?: IWorkflowSettings,
): void {
	const store = useAIGatewayStore();
	store.initialize();

	const { modelId, mapping } = resolveEffectiveModel(store, workflowSettings);

	if (!modelId) return;
	if (node.type !== mapping.nodeType) return;

	const currentModel = node.parameters?.model as string | undefined;
	if (currentModel && currentModel !== '') return;

	node.parameters = {
		...node.parameters,
		model: modelId,
	};

	node.credentials = {
		...node.credentials,
		[mapping.credentialType]: {
			id: 'n8nAiGateway',
			name: 'N8n AI Gateway',
		},
	};
}

/**
 * Returns the node type + parameters for creating an LLM node
 * that matches the current AI Gateway selection.
 */
export function getGatewayLlmNodeData(workflowSettings?: IWorkflowSettings): {
	type: string;
	parameters: INodeParameters;
	credentials: Record<string, { id: string | null; name: string }>;
} | null {
	const store = useAIGatewayStore();
	store.initialize();

	const { modelId, mapping } = resolveEffectiveModel(store, workflowSettings);

	if (!modelId) return null;

	return {
		type: mapping.nodeType,
		parameters: {
			model: modelId,
		},
		credentials: {
			[mapping.credentialType]: {
				id: 'n8nAiGateway',
				name: 'N8n AI Gateway',
			},
		},
	};
}
