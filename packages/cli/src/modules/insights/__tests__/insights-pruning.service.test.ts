import type { LicenseState } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import { mock } from 'jest-mock-extended';

import type { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsPruningService } from '../insights-pruning.service';
import { InsightsConfig } from '../insights.config';

describe('InsightsPruningService', () => {
	let insightsConfig: InsightsConfig;
	let insightsByPeriodRepository: InsightsByPeriodRepository;
	let insightsPruningService: InsightsPruningService;
	let licenseState: LicenseState;

	beforeAll(() => {
		insightsConfig = new InsightsConfig();
		insightsConfig.maxAgeDays = 10;
		insightsConfig.pruneCheckIntervalHours = 1;
		insightsByPeriodRepository = mock<InsightsByPeriodRepository>();
		licenseState = mock<LicenseState>({
			getInsightsRetentionMaxAge: () => insightsConfig.maxAgeDays,
		});
		insightsPruningService = new InsightsPruningService(
			insightsByPeriodRepository,
			insightsConfig,
			licenseState,
			mockLogger(),
		);
	});

	describe('pruning scheduling', () => {
		beforeEach(() => {
			jest.useFakeTimers();
			insightsPruningService.startPruningTimer();
		});

		afterEach(() => {
			jest.useRealTimers();
			insightsPruningService.stopPruningTimer();
			jest.restoreAllMocks();
		});

		test('pruning timeout is scheduled on start and rescheduled after each run', async () => {
			const insightsByPeriodRepository = mock<InsightsByPeriodRepository>({
				pruneOldData: async () => {
					return { affected: 0 };
				},
			});
			const insightsPruningService = new InsightsPruningService(
				insightsByPeriodRepository,
				insightsConfig,
				licenseState,
				mockLogger(),
			);
			const pruneSpy = jest.spyOn(insightsPruningService, 'pruneInsights');
			const scheduleNextPruneSpy = jest.spyOn(insightsPruningService as any, 'scheduleNextPrune');

			insightsPruningService.startPruningTimer();

			// Wait for pruning timer promise to resolve
			await jest.advanceTimersToNextTimerAsync();

			expect(pruneSpy).toHaveBeenCalledTimes(1);
			expect(scheduleNextPruneSpy).toHaveBeenCalledTimes(2);
		});

		test('if stopped during prune, it does not reschedule the timeout', async () => {
			const insightsByPeriodRepository = mock<InsightsByPeriodRepository>({
				pruneOldData: async () => {
					return { affected: 0 };
				},
			});
			const insightsPruningService = new InsightsPruningService(
				insightsByPeriodRepository,
				insightsConfig,
				licenseState,
				mockLogger(),
			);

			let resolvePrune!: () => void;
			const pruneInsightsMock = jest
				.spyOn(insightsPruningService, 'pruneInsights')
				.mockImplementation(
					async () =>
						await new Promise((resolve) => {
							resolvePrune = () => resolve();
						}),
				);

			insightsConfig.pruneCheckIntervalHours = 1;

			insightsPruningService.startPruningTimer();
			jest.advanceTimersByTime(Time.hours.toMilliseconds + 1); // 1h + 1min

			// Immediately stop while pruning is "in progress"
			insightsPruningService.stopPruningTimer();
			resolvePrune(); // Now allow the fake pruning to complete

			// Wait for pruning timer promise and reschedule to resolve
			await jest.runOnlyPendingTimersAsync();

			expect(pruneInsightsMock).toHaveBeenCalledTimes(1); // Only from start, not re-scheduled
		});

		test('pruneInsights is retried up when failing', async () => {
			const pruneOldDataSpy = jest
				.spyOn(insightsByPeriodRepository, 'pruneOldData')
				.mockRejectedValueOnce(new Error('Fail 1'))
				.mockRejectedValueOnce(new Error('Fail 2'))
				.mockResolvedValueOnce({ affected: 0 });

			await insightsPruningService.pruneInsights();
			await jest.advanceTimersByTimeAsync(Time.seconds.toMilliseconds * 2 + 1);

			expect(pruneOldDataSpy).toHaveBeenCalledTimes(3);
		});
	});
});
