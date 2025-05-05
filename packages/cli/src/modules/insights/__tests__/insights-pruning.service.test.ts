import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';

import { Time } from '@/constants';
import { mockLogger } from '@test/mocking';
import { createTeamProject } from '@test-integration/db/projects';
import { createWorkflow } from '@test-integration/db/workflows';
import * as testDb from '@test-integration/test-db';

import {
	createCompactedInsightsEvent,
	createMetadata,
} from '../database/entities/__tests__/db-utils';
import { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsPruningService } from '../insights-pruning.service';
import { InsightsConfig } from '../insights.config';

// Initialize DB once for all tests
beforeAll(async () => {
	await testDb.init();
});

describe('InsightsPrunningService', () => {
	let insightsConfig: InsightsConfig;
	let insightsByPeriodRepository: InsightsByPeriodRepository;
	let insightsPruningService: InsightsPruningService;
	beforeAll(async () => {
		insightsConfig = Container.get(InsightsConfig);
		insightsConfig.maxAgeDays = 10;
		insightsConfig.pruneCheckIntervalHours = 1;
		insightsPruningService = Container.get(InsightsPruningService);
		insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
	});

	test('old insights get pruned successfully', async () => {
		// ARRANGE
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);

		await createMetadata(workflow);

		const timestamp = DateTime.utc().minus({ days: insightsConfig.maxAgeDays + 1 });
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: timestamp,
		});

		// ACT
		await insightsPruningService.pruneInsights();

		// ASSERT
		expect(await insightsByPeriodRepository.count()).toBe(0);
	});

	test('insights newer than maxAgeDays do not get pruned', async () => {
		// ARRANGE
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);

		await createMetadata(workflow);

		const timestamp = DateTime.utc().minus({ days: insightsConfig.maxAgeDays - 1 });
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: timestamp,
		});

		// ACT
		await insightsPruningService.pruneInsights();

		// ASSERT
		expect(await insightsByPeriodRepository.count()).toBe(1);
	});

	test('pruning timer is scheduled on start and rescheduled after each run', async () => {
		jest.useFakeTimers();
		const insightsByPeriodRepository = mock<InsightsByPeriodRepository>({
			pruneOldData: async () => {
				return { affected: 0 };
			},
		});
		const insightsPruningService = new InsightsPruningService(
			insightsByPeriodRepository,
			insightsConfig,
			mockLogger(),
		);
		const pruneSpy = jest.spyOn(insightsPruningService, 'pruneInsights');
		const scheduleNextPruneSpy = jest.spyOn(insightsPruningService as any, 'scheduleNextPrune');

		try {
			insightsPruningService.startPruningTimer();

			// Wait for pruning timer promise to resolve
			await jest.advanceTimersToNextTimerAsync();

			expect(pruneSpy).toHaveBeenCalledTimes(1);
			expect(scheduleNextPruneSpy).toHaveBeenCalledTimes(2);
		} finally {
			jest.useRealTimers();
			insightsPruningService.stopPruningTimer();
		}
	});

	test('if stopped during prune, it does not reschedule the timer', async () => {
		jest.useFakeTimers();
		const insightsByPeriodRepository = mock<InsightsByPeriodRepository>({
			pruneOldData: async () => {
				return { affected: 0 };
			},
		});
		const insightsPruningService = new InsightsPruningService(
			insightsByPeriodRepository,
			insightsConfig,
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

		try {
			insightsConfig.pruneCheckIntervalHours = 1;

			insightsPruningService.startPruningTimer();
			jest.advanceTimersByTime(Time.hours.toMilliseconds + 1); // 1h + 1min

			// Immediately stop while pruning is "in progress"
			insightsPruningService.stopPruningTimer();
			resolvePrune(); // Now allow the fake pruning to complete

			// Wait for pruning timer promise and reschedule to resolve
			await jest.runOnlyPendingTimersAsync();

			expect(pruneInsightsMock).toHaveBeenCalledTimes(1); // Only from start, not re-scheduled
		} finally {
			pruneInsightsMock.mockRestore();
			jest.useRealTimers();
		}
	});

	test('pruneInsights is retried up to 3 times if it fails', async () => {
		const failSpy = jest
			.spyOn(insightsByPeriodRepository, 'pruneOldData')
			.mockRejectedValueOnce(new Error('Fail 1'))
			.mockRejectedValueOnce(new Error('Fail 2'))
			.mockResolvedValueOnce({ affected: 0 });

		// prevent actual wait between retries
		const delaySpy = jest
			.spyOn(insightsPruningService as any, 'delay')
			.mockResolvedValue(undefined);

		await insightsPruningService.pruneInsights();

		expect(failSpy).toHaveBeenCalledTimes(3);
		expect(delaySpy).toHaveBeenCalledTimes(2);
	});
});
