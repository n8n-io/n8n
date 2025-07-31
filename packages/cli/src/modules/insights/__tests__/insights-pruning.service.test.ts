import type { LicenseState } from '@n8n/backend-common';
import {
	mockLogger,
	createTeamProject,
	createWorkflow,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';

import {
	createCompactedInsightsEvent,
	createMetadata,
} from '../database/entities/__tests__/db-utils';
import { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsPruningService } from '../insights-pruning.service';
import { InsightsConfig } from '../insights.config';

beforeAll(async () => {
	await testModules.loadModules(['insights']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate([
		'InsightsRaw',
		'InsightsByPeriod',
		'InsightsMetadata',
		'WorkflowEntity',
		'Project',
	]);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('InsightsPruningService', () => {
	let insightsConfig: InsightsConfig;
	let insightsByPeriodRepository: InsightsByPeriodRepository;
	let insightsPruningService: InsightsPruningService;
	let licenseState: LicenseState;
	beforeAll(async () => {
		insightsConfig = Container.get(InsightsConfig);
		insightsConfig.maxAgeDays = 10;
		insightsConfig.pruneCheckIntervalHours = 1;
		insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
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
		await expect(insightsByPeriodRepository.count()).resolves.toBe(0);
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

	test.each<{ config: number; license: number; result: number }>([
		{
			config: -1,
			license: -1,
			result: Number.MAX_SAFE_INTEGER,
		},
		{
			config: -1,
			license: 5,
			result: 5,
		},
		{
			config: 5,
			license: -1,
			result: 5,
		},
		{
			config: 5,
			license: 10,
			result: 5,
		},
		{
			config: 10,
			license: 5,
			result: 5,
		},
	])(
		'pruningMaxAgeInDays is minimal age between license and config max age',
		async ({ config, license, result }) => {
			// ARRANGE
			const licenseState = mock<LicenseState>({
				getInsightsRetentionMaxAge() {
					return license;
				},
			});
			const insightsPruningService = new InsightsPruningService(
				insightsByPeriodRepository,
				mock<InsightsConfig>({
					maxAgeDays: config,
				}),
				licenseState,
				mockLogger(),
			);

			// ACT
			const maxAge = insightsPruningService.pruningMaxAgeInDays;

			// ASSERT
			expect(maxAge).toBe(result);
		},
	);

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
