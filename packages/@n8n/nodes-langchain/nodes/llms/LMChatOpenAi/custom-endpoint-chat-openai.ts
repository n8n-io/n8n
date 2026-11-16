import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI, ChatOpenAICompletions, type ChatOpenAIFields } from '@langchain/openai';

import { wrapChatModelMessageInput } from '@utils/chatModelMessageWrapper';

const customEndpointModels = new WeakMap<ChatOpenAI, ChatOpenAIFields>();

export function registerCustomEndpointChatModel(model: ChatOpenAI, fields: ChatOpenAIFields) {
	customEndpointModels.set(model, fields);
}

// Agent v2 uses this adapter. Other consumers keep the model's selected API.
export function resolveCustomEndpointChatModel(model: BaseChatModel | null | undefined) {
	if (!(model instanceof ChatOpenAI) || !model.useResponsesApi) return model;
	const fields = customEndpointModels.get(model);
	if (!fields) return model;

	// Keep explicit Responses-only features on the Responses API.
	if (
		model.useResponsesApi &&
		((Array.isArray(model.metadata?.tools) && model.metadata.tools.length > 0) ||
			['conversation', 'text', 'prompt', 'reasoning'].some(
				(key) => model.modelKwargs?.[key] !== undefined,
			))
	) {
		return model;
	}

	// Use the protocol-specific client so opaque model IDs cannot change the API.
	return wrapChatModelMessageInput(
		new ChatOpenAICompletions({ ...fields, metadata: model.metadata }),
	);
}
