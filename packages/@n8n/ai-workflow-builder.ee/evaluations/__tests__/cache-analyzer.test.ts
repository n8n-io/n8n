/**
 * Tests for cache analyzer utilities.
 *
 * These utilities calculate cache statistics from LLM token usage metadata,
 * aggregate statistics across multiple evaluations, and format for display.
 */

import {
	calculateCacheStats,
	aggregateCacheStats,
	formatCacheStats,
	type CacheStatistics,
	type UsageMetadata,
} from '../cache-analyzer';

describe('Cache Analyzer', () => {
	describe('calculateCacheStats()', () => {
		it('should calculate stats from complete usage metadata', () => {
			const usage: UsageMetadata = {
				input_tokens: 100,
				output_tokens: 50,
				cache_creation_input_tokens: 200,
				cache_read_input_tokens: 300,
			};

			const stats = calculateCacheStats(usage);

			expect(stats.inputTokens).toBe(100);
			expect(stats.outputTokens).toBe(50);
			expect(stats.cacheCreationTokens).toBe(200);
			expect(stats.cacheReadTokens).toBe(300);
		});

		it('should calculate cache hit rate correctly', () => {
			const usage: UsageMetadata = {
				input_tokens: 100,
				output_tokens: 50,
				cache_creation_input_tokens: 100,
				cache_read_input_tokens: 300,
			};

			const stats = calculateCacheStats(usage);

			// Cache hit rate = cache read / (input + cache creation + cache read)
			// = 300 / (100 + 100 + 300) = 300 / 500 = 0.6
			expect(stats.cacheHitRate).toBe(0.6);
		});

		it('should handle partial usage metadata with missing fields', () => {
			const usage: Partial<UsageMetadata> = {
				input_tokens: 100,
				output_tokens: 50,
			};

			const stats = calculateCacheStats(usage);

			expect(stats.inputTokens).toBe(100);
			expect(stats.outputTokens).toBe(50);
			expect(stats.cacheCreationTokens).toBe(0);
			expect(stats.cacheReadTokens).toBe(0);
		});

		it('should handle empty usage metadata', () => {
			const stats = calculateCacheStats({});

			expect(stats.inputTokens).toBe(0);
			expect(stats.outputTokens).toBe(0);
			expect(stats.cacheCreationTokens).toBe(0);
			expect(stats.cacheReadTokens).toBe(0);
			expect(stats.cacheHitRate).toBe(0);
		});

		it('should return 0 cache hit rate when no tokens', () => {
			const usage: UsageMetadata = {
				input_tokens: 0,
				output_tokens: 0,
				cache_creation_input_tokens: 0,
				cache_read_input_tokens: 0,
			};

			const stats = calculateCacheStats(usage);

			expect(stats.cacheHitRate).toBe(0);
		});

		it('should return 100% cache hit rate when only cache read tokens', () => {
			const usage: UsageMetadata = {
				input_tokens: 0,
				output_tokens: 100,
				cache_creation_input_tokens: 0,
				cache_read_input_tokens: 500,
			};

			const stats = calculateCacheStats(usage);

			expect(stats.cacheHitRate).toBe(1);
		});
	});

	describe('aggregateCacheStats()', () => {
		it('should aggregate multiple cache statistics', () => {
			const stats: CacheStatistics[] = [
				{
					inputTokens: 100,
					outputTokens: 50,
					cacheCreationTokens: 200,
					cacheReadTokens: 100,
					cacheHitRate: 0.25, // Individual rate doesn't matter for aggregation
				},
				{
					inputTokens: 150,
					outputTokens: 75,
					cacheCreationTokens: 100,
					cacheReadTokens: 300,
					cacheHitRate: 0.5,
				},
			];

			const aggregated = aggregateCacheStats(stats);

			expect(aggregated.inputTokens).toBe(250);
			expect(aggregated.outputTokens).toBe(125);
			expect(aggregated.cacheCreationTokens).toBe(300);
			expect(aggregated.cacheReadTokens).toBe(400);
		});

		it('should recalculate aggregate cache hit rate', () => {
			const stats: CacheStatistics[] = [
				{
					inputTokens: 100,
					outputTokens: 50,
					cacheCreationTokens: 100,
					cacheReadTokens: 200,
					cacheHitRate: 0.5,
				},
				{
					inputTokens: 100,
					outputTokens: 50,
					cacheCreationTokens: 100,
					cacheReadTokens: 200,
					cacheHitRate: 0.5,
				},
			];

			const aggregated = aggregateCacheStats(stats);

			// Total: input=200, creation=200, read=400
			// Rate = 400 / (200 + 200 + 400) = 400 / 800 = 0.5
			expect(aggregated.cacheHitRate).toBe(0.5);
		});

		it('should return zeros for empty stats array', () => {
			const aggregated = aggregateCacheStats([]);

			expect(aggregated.inputTokens).toBe(0);
			expect(aggregated.outputTokens).toBe(0);
			expect(aggregated.cacheCreationTokens).toBe(0);
			expect(aggregated.cacheReadTokens).toBe(0);
			expect(aggregated.cacheHitRate).toBe(0);
		});

		it('should handle single stats entry', () => {
			const stats: CacheStatistics[] = [
				{
					inputTokens: 100,
					outputTokens: 50,
					cacheCreationTokens: 100,
					cacheReadTokens: 200,
					cacheHitRate: 0.5,
				},
			];

			const aggregated = aggregateCacheStats(stats);

			expect(aggregated.inputTokens).toBe(100);
			expect(aggregated.outputTokens).toBe(50);
			expect(aggregated.cacheCreationTokens).toBe(100);
			expect(aggregated.cacheReadTokens).toBe(200);
			expect(aggregated.cacheHitRate).toBe(0.5);
		});
	});

	describe('formatCacheStats()', () => {
		it('should format all statistics with locale strings', () => {
			const stats: CacheStatistics = {
				inputTokens: 1234567,
				outputTokens: 98765,
				cacheCreationTokens: 54321,
				cacheReadTokens: 111222,
				cacheHitRate: 0.7523,
			};

			const formatted = formatCacheStats(stats);

			expect(formatted.inputTokens).toBe('1,234,567');
			expect(formatted.outputTokens).toBe('98,765');
			expect(formatted.cacheCreationTokens).toBe('54,321');
			expect(formatted.cacheReadTokens).toBe('111,222');
		});

		it('should format cache hit rate as percentage', () => {
			const stats: CacheStatistics = {
				inputTokens: 100,
				outputTokens: 50,
				cacheCreationTokens: 100,
				cacheReadTokens: 200,
				cacheHitRate: 0.7523,
			};

			const formatted = formatCacheStats(stats);

			expect(formatted.cacheHitRate).toBe('75.23%');
		});

		it('should handle zero values', () => {
			const stats: CacheStatistics = {
				inputTokens: 0,
				outputTokens: 0,
				cacheCreationTokens: 0,
				cacheReadTokens: 0,
				cacheHitRate: 0,
			};

			const formatted = formatCacheStats(stats);

			expect(formatted.inputTokens).toBe('0');
			expect(formatted.outputTokens).toBe('0');
			expect(formatted.cacheCreationTokens).toBe('0');
			expect(formatted.cacheReadTokens).toBe('0');
			expect(formatted.cacheHitRate).toBe('0.00%');
		});

		it('should handle 100% cache hit rate', () => {
			const stats: CacheStatistics = {
				inputTokens: 0,
				outputTokens: 100,
				cacheCreationTokens: 0,
				cacheReadTokens: 1000,
				cacheHitRate: 1,
			};

			const formatted = formatCacheStats(stats);

			expect(formatted.cacheHitRate).toBe('100.00%');
		});
	});
});
