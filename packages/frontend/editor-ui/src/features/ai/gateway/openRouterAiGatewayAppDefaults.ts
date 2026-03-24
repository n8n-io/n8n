import type { INodeTypeDescription } from 'n8n-workflow';

/**
 * Per-resource default model ids for the AI Gateway app node (`openRouterAiGateway`).
 *
 * Keep in sync with:
 * `packages/@n8n/nodes-langchain/nodes/vendors/AiGateway/helpers/modelParams.ts`
 */
export const AI_GATEWAY_MODEL_DEFAULTS: Record<string, string> = {
	text: 'openai/gpt-4.1-mini',
	image: 'google/gemini-2.5-flash-image',
	file: 'anthropic/claude-sonnet-4',
	audio: 'openai/gpt-4o-mini-transcribe',
};

const AI_GATEWAY_APP_NODE_SUFFIX = 'openRouterAiGateway';

export function isOpenRouterAiGatewayAppNode(
	nodeTypeDescription: INodeTypeDescription | null | undefined,
	nodeWorkflowType: string,
): boolean {
	if (!nodeTypeDescription) return false;
	return (
		nodeTypeDescription.name.endsWith(AI_GATEWAY_APP_NODE_SUFFIX) ||
		nodeWorkflowType.endsWith(AI_GATEWAY_APP_NODE_SUFFIX)
	);
}

/**
 * Returns the default model id for a given resource, or undefined if the resource is unknown.
 * Used by the frontend to reset `model` when the user switches the `resource` dropdown.
 */
export function getAiGatewayDefaultModelForResource(resource: string): string | undefined {
	return AI_GATEWAY_MODEL_DEFAULTS[resource];
}
