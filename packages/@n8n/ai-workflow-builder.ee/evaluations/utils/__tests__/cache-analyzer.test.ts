import type { UsageMetadata } from '../../types/langsmith';
import type { CacheStatistics } from '../../types/test-result';
import { calculateCacheStats, aggregateCacheStats, formatCacheStats } from '../cache-analyzer';

describe('cache-analyzer', () => {
	describe('calculateCacheStats', () => {
		it('should calculate cache statistics correctly', () => {
			const usage: Partial<UsageMetadata> = {
				input_tokens: 1000,
				output_tokens: 500,
				cache_creation_input_tokens: 2000,
				cache_read_input_tokens: 3000,
			};

			const stats = calculateCacheStats(usage);

			expect(stats.inputTokens).toBe(1000);
			expect(stats.outputTokens).toBe(500);
			expect(stats.cacheCreationTokens).toBe(2000);
			expect(stats.cacheReadTokens).toBe(3000);
			expect(stats.cacheHitRate).toBeCloseTo(0.5, 2); // 3000 / (1000 + 2000 + 3000)
		});

		it('should handle zero tokens', () => {
			const usage: Partial<UsageMetadata> = {
				input_tokens: 0,
				output_tokens: 0,
			};

			const stats = calculateCacheStats(usage);

			expect(stats.cacheHitRate).toBe(0);
		});

		it('should handle undefined cache tokens', () => {
			const usage: Partial<UsageMetadata> = {
				input_tokens: 1000,
				output_tokens: 500,
			};

			const stats = calculateCacheStats(usage);

			expect(stats.cacheCreationTokens).toBe(0);
			expect(stats.cacheReadTokens).toBe(0);
			expect(stats.cacheHitRate).toBe(0);
		});
	});

	describe('aggregateCacheStats', () => {
		it('should aggregate multiple cache statistics', () => {
			const stats: CacheStatistics[] = [
				{
					inputTokens: 1000,
					outputTokens: 500,
					cacheCreationTokens: 2000,
					cacheReadTokens: 3000,
					cacheHitRate: 0.5,
				},
				{
					inputTokens: 1500,
					outputTokens: 750,
					cacheCreationTokens: 2500,
					cacheReadTokens: 3500,
					cacheHitRate: 0.6,
				},
			];

			const aggregate = aggregateCacheStats(stats);

			expect(aggregate.inputTokens).toBe(2500);
			expect(aggregate.outputTokens).toBe(1250);
			expect(aggregate.cacheCreationTokens).toBe(4500);
			expect(aggregate.cacheReadTokens).toBe(6500);
			// Cache hit rate recalculated: 6500 / (2500 + 4500 + 6500)
			expect(aggregate.cacheHitRate).toBeCloseTo(0.4815, 3);
		});

		it('should handle empty array', () => {
			const aggregate = aggregateCacheStats([]);

			expect(aggregate.inputTokens).toBe(0);
			expect(aggregate.cacheHitRate).toBe(0);
		});
	});

	describe('formatCacheStats', () => {
		it('should format statistics for display', () => {
			const stats: CacheStatistics = {
				inputTokens: 12345,
				outputTokens: 6789,
				cacheCreationTokens: 15000,
				cacheReadTokens: 30000,
				cacheHitRate: 0.6677,
			};

			const formatted = formatCacheStats(stats);

			expect(formatted.inputTokens).toBe('12,345');
			expect(formatted.outputTokens).toBe('6,789');
			expect(formatted.cacheCreationTokens).toBe('15,000');
			expect(formatted.cacheReadTokens).toBe('30,000');
			expect(formatted.cacheHitRate).toBe('66.77%');
		});
	});
});
