import type { UsageMetadata } from '../../types/langsmith';
import type { CacheStatistics } from '../../types/test-result';
import {
	calculateCacheStats,
	calculateCostSavings,
	aggregateCacheStats,
	formatCacheStats,
	calculateCacheEffectiveness,
} from '../cache-analyzer';

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
			expect(stats.estimatedCostSavings).toBe(0);
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

	describe('calculateCostSavings', () => {
		it('should calculate cost savings correctly', () => {
			const usage: Partial<UsageMetadata> = {
				input_tokens: 1000,
				output_tokens: 500,
				cache_creation_input_tokens: 2000,
				cache_read_input_tokens: 3000,
			};

			const savings = calculateCostSavings(usage);

			// Without cache: ((1000 + 2000 + 3000) * $3.00 + 500 * $15.00) / 1M = $0.0255
			// With cache: (1000 * $3.00 + 2000 * $3.75 + 3000 * $0.30 + 500 * $15.00) / 1M = $0.0189
			// Savings: $0.0255 - $0.0189 = $0.0066
			expect(savings).toBeCloseTo(0.0066, 4);
		});

		it('should return zero savings when no cache is used', () => {
			const usage: Partial<UsageMetadata> = {
				input_tokens: 1000,
				output_tokens: 500,
			};

			const savings = calculateCostSavings(usage);

			expect(savings).toBe(0);
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
					estimatedCostSavings: 0.008,
				},
				{
					inputTokens: 1500,
					outputTokens: 750,
					cacheCreationTokens: 2500,
					cacheReadTokens: 3500,
					cacheHitRate: 0.6,
					estimatedCostSavings: 0.012,
				},
			];

			const aggregate = aggregateCacheStats(stats);

			expect(aggregate.inputTokens).toBe(2500);
			expect(aggregate.outputTokens).toBe(1250);
			expect(aggregate.cacheCreationTokens).toBe(4500);
			expect(aggregate.cacheReadTokens).toBe(6500);
			expect(aggregate.estimatedCostSavings).toBeCloseTo(0.02, 3);
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
				estimatedCostSavings: 0.0523,
			};

			const formatted = formatCacheStats(stats);

			expect(formatted.inputTokens).toBe('12,345');
			expect(formatted.outputTokens).toBe('6,789');
			expect(formatted.cacheCreationTokens).toBe('15,000');
			expect(formatted.cacheReadTokens).toBe('30,000');
			expect(formatted.cacheHitRate).toBe('66.77%');
			expect(formatted.costSavings).toBe('$0.0523');
		});
	});

	describe('calculateCacheEffectiveness', () => {
		it('should calculate effectiveness based on hit rate and cost savings', () => {
			const stats: CacheStatistics = {
				inputTokens: 10000,
				outputTokens: 5000,
				cacheCreationTokens: 15000,
				cacheReadTokens: 30000,
				cacheHitRate: 0.6,
				estimatedCostSavings: 0.05,
			};

			const effectiveness = calculateCacheEffectiveness(stats);

			// (0.6 * 0.6) + (min(0.05 / 0.1, 1) * 0.4) = 0.36 + 0.2 = 0.56
			expect(effectiveness).toBeCloseTo(0.56, 2);
		});

		it('should cap cost savings contribution at 1.0', () => {
			const stats: CacheStatistics = {
				inputTokens: 10000,
				outputTokens: 5000,
				cacheCreationTokens: 15000,
				cacheReadTokens: 30000,
				cacheHitRate: 0.8,
				estimatedCostSavings: 1.0, // Very high savings
			};

			const effectiveness = calculateCacheEffectiveness(stats);

			// (0.8 * 0.6) + (1.0 * 0.4) = 0.48 + 0.4 = 0.88
			expect(effectiveness).toBeCloseTo(0.88, 2);
		});
	});
});
