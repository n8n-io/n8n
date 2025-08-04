'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const constants_1 = require('@n8n/constants');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const luxon_1 = require('luxon');
const db_utils_1 = require('../database/entities/__tests__/db-utils');
const insights_by_period_repository_1 = require('../database/repositories/insights-by-period.repository');
const insights_pruning_service_1 = require('../insights-pruning.service');
const insights_config_1 = require('../insights.config');
beforeAll(async () => {
	await backend_test_utils_1.testModules.loadModules(['insights']);
	await backend_test_utils_1.testDb.init();
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate([
		'InsightsRaw',
		'InsightsByPeriod',
		'InsightsMetadata',
		'WorkflowEntity',
		'Project',
	]);
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
describe('InsightsPruningService', () => {
	let insightsConfig;
	let insightsByPeriodRepository;
	let insightsPruningService;
	let licenseState;
	beforeAll(async () => {
		insightsConfig = di_1.Container.get(insights_config_1.InsightsConfig);
		insightsConfig.maxAgeDays = 10;
		insightsConfig.pruneCheckIntervalHours = 1;
		insightsByPeriodRepository = di_1.Container.get(
			insights_by_period_repository_1.InsightsByPeriodRepository,
		);
		licenseState = (0, jest_mock_extended_1.mock)({
			getInsightsRetentionMaxAge: () => insightsConfig.maxAgeDays,
		});
		insightsPruningService = new insights_pruning_service_1.InsightsPruningService(
			insightsByPeriodRepository,
			insightsConfig,
			licenseState,
			(0, backend_test_utils_1.mockLogger)(),
		);
	});
	test('old insights get pruned successfully', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)();
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
		await (0, db_utils_1.createMetadata)(workflow);
		const timestamp = luxon_1.DateTime.utc().minus({ days: insightsConfig.maxAgeDays + 1 });
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: timestamp,
		});
		await insightsPruningService.pruneInsights();
		await expect(insightsByPeriodRepository.count()).resolves.toBe(0);
	});
	test('insights newer than maxAgeDays do not get pruned', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)();
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
		await (0, db_utils_1.createMetadata)(workflow);
		const timestamp = luxon_1.DateTime.utc().minus({ days: insightsConfig.maxAgeDays - 1 });
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: timestamp,
		});
		await insightsPruningService.pruneInsights();
		expect(await insightsByPeriodRepository.count()).toBe(1);
	});
	test.each([
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
			const licenseState = (0, jest_mock_extended_1.mock)({
				getInsightsRetentionMaxAge() {
					return license;
				},
			});
			const insightsPruningService = new insights_pruning_service_1.InsightsPruningService(
				insightsByPeriodRepository,
				(0, jest_mock_extended_1.mock)({
					maxAgeDays: config,
				}),
				licenseState,
				(0, backend_test_utils_1.mockLogger)(),
			);
			const maxAge = insightsPruningService.pruningMaxAgeInDays;
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
			const insightsByPeriodRepository = (0, jest_mock_extended_1.mock)({
				pruneOldData: async () => {
					return { affected: 0 };
				},
			});
			const insightsPruningService = new insights_pruning_service_1.InsightsPruningService(
				insightsByPeriodRepository,
				insightsConfig,
				licenseState,
				(0, backend_test_utils_1.mockLogger)(),
			);
			const pruneSpy = jest.spyOn(insightsPruningService, 'pruneInsights');
			const scheduleNextPruneSpy = jest.spyOn(insightsPruningService, 'scheduleNextPrune');
			insightsPruningService.startPruningTimer();
			await jest.advanceTimersToNextTimerAsync();
			expect(pruneSpy).toHaveBeenCalledTimes(1);
			expect(scheduleNextPruneSpy).toHaveBeenCalledTimes(2);
		});
		test('if stopped during prune, it does not reschedule the timeout', async () => {
			const insightsByPeriodRepository = (0, jest_mock_extended_1.mock)({
				pruneOldData: async () => {
					return { affected: 0 };
				},
			});
			const insightsPruningService = new insights_pruning_service_1.InsightsPruningService(
				insightsByPeriodRepository,
				insightsConfig,
				licenseState,
				(0, backend_test_utils_1.mockLogger)(),
			);
			let resolvePrune;
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
			jest.advanceTimersByTime(constants_1.Time.hours.toMilliseconds + 1);
			insightsPruningService.stopPruningTimer();
			resolvePrune();
			await jest.runOnlyPendingTimersAsync();
			expect(pruneInsightsMock).toHaveBeenCalledTimes(1);
		});
		test('pruneInsights is retried up when failing', async () => {
			const pruneOldDataSpy = jest
				.spyOn(insightsByPeriodRepository, 'pruneOldData')
				.mockRejectedValueOnce(new Error('Fail 1'))
				.mockRejectedValueOnce(new Error('Fail 2'))
				.mockResolvedValueOnce({ affected: 0 });
			await insightsPruningService.pruneInsights();
			await jest.advanceTimersByTimeAsync(constants_1.Time.seconds.toMilliseconds * 2 + 1);
			expect(pruneOldDataSpy).toHaveBeenCalledTimes(3);
		});
	});
});
//# sourceMappingURL=insights-pruning.service.test.js.map
