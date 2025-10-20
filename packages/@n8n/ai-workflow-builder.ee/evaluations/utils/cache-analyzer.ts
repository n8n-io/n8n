import type { UsageMetadata } from '../types/langsmith.js';
import type { CacheStatistics } from '../types/test-result.js';

/**
 * Anthropic pricing (as of 2024)
 * Source: https://www.anthropic.com/pricing
 */
const PRICING = {
	// Claude Sonnet 4 pricing per million tokens
	inputTokensPerMillion: 3.0,
	outputTokensPerMillion: 15.0,
	cacheWritePerMillion: 3.75, // 25% markup on input tokens
	cacheReadPerMillion: 0.3, // 90% discount on input tokens
};

/**
 * Calculate cache statistics from usage metadata
 */
export function calculateCacheStats(usage: Partial<UsageMetadata>): CacheStatistics {
	const inputTokens = usage.input_tokens ?? 0;
	const outputTokens = usage.output_tokens ?? 0;
	const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
	const cacheReadTokens = usage.cache_read_input_tokens ?? 0;

	// Calculate cache hit rate
	// Cache hit rate = cache read tokens / (cache read + non-cached input tokens)
	const totalInputTokens = inputTokens + cacheCreationTokens + cacheReadTokens;
	const cacheHitRate = totalInputTokens > 0 ? cacheReadTokens / totalInputTokens : 0;

	// Calculate cost savings
	const estimatedCostSavings = calculateCostSavings(usage);

	return {
		inputTokens,
		outputTokens,
		cacheCreationTokens,
		cacheReadTokens,
		cacheHitRate,
		estimatedCostSavings,
	};
}

/**
 * Calculate cost savings from using cache vs not using cache
 * Returns the savings in dollars
 */
export function calculateCostSavings(usage: Partial<UsageMetadata>): number {
	const inputTokens = usage.input_tokens ?? 0;
	const outputTokens = usage.output_tokens ?? 0;
	const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
	const cacheReadTokens = usage.cache_read_input_tokens ?? 0;

	// Cost with caching
	const costWithCache =
		(inputTokens / 1_000_000) * PRICING.inputTokensPerMillion +
		(outputTokens / 1_000_000) * PRICING.outputTokensPerMillion +
		(cacheCreationTokens / 1_000_000) * PRICING.cacheWritePerMillion +
		(cacheReadTokens / 1_000_000) * PRICING.cacheReadPerMillion;

	// Cost without caching (all tokens would be regular input tokens)
	const totalInputWithoutCache = inputTokens + cacheCreationTokens + cacheReadTokens;
	const costWithoutCache =
		(totalInputWithoutCache / 1_000_000) * PRICING.inputTokensPerMillion +
		(outputTokens / 1_000_000) * PRICING.outputTokensPerMillion;

	return costWithoutCache - costWithCache;
}

/**
 * Calculate aggregate cache statistics from multiple test results
 */
export function aggregateCacheStats(stats: CacheStatistics[]): CacheStatistics {
	if (stats.length === 0) {
		return {
			inputTokens: 0,
			outputTokens: 0,
			cacheCreationTokens: 0,
			cacheReadTokens: 0,
			cacheHitRate: 0,
			estimatedCostSavings: 0,
		};
	}

	const totalInputTokens = stats.reduce((sum, s) => sum + s.inputTokens, 0);
	const totalOutputTokens = stats.reduce((sum, s) => sum + s.outputTokens, 0);
	const totalCacheCreation = stats.reduce((sum, s) => sum + s.cacheCreationTokens, 0);
	const totalCacheRead = stats.reduce((sum, s) => sum + s.cacheReadTokens, 0);
	const totalCostSavings = stats.reduce((sum, s) => sum + s.estimatedCostSavings, 0);

	// Recalculate aggregate cache hit rate
	const totalTokens = totalInputTokens + totalCacheCreation + totalCacheRead;
	const aggregateCacheHitRate = totalTokens > 0 ? totalCacheRead / totalTokens : 0;

	return {
		inputTokens: totalInputTokens,
		outputTokens: totalOutputTokens,
		cacheCreationTokens: totalCacheCreation,
		cacheReadTokens: totalCacheRead,
		cacheHitRate: aggregateCacheHitRate,
		estimatedCostSavings: totalCostSavings,
	};
}

/**
 * Format cache statistics for display
 */
export function formatCacheStats(stats: CacheStatistics): {
	inputTokens: string;
	outputTokens: string;
	cacheCreationTokens: string;
	cacheReadTokens: string;
	cacheHitRate: string;
	costSavings: string;
} {
	return {
		inputTokens: stats.inputTokens.toLocaleString(),
		outputTokens: stats.outputTokens.toLocaleString(),
		cacheCreationTokens: stats.cacheCreationTokens.toLocaleString(),
		cacheReadTokens: stats.cacheReadTokens.toLocaleString(),
		cacheHitRate: `${(stats.cacheHitRate * 100).toFixed(2)}%`,
		costSavings: `$${stats.estimatedCostSavings.toFixed(4)}`,
	};
}

/**
 * Calculate cache effectiveness score (0-1)
 * Based on cache hit rate and cost savings
 */
export function calculateCacheEffectiveness(stats: CacheStatistics): number {
	// Weight cache hit rate and cost savings
	const hitRateWeight = 0.6;
	const costSavingsWeight = 0.4;

	// Normalize cost savings (assume $0.10 savings is excellent)
	const normalizedSavings = Math.min(stats.estimatedCostSavings / 0.1, 1);

	return stats.cacheHitRate * hitRateWeight + normalizedSavings * costSavingsWeight;
}
