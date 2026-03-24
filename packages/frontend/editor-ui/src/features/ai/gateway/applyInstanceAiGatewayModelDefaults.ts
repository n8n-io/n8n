import type { INodeTypeDescription } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
// eslint-disable-next-line import-x/extensions
import { useAIGatewayStore } from './aiGateway.store';
import { AI_GATEWAY_INSTANCE_DEFAULT_MODELS } from './aiGatewayInstanceDefaults';
import { isOpenRouterAiGatewayAppNode } from './openRouterAiGatewayAppDefaults';

const LM_CHAT_GATEWAY_SUFFIX = 'lmChatN8nAiGateway';

/**
 * After `resolveNodeParameters`, applies instance-level default model ids from
 * Settings → AI Gateway so new nodes match the configured defaults.
 */
export function applyInstanceAiGatewayModelDefaults(
	node: INodeUi,
	nodeTypeDescription: INodeTypeDescription,
): void {
	const store = useAIGatewayStore();

	if (node.type.endsWith(LM_CHAT_GATEWAY_SUFFIX)) {
		const model = store.defaultChatModel ?? AI_GATEWAY_INSTANCE_DEFAULT_MODELS.chat;
		node.parameters = { ...node.parameters, model };
		return;
	}

	if (isOpenRouterAiGatewayAppNode(nodeTypeDescription, node.type)) {
		const resource = (node.parameters.resource as string) ?? 'text';
		let model: string;
		switch (resource) {
			case 'text':
				model = store.defaultTextModel ?? AI_GATEWAY_INSTANCE_DEFAULT_MODELS.text;
				break;
			case 'image':
				model = store.defaultImageModel ?? AI_GATEWAY_INSTANCE_DEFAULT_MODELS.image;
				break;
			case 'file':
				model = store.defaultFileModel ?? AI_GATEWAY_INSTANCE_DEFAULT_MODELS.file;
				break;
			case 'audio':
				model = store.defaultAudioModel ?? AI_GATEWAY_INSTANCE_DEFAULT_MODELS.audio;
				break;
			default:
				model = store.defaultTextModel ?? AI_GATEWAY_INSTANCE_DEFAULT_MODELS.text;
		}
		node.parameters = { ...node.parameters, model };
	}
}
