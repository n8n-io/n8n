/**
 * Product names that model pickers show instead of a model id, keyed by
 * provider and bare model id. Models without an entry show their id.
 */
export const MODEL_DISPLAY_NAMES: Record<string, Record<string, string>> = {
	google: {
		'gemini-2.5-flash': 'Gemini 2.5 Flash',
		'gemini-2.5-flash-lite': 'Gemini 2.5 Flash-Lite',
		'gemini-2.5-pro': 'Gemini 2.5 Pro',
		'gemini-3-flash-preview': 'Gemini 3 Flash Preview',
		'gemini-3.1-flash-lite': 'Gemini 3.1 Flash-Lite',
		'gemini-3.1-pro-preview': 'Gemini 3.1 Pro Preview',
		'gemini-3.5-flash': 'Gemini 3.5 Flash',
		'gemini-3.7-flash': 'Gemini 3.7 Flash',
		'gemini-3.8-flash': 'Gemini 3.8 Flash',
	},
};

/**
 * Newly launched models that model pickers list first, keyed by provider and
 * bare model id. Remove an entry once the launch is over.
 */
export const FEATURED_MODELS: Record<string, string[]> = {};

/** Google's models API returns ids as `models/<id>`. */
const toBareModelId = (modelId: string) => modelId.replace(/^models\//, '');

/** Product name of a model, or `undefined` when it has none. Accepts `models/`-prefixed ids. */
export function getModelDisplayName(provider: string, modelId: string): string | undefined {
	const names = Object.hasOwn(MODEL_DISPLAY_NAMES, provider)
		? MODEL_DISPLAY_NAMES[provider]
		: undefined;
	const bareModelId = toBareModelId(modelId);
	return names && Object.hasOwn(names, bareModelId) ? names[bareModelId] : undefined;
}

/** Moves featured models to the front, keeping the order of the rest. */
export function pinFeaturedModels<T>(
	provider: string,
	models: T[],
	getModelId: (model: T) => string,
): T[] {
	const featured = Object.hasOwn(FEATURED_MODELS, provider) ? FEATURED_MODELS[provider] : [];
	const isFeatured = (model: T) => featured.includes(toBareModelId(getModelId(model)));
	return [...models.filter(isFeatured), ...models.filter((model) => !isFeatured(model))];
}
