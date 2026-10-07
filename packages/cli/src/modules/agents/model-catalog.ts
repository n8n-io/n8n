import type { ModelInfo, ProviderCatalog } from '@n8n/agents';
import { AGENT_MODEL_PROVIDERS, isVertexGeminiModel } from '@n8n/api-types';

export function filterOfferedAgentModels(
	provider: string,
	models: Record<string, ModelInfo>,
): Record<string, ModelInfo> {
	if (provider !== 'google-vertex') return models;
	return Object.fromEntries(
		Object.entries(models).filter(
			([, model]) =>
				isVertexGeminiModel(`${provider}/${model.id}`) &&
				model.status !== 'deprecated' &&
				model.toolCall &&
				model.modalities?.output?.includes('text'),
		),
	);
}

export function filterOfferedAgentModelProviders(catalog: ProviderCatalog): ProviderCatalog {
	const filteredCatalog: ProviderCatalog = {};

	for (const provider of AGENT_MODEL_PROVIDERS) {
		const providerInfo = catalog[provider];
		if (providerInfo) {
			filteredCatalog[provider] = {
				...providerInfo,
				models: filterOfferedAgentModels(provider, providerInfo.models),
			};
		}
	}

	return filteredCatalog;
}
