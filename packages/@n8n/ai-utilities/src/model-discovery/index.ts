import {
	listAnthropicModels,
	listCohereModels,
	listDeepSeekModels,
	listGoogleModels,
	listGroqModels,
	listMistralModels,
	listNvidiaModels,
	listOpenAiModels,
	listOpenRouterModels,
	listVercelModels,
	listXaiModels,
} from './providers';
import type { ListModelsFn, ListModelsOptions, ProviderModel } from './types';

/**
 * Live chat-model discovery per provider: each function asks the provider's
 * own model-list API which models the given credential can call. Shared by the
 * chat sub-nodes' model dropdowns and the agents feature's model catalog, so
 * provider knowledge (endpoint, auth, chat-model filtering) lives in one place.
 */
export const MODEL_DISCOVERY_PROVIDERS: Record<string, ListModelsFn> = {
	anthropic: listAnthropicModels,
	cohere: listCohereModels,
	deepseek: listDeepSeekModels,
	google: listGoogleModels,
	groq: listGroqModels,
	mistral: listMistralModels,
	nvidia: listNvidiaModels,
	openai: listOpenAiModels,
	openrouter: listOpenRouterModels,
	vercel: listVercelModels,
	xai: listXaiModels,
};

export function isModelDiscoveryProvider(provider: string): boolean {
	return provider in MODEL_DISCOVERY_PROVIDERS;
}

export async function listModelsForProvider(
	provider: string,
	options: ListModelsOptions,
): Promise<ProviderModel[]> {
	const listModels = MODEL_DISCOVERY_PROVIDERS[provider];
	if (!listModels) {
		throw new Error(`Unknown model discovery provider: "${provider}"`);
	}
	return await listModels(options);
}

export {
	listAnthropicModels,
	listCohereModels,
	listDeepSeekModels,
	listGoogleModels,
	listGroqModels,
	listMistralModels,
	listNvidiaModels,
	listOpenAiModels,
	listOpenRouterModels,
	listVercelModels,
	listXaiModels,
	shouldIncludeOpenAiModel,
} from './providers';
export type { ListModelsFn, ListModelsOptions, ProviderModel } from './types';
