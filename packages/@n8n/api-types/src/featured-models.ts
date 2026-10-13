/**
 * Newly launched models that model pickers list first and label with their
 * product name, keyed by provider and bare model id. Remove an entry once the
 * launch is over.
 */
export const FEATURED_MODELS: Record<string, Record<string, string>> = {};

/**
 * Product name of a featured model, or `undefined` for any other model. Accepts
 * Google's `models/`-prefixed ids.
 */
export function getFeaturedModelName(provider: string, modelId: string): string | undefined {
	return FEATURED_MODELS[provider]?.[modelId.replace(/^models\//, '')];
}

/** Moves featured models to the front, keeping the order of the rest. */
export function pinFeaturedModels<T>(
	provider: string,
	models: T[],
	getModelId: (model: T) => string,
): T[] {
	const isFeatured = (model: T) => getFeaturedModelName(provider, getModelId(model)) !== undefined;
	return [...models.filter(isFeatured), ...models.filter((model) => !isFeatured(model))];
}
