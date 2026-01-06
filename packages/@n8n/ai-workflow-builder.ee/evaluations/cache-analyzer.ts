/**
 * Cache analyzer utilities for evaluating LLM token usage and cache efficiency.
 *
 * These utilities help track and analyze cache performance during evaluations,
 * which is important for cost optimization and performance monitoring.
 */

/**
 * Token usage metadata from LLM API responses.
 */
export interface UsageMetadata {
	input_tokens: number;
	output_tokens: number;
	cache_creation_input_tokens: number;
	cache_read_input_tokens: number;
}

/**
 * Calculated cache statistics.
 */
export interface CacheStatistics {
	inputTokens: number;
	outputTokens: number;
	cacheCreationTokens: number;
	cacheReadTokens: number;
	cacheHitRate: number;
}

/**
 * Formatted cache statistics for display.
 */
export interface FormattedCacheStatistics {
	inputTokens: string;
	outputTokens: string;
	cacheCreationTokens: string;
	cacheReadTokens: string;
	cacheHitRate: string;
}

/**
 * Calculate cache statistics from usage metadata.
 *
 * @param usage - Token usage metadata from LLM API response
 * @returns Calculated cache statistics including hit rate
 *
 * @example
 * ```typescript
 * const stats = calculateCacheStats({
 *   input_tokens: 100,
 *   output_tokens: 50,
 *   cache_creation_input_tokens: 200,
 *   cache_read_input_tokens: 300,
 * });
 * console.log(stats.cacheHitRate); // 0.5 (50%)
 * ```
 */
export function calculateCacheStats(usage: Partial<UsageMetadata>): CacheStatistics {
	const inputTokens = usage.input_tokens ?? 0;
	const outputTokens = usage.output_tokens ?? 0;
	const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
	const cacheReadTokens = usage.cache_read_input_tokens ?? 0;

	// Calculate cache hit rate
	// Cache hit rate = cache read tokens / (cache read + cache creation + non-cached input tokens)
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
 * Aggregate cache statistics from multiple evaluations.
 *
 * This recalculates the cache hit rate based on the totals, rather than
 * averaging individual rates (which would be statistically incorrect).
 *
 * @param stats - Array of cache statistics to aggregate
 * @returns Aggregated cache statistics
 *
 * @example
 * ```typescript
 * const aggregated = aggregateCacheStats([stats1, stats2, stats3]);
 * console.log(aggregated.cacheHitRate); // Overall cache hit rate
 * ```
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

	// Recalculate aggregate cache hit rate from totals
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
 * Format cache statistics for display.
 *
 * Formats numbers with locale-specific thousand separators and
 * cache hit rate as a percentage with two decimal places.
 *
 * @param stats - Cache statistics to format
 * @returns Formatted strings for display
 *
 * @example
 * ```typescript
 * const formatted = formatCacheStats(stats);
 * console.log(formatted.cacheHitRate); // "75.23%"
 * console.log(formatted.inputTokens); // "1,234,567"
 * ```
 */
export function formatCacheStats(stats: CacheStatistics): FormattedCacheStatistics {
	return {
		inputTokens: stats.inputTokens.toLocaleString(),
		outputTokens: stats.outputTokens.toLocaleString(),
		cacheCreationTokens: stats.cacheCreationTokens.toLocaleString(),
		cacheReadTokens: stats.cacheReadTokens.toLocaleString(),
		cacheHitRate: `${(stats.cacheHitRate * 100).toFixed(2)}%`,
	};
}
