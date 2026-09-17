import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';

import type { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsPruningService } from '../insights-pruning.service';
import { InsightsConfig } from '../insights.config';
import { INSIGHTS_MAX_AGE_DAYS_CAP, INSIGHTS_MAX_AGE_DAYS_DEFAULT } from '../insights.constants';

describe('InsightsPruningService', () => {
	let insightsConfig: InsightsConfig;
	let insightsByPeriodRepository: InsightsByPeriodRepository;
	let insightsPruningService: InsightsPruningService;

	beforeEach(() => {
		insightsConfig = new InsightsConfig();
		insightsConfig.maxAgeDays = 10;
		insightsByPeriodRepository = mock<InsightsByPeriodRepository>();
		insightsPruningService = new InsightsPruningService(
			insightsByPeriodRepository,
			insightsConfig,
			mockLogger(),
		);
	});

	describe('pruningMaxAgeInDays', () => {
		test('returns the configured value', () => {
			expect(insightsPruningService.pruningMaxAgeInDays).toBe(10);
		});

		test('caps the configured value', () => {
			insightsConfig.maxAgeDays = INSIGHTS_MAX_AGE_DAYS_CAP + 1;
			expect(insightsPruningService.pruningMaxAgeInDays).toBe(INSIGHTS_MAX_AGE_DAYS_CAP);
		});

		test('maps -1 (keep forever) to the cap', () => {
			insightsConfig.maxAgeDays = -1;
			expect(insightsPruningService.pruningMaxAgeInDays).toBe(INSIGHTS_MAX_AGE_DAYS_CAP);
		});

		test('falls back to the default for invalid values', () => {
			insightsConfig.maxAgeDays = 0;
			expect(insightsPruningService.pruningMaxAgeInDays).toBe(INSIGHTS_MAX_AGE_DAYS_DEFAULT);
		});
	});

	describe('pruneInsights', () => {
		test('deletes data past the retention window', async () => {
			vi.mocked(insightsByPeriodRepository.pruneOldData).mockResolvedValueOnce({ affected: 42 });

			await insightsPruningService.pruneInsights();

			expect(insightsByPeriodRepository.pruneOldData).toHaveBeenCalledWith(10);
		});

		test('propagates a pruning failure to the caller', async () => {
			vi.mocked(insightsByPeriodRepository.pruneOldData).mockRejectedValueOnce(
				new Error('prune failed'),
			);

			await expect(insightsPruningService.pruneInsights()).rejects.toThrow('prune failed');
		});
	});
});
