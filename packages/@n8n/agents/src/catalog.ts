const MODELS_DEV_URL = 'https://models.dev/api.json';

/** Information about a single model. */
export interface ModelInfo {
	/** Model ID (e.g. 'claude-sonnet-4-5'). */
	id: string;
	/** Human-readable name (e.g. 'Claude Sonnet 4.5'). */
	name: string;
	/** Whether the model supports reasoning / thinking. */
	reasoning: boolean;
	/** Whether the model supports tool calling. */
	toolCall: boolean;
}

/** Information about a provider. */
export interface ProviderInfo {
	/** Provider ID (e.g. 'anthropic'). */
	id: string;
	/** Human-readable name (e.g. 'Anthropic'). */
	name: string;
	/** Available models keyed by model ID. */
	models: Record<string, ModelInfo>;
}

/** The full catalog of providers and their models. */
export type ProviderCatalog = Record<string, ProviderInfo>;

interface ModelsDevModel {
	id: string;
	name: string;
	reasoning?: boolean;
	tool_call?: boolean;
}

interface ModelsDevProvider {
	id: string;
	name: string;
	models?: Record<string, ModelsDevModel>;
}

/**
 * Fetch the provider/model catalog from models.dev.
 *
 * Returns a map of provider ID → ProviderInfo with all available models.
 * The catalog is fetched once and can be cached by the caller.
 *
 * @example
 * ```typescript
 * import { fetchProviderCatalog } from '@n8n/agents';
 *
 * const catalog = await fetchProviderCatalog();
 * console.log(Object.keys(catalog)); // ['anthropic', 'openai', ...]
 * console.log(catalog.anthropic.models['claude-sonnet-4-5'].reasoning); // true
 * ```
 */
export async function fetchProviderCatalog(): Promise<ProviderCatalog> {
	const response = await fetch(MODELS_DEV_URL);
	if (!response.ok) {
		throw new Error(`Failed to fetch provider catalog: ${response.statusText}`);
	}

	const data = (await response.json()) as Record<string, ModelsDevProvider>;
	const catalog: ProviderCatalog = {};

	for (const [key, provider] of Object.entries(data)) {
		if (!provider.models || Object.keys(provider.models).length === 0) continue;

		const models: Record<string, ModelInfo> = {};
		for (const [modelId, model] of Object.entries(provider.models)) {
			models[modelId] = {
				id: model.id,
				name: model.name,
				reasoning: model.reasoning ?? false,
				toolCall: model.tool_call ?? false,
			};
		}

		catalog[key] = {
			id: provider.id,
			name: provider.name,
			models,
		};
	}

	return catalog;
}
