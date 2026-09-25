import type {
	MinedPreference,
	PreferenceMiningContextEstimate,
	PreferenceMiningPricing,
} from '@n8n/api-types';

export async function estimatePreferenceContext(
	preferences: MinedPreference[],
	pricing?: PreferenceMiningPricing,
): Promise<PreferenceMiningContextEstimate> {
	const text = preferences.map((preference) => preference.content).join('\n');
	const { getEncoding } = await import('@n8n/ai-utilities/tokenizer');
	const encoder = await getEncoding('cl100k_base');
	const tokens = encoder.encode(text, [], []).length;
	const { computeCost } = await import('@n8n/agents/catalog');
	return {
		characters: text.length,
		tokens,
		encoding: 'cl100k_base',
		estimatedInputCost:
			tokens === 0
				? 0
				: pricing
					? computeCost({ promptTokens: tokens, completionTokens: 0 }, pricing)
					: null,
	};
}

export async function resolveMiningPricing(
	modelId: string,
): Promise<PreferenceMiningPricing | undefined> {
	const { getModelCost } = await import('@n8n/agents/catalog');
	const rates = await getModelCost(modelId);
	if (!rates) return undefined;
	return { ...rates, modelId, source: 'models.dev', resolvedAt: new Date().toISOString() };
}
