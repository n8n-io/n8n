import {
	chatHubProviderSchema,
	type ChatHubConversationModel,
	type ChatModelsResponse,
} from '@n8n/api-types';

export function modelsResponseContains(
	response: ChatModelsResponse,
	model: ChatHubConversationModel,
) {
	return chatHubProviderSchema.options.some((provider) =>
		response[provider].models.some((m) => m.name === model.model),
	);
}

export function findOneFromModelsResponse(
	response: ChatModelsResponse,
): ChatHubConversationModel | undefined {
	for (const provider of chatHubProviderSchema.options) {
		if (response[provider].models.length > 0) {
			return { model: response[provider].models[0].name, provider };
		}
	}

	return undefined;
}
