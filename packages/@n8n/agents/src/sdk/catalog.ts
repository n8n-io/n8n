const MODELS_DEV_URL = 'https://models.dev/api.json';

/** Cost per million tokens. */
export interface ModelCost {
	/** Cost per million input tokens (USD). */
	input: number;
	/** Cost per million output tokens (USD). */
	output: number;
	/** Cost per million cached input tokens (USD). */
	cacheRead?: number;
	/** Cost per million cache write tokens (USD). */
	cacheWrite?: number;
}

/** Model context/output limits. */
export interface ModelLimits {
	/** Maximum context window size in tokens. */
	context?: number;
	/** Maximum output tokens. */
	output?: number;
}

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
	/** Cost per million tokens. */
	cost?: ModelCost;
	/** Token limits. */
	limits?: ModelLimits;
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
	cost?: { input?: number; output?: number; cache_read?: number; cache_write?: number };
	limit?: { context?: number; output?: number };
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
			const info: ModelInfo = {
				id: model.id,
				name: model.name,
				reasoning: model.reasoning ?? false,
				toolCall: model.tool_call ?? false,
			};
			if (model.cost?.input !== undefined && model.cost?.output !== undefined) {
				info.cost = {
					input: model.cost.input,
					output: model.cost.output,
					...(model.cost.cache_read !== undefined && { cacheRead: model.cost.cache_read }),
					...(model.cost.cache_write !== undefined && { cacheWrite: model.cost.cache_write }),
				};
			}
			if (model.limit) {
				info.limits = {
					...(model.limit.context !== undefined && { context: model.limit.context }),
					...(model.limit.output !== undefined && { output: model.limit.output }),
				};
			}
			models[modelId] = info;
		}

		catalog[key] = {
			id: provider.id,
			name: provider.name,
			models,
		};
	}

	return catalog;
}

// --- Global cached catalog for internal use ---

let cachedCatalog: ProviderCatalog | undefined;
let catalogFetchPromise: Promise<ProviderCatalog | undefined> | undefined;

/**
 * Get the cached catalog, fetching once if needed.
 * Returns undefined if the fetch fails (offline, timeout, etc.).
 * On failure, clears the in-flight promise so the next call retries.
 * @internal
 */
export async function getCachedCatalog(): Promise<ProviderCatalog | undefined> {
	if (cachedCatalog) return cachedCatalog;

	catalogFetchPromise ??= fetchProviderCatalog()
		.then((c) => {
			cachedCatalog = c;
			return c;
		})
		.catch((error: unknown) => {
			// Clear so subsequent calls retry
			catalogFetchPromise = undefined;
			console.warn(
				'[agents] Failed to fetch model catalog from models.dev — cost data will be unavailable:',
				error instanceof Error ? error.message : error,
			);
			return undefined;
		});

	return await catalogFetchPromise;
}

/**
 * Look up cost info for a model by its full ID (e.g. 'anthropic/claude-sonnet-4-5').
 * Returns undefined if catalog is unavailable or model not found.
 * @internal
 */
export async function getModelCost(modelId: string): Promise<ModelCost | undefined> {
	const catalog = await getCachedCatalog();
	if (!catalog) return undefined;

	const [provider, ...rest] = modelId.split('/');
	const modelName = rest.join('/');

	return catalog[provider]?.models[modelName]?.cost;
}

/**
 * Compute the cost in USD from token usage and per-million-token pricing.
 */
export function computeCost(
	usage: { promptTokens: number; completionTokens: number },
	cost: ModelCost,
): number {
	const inputCost = (usage.promptTokens / 1_000_000) * cost.input;
	const outputCost = (usage.completionTokens / 1_000_000) * cost.output;
	return inputCost + outputCost;
}
