import { PROVIDER_CAPABILITIES, type ProviderCapabilities } from '@n8n/api-types';

import { getProviderPrefix, splitModelId } from './model-id';

export function isGoogleVertexAnthropicModel(modelId: string): boolean {
	const { provider, model } = splitModelId(modelId);
	return provider === 'google-vertex' && model.startsWith('claude-');
}

export function isOpenRouterAnthropicModel(modelId: string): boolean {
	const { provider, model } = splitModelId(modelId);
	return provider === 'openrouter' && model.startsWith('anthropic/claude-');
}

export function isRoutedAnthropicModel(modelId: string): boolean {
	return isGoogleVertexAnthropicModel(modelId) || isOpenRouterAnthropicModel(modelId);
}

/** Cache support depends on the model when the provider routes to several vendors. */
export function getModelPromptCachingCapability(
	modelId: string,
): ProviderCapabilities['promptCaching'] {
	if (isRoutedAnthropicModel(modelId)) return 'ttl';
	return PROVIDER_CAPABILITIES[getProviderPrefix(modelId)]?.promptCaching ?? false;
}
