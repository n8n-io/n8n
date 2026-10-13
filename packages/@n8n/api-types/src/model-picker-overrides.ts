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

/**
 * Moves models that have a priority to the front, highest first, and keeps the
 * order of the rest. A models API reports a priority to promote a model, for
 * example at its launch.
 */
export function pinPrioritizedModels<T>(models: T[], getPriority: (model: T) => unknown): T[] {
	const entries = models.map((model) => {
		const priority = getPriority(model);
		return {
			model,
			priority: typeof priority === 'number' && Number.isFinite(priority) ? priority : null,
		};
	});
	const prioritized = entries
		.flatMap((entry) =>
			entry.priority === null ? [] : [{ model: entry.model, priority: entry.priority }],
		)
		.sort((a, b) => b.priority - a.priority);
	return [
		...prioritized.map((entry) => entry.model),
		...entries.filter((entry) => entry.priority === null).map((entry) => entry.model),
	];
}
