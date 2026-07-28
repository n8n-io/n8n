import { listAnthropicModels } from './providers/anthropic';
import { listCohereModels } from './providers/cohere';
import { listDeepSeekModels } from './providers/deepseek';
import { listGoogleModels } from './providers/google';
import { listGroqModels } from './providers/groq';
import { listMistralModels } from './providers/mistral';
import { listNvidiaModels } from './providers/nvidia';
import { listOpenAiModels } from './providers/openai';
import { listOpenRouterModels } from './providers/openrouter';
import { listVercelModels } from './providers/vercel';
import { listXaiModels } from './providers/xai';
import type { ListModelsFn, ListModelsOptions, ProviderModel } from './types';

/**
 * Live chat-model discovery per provider: each function asks the provider's
 * own model-list API which models the given credential can call. Shared by the
 * chat sub-nodes' model dropdowns and the agents feature's model catalog, so
 * provider knowledge (endpoint, auth, chat-model filtering) lives in one place.
 *
 * Each provider implements {@link ListModelsFn} in its own file under
 * `providers/`, ported 1:1 from the corresponding chat node's `searchModels`
 * method or `loadOptions` routing config (see the source reference on each).
 * When changing behavior here, keep the node in sync.
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

export { listAnthropicModels } from './providers/anthropic';
export { listCohereModels } from './providers/cohere';
export { listDeepSeekModels } from './providers/deepseek';
export { listGoogleModels } from './providers/google';
export { listGroqModels } from './providers/groq';
export { listMistralModels } from './providers/mistral';
export { listNvidiaModels } from './providers/nvidia';
export { listOpenAiModels, shouldIncludeOpenAiModel } from './providers/openai';
export { listOpenRouterModels } from './providers/openrouter';
export { listVercelModels } from './providers/vercel';
export { listXaiModels } from './providers/xai';
export type { ListModelsFn, ListModelsOptions, ProviderModel } from './types';
