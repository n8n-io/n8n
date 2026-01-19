/**
 * Model pricing constants and cost calculation utilities.
 *
 * Pricing is in USD per million tokens.
 * Cache pricing reflects Anthropic's prompt caching:
 * - Cache writes: 25% more than base input price
 * - Cache reads: 90% less than base input price
 */

import type { TokenUsage } from './harness-types';

/**
 * Pricing configuration for a single model.
 * All prices are in USD per million tokens.
 */
export interface ModelPricing {
	inputPerMillion: number;
	outputPerMillion: number;
	/** Cache read price per million tokens (optional, defaults to inputPerMillion * 0.1) */
	cacheReadPerMillion?: number;
	/** Cache write price per million tokens (optional, defaults to inputPerMillion * 1.25) */
	cacheWritePerMillion?: number;
}

/**
 * Model pricing lookup table.
 * Keys should match model identifiers from LLM responses or be normalized.
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
	// Claude 4.5 models
	'claude-sonnet-4-5-20250929': {
		inputPerMillion: 3.0,
		outputPerMillion: 15.0,
		cacheReadPerMillion: 0.3, // 90% discount
		cacheWritePerMillion: 3.75, // 25% premium
	},
	'claude-opus-4-5-20251101': {
		inputPerMillion: 15.0,
		outputPerMillion: 75.0,
		cacheReadPerMillion: 1.5, // 90% discount
		cacheWritePerMillion: 18.75, // 25% premium
	},
	'claude-haiku-4-5-20251001': {
		inputPerMillion: 0.8,
		outputPerMillion: 4.0,
		cacheReadPerMillion: 0.08, // 90% discount
		cacheWritePerMillion: 1.0, // 25% premium
	},
	// Aliases for model IDs
	'claude-sonnet-4.5': {
		inputPerMillion: 3.0,
		outputPerMillion: 15.0,
		cacheReadPerMillion: 0.3,
		cacheWritePerMillion: 3.75,
	},
	'claude-opus-4.5': {
		inputPerMillion: 15.0,
		outputPerMillion: 75.0,
		cacheReadPerMillion: 1.5,
		cacheWritePerMillion: 18.75,
	},
	'claude-haiku-4.5': {
		inputPerMillion: 0.8,
		outputPerMillion: 4.0,
		cacheReadPerMillion: 0.08,
		cacheWritePerMillion: 1.0,
	},
	// GPT models
	'gpt-5.2-2025-12-11': {
		inputPerMillion: 2.5,
		outputPerMillion: 10.0,
	},
	'gpt-5.2': {
		inputPerMillion: 2.5,
		outputPerMillion: 10.0,
	},
	// OpenRouter/other models (approximate pricing)
	'thudm/glm-4-plus': {
		inputPerMillion: 1.0,
		outputPerMillion: 1.0,
	},
	'glm-4.7': {
		inputPerMillion: 1.0,
		outputPerMillion: 1.0,
	},
	'google/gemini-3-flash-preview': {
		inputPerMillion: 0.1,
		outputPerMillion: 0.4,
	},
	'gemini-3-flash': {
		inputPerMillion: 0.1,
		outputPerMillion: 0.4,
	},
	'google/gemini-3-pro-preview': {
		inputPerMillion: 1.25,
		outputPerMillion: 5.0,
	},
	'gemini-3-pro': {
		inputPerMillion: 1.25,
		outputPerMillion: 5.0,
	},
	'deepseek/deepseek-chat-v3-0324': {
		inputPerMillion: 0.27,
		outputPerMillion: 1.1,
	},
	'deepseek-v3.2': {
		inputPerMillion: 0.27,
		outputPerMillion: 1.1,
	},
	'mistralai/devstral-small': {
		inputPerMillion: 0.1,
		outputPerMillion: 0.3,
	},
	devstral: {
		inputPerMillion: 0.1,
		outputPerMillion: 0.3,
	},
};

/**
 * Default pricing for unknown models.
 * Uses conservative estimates based on typical frontier model pricing.
 */
export const DEFAULT_PRICING: ModelPricing = {
	inputPerMillion: 3.0,
	outputPerMillion: 15.0,
};

/**
 * Get pricing for a model, falling back to default if unknown.
 */
export function getModelPricing(model: string | undefined): ModelPricing {
	if (!model) return DEFAULT_PRICING;

	// Try exact match first
	if (MODEL_PRICING[model]) {
		return MODEL_PRICING[model];
	}

	// Try partial match (model ID might be contained in full model name)
	for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
		if (model.includes(key) || key.includes(model)) {
			return pricing;
		}
	}

	return DEFAULT_PRICING;
}

/**
 * Calculate cost in USD from token usage and model.
 *
 * Takes into account:
 * - Regular input tokens
 * - Output tokens
 * - Cache read tokens (discounted)
 * - Cache creation/write tokens (premium)
 */
export function calculateCost(tokenUsage: TokenUsage, model?: string): number {
	const pricing = getModelPricing(model);

	const inputCost = (tokenUsage.inputTokens / 1_000_000) * pricing.inputPerMillion;
	const outputCost = (tokenUsage.outputTokens / 1_000_000) * pricing.outputPerMillion;

	let cacheReadCost = 0;
	if (tokenUsage.cacheReadInputTokens) {
		const cacheReadPrice = pricing.cacheReadPerMillion ?? pricing.inputPerMillion * 0.1;
		cacheReadCost = (tokenUsage.cacheReadInputTokens / 1_000_000) * cacheReadPrice;
	}

	let cacheWriteCost = 0;
	if (tokenUsage.cacheCreationInputTokens) {
		const cacheWritePrice = pricing.cacheWritePerMillion ?? pricing.inputPerMillion * 1.25;
		cacheWriteCost = (tokenUsage.cacheCreationInputTokens / 1_000_000) * cacheWritePrice;
	}

	return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}

/**
 * Aggregate token usage from multiple results.
 */
export function aggregateTokenUsage(usages: Array<TokenUsage | undefined>): TokenUsage | undefined {
	const validUsages = usages.filter((u): u is TokenUsage => u !== undefined);
	if (validUsages.length === 0) return undefined;

	return validUsages.reduce(
		(acc, usage) => ({
			inputTokens: acc.inputTokens + usage.inputTokens,
			outputTokens: acc.outputTokens + usage.outputTokens,
			cacheReadInputTokens:
				(acc.cacheReadInputTokens ?? 0) + (usage.cacheReadInputTokens ?? 0) || undefined,
			cacheCreationInputTokens:
				(acc.cacheCreationInputTokens ?? 0) + (usage.cacheCreationInputTokens ?? 0) || undefined,
		}),
		{
			inputTokens: 0,
			outputTokens: 0,
			cacheReadInputTokens: undefined as number | undefined,
			cacheCreationInputTokens: undefined as number | undefined,
		},
	);
}
