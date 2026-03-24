import type { INodeTypeDescription } from 'n8n-workflow';
import { getActivePinia } from 'pinia';
// eslint-disable-next-line import-x/extensions
import { useAIGatewayStore } from './aiGateway.store';
import { AI_GATEWAY_INSTANCE_DEFAULT_MODELS } from './aiGatewayInstanceDefaults';

/**
 * Per-resource fallback model ids (when instance settings are unavailable).
 *
 * Keep in sync with:
 * `packages/@n8n/nodes-langchain/nodes/vendors/AiGateway/helpers/modelParams.ts`
 */
export const AI_GATEWAY_MODEL_DEFAULTS: Record<string, string> = {
	text: AI_GATEWAY_INSTANCE_DEFAULT_MODELS.text,
	image: AI_GATEWAY_INSTANCE_DEFAULT_MODELS.image,
	file: AI_GATEWAY_INSTANCE_DEFAULT_MODELS.file,
	audio: AI_GATEWAY_INSTANCE_DEFAULT_MODELS.audio,
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
 * Uses instance defaults from Settings → AI Gateway when available.
 */
export function getAiGatewayDefaultModelForResource(resource: string): string | undefined {
	const pinia = getActivePinia();
	if (!pinia) {
		return AI_GATEWAY_MODEL_DEFAULTS[resource];
	}
	const store = useAIGatewayStore(pinia);
	switch (resource) {
		case 'text':
			return store.defaultTextModel ?? AI_GATEWAY_MODEL_DEFAULTS.text;
		case 'image':
			return store.defaultImageModel ?? AI_GATEWAY_MODEL_DEFAULTS.image;
		case 'file':
			return store.defaultFileModel ?? AI_GATEWAY_MODEL_DEFAULTS.file;
		case 'audio':
			return store.defaultAudioModel ?? AI_GATEWAY_MODEL_DEFAULTS.audio;
		default:
			return undefined;
	}
}
