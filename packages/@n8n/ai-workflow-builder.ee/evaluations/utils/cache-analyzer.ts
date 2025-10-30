import type { UsageMetadata } from '../types/langsmith.js';
import type { CacheStatistics } from '../types/test-result.js';

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

	return {
		inputTokens,
		outputTokens,
		cacheCreationTokens,
		cacheReadTokens,
		cacheHitRate,
	};
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
		};
	}

	const totalInputTokens = stats.reduce((sum, s) => sum + s.inputTokens, 0);
	const totalOutputTokens = stats.reduce((sum, s) => sum + s.outputTokens, 0);
	const totalCacheCreation = stats.reduce((sum, s) => sum + s.cacheCreationTokens, 0);
	const totalCacheRead = stats.reduce((sum, s) => sum + s.cacheReadTokens, 0);

	// Recalculate aggregate cache hit rate
	const totalTokens = totalInputTokens + totalCacheCreation + totalCacheRead;
	const aggregateCacheHitRate = totalTokens > 0 ? totalCacheRead / totalTokens : 0;

	return {
		inputTokens: totalInputTokens,
		outputTokens: totalOutputTokens,
		cacheCreationTokens: totalCacheCreation,
		cacheReadTokens: totalCacheRead,
		cacheHitRate: aggregateCacheHitRate,
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
} {
	return {
		inputTokens: stats.inputTokens.toLocaleString(),
		outputTokens: stats.outputTokens.toLocaleString(),
		cacheCreationTokens: stats.cacheCreationTokens.toLocaleString(),
		cacheReadTokens: stats.cacheReadTokens.toLocaleString(),
		cacheHitRate: `${(stats.cacheHitRate * 100).toFixed(2)}%`,
	};
}
