'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const luxon_1 = require('luxon');
const db_utils_1 = require('../database/entities/__tests__/db-utils');
const insights_collection_service_1 = require('../insights-collection.service');
const insights_compaction_service_1 = require('../insights-compaction.service');
const insights_config_1 = require('../insights.config');
const insights_service_1 = require('../insights.service');
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
describe('startTimers', () => {
	let insightsService;
	let compactionService;
	let collectionService;
	let pruningService;
	let instanceSettings;
	beforeEach(() => {
		compactionService = (0, jest_mock_extended_1.mock)();
		collectionService = (0, jest_mock_extended_1.mock)();
		pruningService = (0, jest_mock_extended_1.mock)();
		instanceSettings = (0, jest_mock_extended_1.mock)({
			instanceType: 'main',
		});
		insightsService = new insights_service_1.InsightsService(
			(0, jest_mock_extended_1.mock)(),
			compactionService,
			collectionService,
			pruningService,
			(0, jest_mock_extended_1.mock)(),
			instanceSettings,
			(0, backend_test_utils_1.mockLogger)(),
		);
		jest.clearAllMocks();
	});
	const setupMocks = (instanceType, isLeader = false, isPruningEnabled = false) => {
		instanceSettings.instanceType = instanceType;
		Object.defineProperty(instanceSettings, 'isLeader', {
			get: jest.fn(() => isLeader),
		});
		Object.defineProperty(pruningService, 'isPruningEnabled', {
			get: jest.fn(() => isPruningEnabled),
		});
	};
	test('starts flushing timer for main instance', () => {
		setupMocks('main', false, false);
		insightsService.startTimers();
		expect(collectionService.startFlushingTimer).toHaveBeenCalled();
		expect(compactionService.startCompactionTimer).not.toHaveBeenCalled();
		expect(pruningService.startPruningTimer).not.toHaveBeenCalled();
	});
	test('starts compaction and flushing timers for main leader instances', () => {
		setupMocks('main', true, false);
		insightsService.startTimers();
		expect(collectionService.startFlushingTimer).toHaveBeenCalled();
		expect(compactionService.startCompactionTimer).toHaveBeenCalled();
		expect(pruningService.startPruningTimer).not.toHaveBeenCalled();
	});
	test('starts compaction, flushing and pruning timers for main leader instance with pruning enabled', () => {
		setupMocks('main', true, true);
		insightsService.startTimers();
		expect(collectionService.startFlushingTimer).toHaveBeenCalled();
		expect(compactionService.startCompactionTimer).toHaveBeenCalled();
		expect(pruningService.startPruningTimer).toHaveBeenCalled();
	});
	test('starts only collection flushing timer for webhook instance', () => {
		setupMocks('webhook', false, false);
		insightsService.startTimers();
		expect(collectionService.startFlushingTimer).toHaveBeenCalled();
		expect(compactionService.startCompactionTimer).not.toHaveBeenCalled();
		expect(pruningService.startPruningTimer).not.toHaveBeenCalled();
	});
});
describe('getInsightsSummary', () => {
	let insightsService;
	beforeAll(async () => {
		insightsService = di_1.Container.get(insights_service_1.InsightsService);
	});
	let project;
	let workflow;
	beforeEach(async () => {
		project = await (0, backend_test_utils_1.createTeamProject)();
		workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
	});
	test('compacted data are summarized correctly', async () => {
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: luxon_1.DateTime.utc(),
		});
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: luxon_1.DateTime.utc().minus({ day: 2 }),
		});
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
			type: 'failure',
			value: 1,
			periodUnit: 'day',
			periodStart: luxon_1.DateTime.utc(),
		});
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: luxon_1.DateTime.utc().minus({ days: 10 }),
		});
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
			type: 'runtime_ms',
			value: 123,
			periodUnit: 'day',
			periodStart: luxon_1.DateTime.utc().minus({ days: 10 }),
		});
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
			type: 'runtime_ms',
			value: 123,
			periodUnit: 'day',
			periodStart: luxon_1.DateTime.utc().minus({ days: 13 }),
		});
		const summary = await insightsService.getInsightsSummary({ periodLengthInDays: 6 });
		expect(summary).toEqual({
			averageRunTime: { deviation: -123, unit: 'millisecond', value: 0 },
			failed: { deviation: 1, unit: 'count', value: 1 },
			failureRate: { deviation: 0.333, unit: 'ratio', value: 0.333 },
			timeSaved: { deviation: 0, unit: 'minute', value: 0 },
			total: { deviation: 2, unit: 'count', value: 3 },
		});
	});
	test('no data for previous period should return null deviation', async () => {
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: luxon_1.DateTime.utc(),
		});
		const summary = await insightsService.getInsightsSummary({ periodLengthInDays: 7 });
		expect(Object.values(summary).map((v) => v.deviation)).toEqual([null, null, null, null, null]);
	});
	test('mixed period data are summarized correctly', async () => {
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'hour',
			periodStart: luxon_1.DateTime.utc(),
		});
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: luxon_1.DateTime.utc().minus({ day: 1 }),
		});
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
			type: 'failure',
			value: 2,
			periodUnit: 'day',
			periodStart: luxon_1.DateTime.utc(),
		});
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
			type: 'success',
			value: 2,
			periodUnit: 'hour',
			periodStart: luxon_1.DateTime.utc().minus({ day: 10 }),
		});
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
			type: 'success',
			value: 3,
			periodUnit: 'day',
			periodStart: luxon_1.DateTime.utc().minus({ day: 11 }),
		});
		const summary = await insightsService.getInsightsSummary({ periodLengthInDays: 7 });
		expect(summary).toEqual({
			averageRunTime: { deviation: 0, unit: 'millisecond', value: 0 },
			failed: { deviation: 2, unit: 'count', value: 2 },
			failureRate: { deviation: 0.5, unit: 'ratio', value: 0.5 },
			timeSaved: { deviation: 0, unit: 'minute', value: 0 },
			total: { deviation: -1, unit: 'count', value: 4 },
		});
	});
});
describe('getInsightsByWorkflow', () => {
	let insightsService;
	beforeAll(async () => {
		insightsService = di_1.Container.get(insights_service_1.InsightsService);
	});
	let project;
	let workflow1;
	let workflow2;
	let workflow3;
	beforeEach(async () => {
		project = await (0, backend_test_utils_1.createTeamProject)();
		workflow1 = await (0, backend_test_utils_1.createWorkflow)({}, project);
		workflow2 = await (0, backend_test_utils_1.createWorkflow)({}, project);
		workflow3 = await (0, backend_test_utils_1.createWorkflow)({}, project);
	});
	test('compacted data are are grouped by workflow correctly', async () => {
		for (const workflow of [workflow1, workflow2]) {
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : 2,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc(),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc().minus({ day: 2 }),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc(),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc().minus({ days: 10 }),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'runtime_ms',
				value: 123,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc().minus({ days: 10 }),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: luxon_1.DateTime.utc().minus({ days: 13, hours: 23 }),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc().minus({ days: 14 }),
			});
		}
		const byWorkflow = await insightsService.getInsightsByWorkflow({
			maxAgeInDays: 14,
		});
		expect(byWorkflow.count).toEqual(2);
		expect(byWorkflow.data).toHaveLength(2);
		expect(byWorkflow.data[0]).toMatchObject({
			workflowId: workflow2.id,
			workflowName: workflow2.name,
			projectId: project.id,
			projectName: project.name,
			total: 7,
			failed: 2,
			runTime: 123,
			succeeded: 5,
			timeSaved: 0,
		});
		expect(byWorkflow.data[0].failureRate).toBeCloseTo(2 / 7);
		expect(byWorkflow.data[0].averageRunTime).toBeCloseTo(123 / 7);
		expect(byWorkflow.data[1]).toMatchObject({
			workflowId: workflow1.id,
			workflowName: workflow1.name,
			projectId: project.id,
			projectName: project.name,
			total: 6,
			failed: 2,
			runTime: 123,
			succeeded: 4,
			timeSaved: 0,
		});
		expect(byWorkflow.data[1].failureRate).toBeCloseTo(2 / 6);
		expect(byWorkflow.data[1].averageRunTime).toBeCloseTo(123 / 6);
	});
	test('compacted data are grouped by workflow correctly with sorting', async () => {
		for (const workflow of [workflow1, workflow2]) {
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : 2,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc(),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc(),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'runtime_ms',
				value: workflow === workflow1 ? 2 : 1,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc().minus({ days: 10 }),
			});
		}
		const byWorkflow = await insightsService.getInsightsByWorkflow({
			maxAgeInDays: 14,
			sortBy: 'runTime:desc',
		});
		expect(byWorkflow.count).toEqual(2);
		expect(byWorkflow.data).toHaveLength(2);
		expect(byWorkflow.data[0].workflowId).toEqual(workflow1.id);
	});
	test('compacted data are grouped by workflow correctly with pagination', async () => {
		for (const workflow of [workflow1, workflow2, workflow3]) {
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : workflow === workflow2 ? 2 : 3,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc(),
			});
		}
		const byWorkflow = await insightsService.getInsightsByWorkflow({
			maxAgeInDays: 14,
			sortBy: 'succeeded:desc',
			skip: 1,
			take: 1,
		});
		expect(byWorkflow.count).toEqual(3);
		expect(byWorkflow.data).toHaveLength(1);
		expect(byWorkflow.data[0].workflowId).toEqual(workflow2.id);
	});
	test('compacted data are grouped by workflow correctly even with 0 data (check division by 0)', async () => {
		const byWorkflow = await insightsService.getInsightsByWorkflow({
			maxAgeInDays: 14,
		});
		expect(byWorkflow.count).toEqual(0);
		expect(byWorkflow.data).toHaveLength(0);
	});
});
describe('getInsightsByTime', () => {
	let insightsService;
	beforeAll(async () => {
		insightsService = di_1.Container.get(insights_service_1.InsightsService);
	});
	let project;
	let workflow1;
	let workflow2;
	beforeEach(async () => {
		project = await (0, backend_test_utils_1.createTeamProject)();
		workflow1 = await (0, backend_test_utils_1.createWorkflow)({}, project);
		workflow2 = await (0, backend_test_utils_1.createWorkflow)({}, project);
	});
	test('returns empty array when no insights exist', async () => {
		const byTime = await insightsService.getInsightsByTime({ maxAgeInDays: 14, periodUnit: 'day' });
		expect(byTime).toEqual([]);
	});
	test('returns empty array when no insights in the time range exists', async () => {
		await (0, db_utils_1.createCompactedInsightsEvent)(workflow1, {
			type: 'success',
			value: 2,
			periodUnit: 'day',
			periodStart: luxon_1.DateTime.utc().minus({ days: 30 }),
		});
		const byTime = await insightsService.getInsightsByTime({ maxAgeInDays: 14, periodUnit: 'day' });
		expect(byTime).toEqual([]);
	});
	test('compacted data are are grouped by time correctly', async () => {
		for (const workflow of [workflow1, workflow2]) {
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : 2,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc(),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'hour',
				periodStart: luxon_1.DateTime.utc(),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc().minus({ day: 2 }),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc().minus({ days: 10 }),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'runtime_ms',
				value: workflow === workflow1 ? 10 : 20,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc().minus({ days: 10 }),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: workflow === workflow1 ? 'success' : 'failure',
				value: 1,
				periodUnit: 'hour',
				periodStart: luxon_1.DateTime.utc().minus({ days: 13, hours: 23 }),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc().minus({ days: 14 }),
			});
		}
		const byTime = await insightsService.getInsightsByTime({ maxAgeInDays: 14, periodUnit: 'day' });
		expect(byTime).toHaveLength(4);
		expect(byTime[0].date).toEqual(
			luxon_1.DateTime.utc().minus({ days: 14 }).startOf('day').toISO(),
		);
		expect(byTime[1].date).toEqual(
			luxon_1.DateTime.utc().minus({ days: 10 }).startOf('day').toISO(),
		);
		expect(byTime[2].date).toEqual(
			luxon_1.DateTime.utc().minus({ days: 2 }).startOf('day').toISO(),
		);
		expect(byTime[3].date).toEqual(luxon_1.DateTime.utc().startOf('day').toISO());
		expect(byTime[0].values).toEqual({
			total: 2,
			succeeded: 1,
			failed: 1,
			failureRate: 0.5,
			averageRunTime: 0,
			timeSaved: 0,
		});
		expect(byTime[1].values).toEqual({
			total: 2,
			succeeded: 2,
			failed: 0,
			failureRate: 0,
			averageRunTime: 15,
			timeSaved: 0,
		});
		expect(byTime[2].values).toEqual({
			total: 2,
			succeeded: 2,
			failed: 0,
			failureRate: 0,
			averageRunTime: 0,
			timeSaved: 0,
		});
		expect(byTime[3].values).toEqual({
			total: 7,
			succeeded: 3,
			failed: 4,
			failureRate: 4 / 7,
			averageRunTime: 0,
			timeSaved: 0,
		});
	});
	test('compacted data with limited insight types are grouped by time correctly', async () => {
		for (const workflow of [workflow1, workflow2]) {
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : 2,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc(),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc(),
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'time_saved_min',
				value: workflow === workflow1 ? 10 : 20,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc().minus({ days: 10 }),
			});
		}
		const byTime = await insightsService.getInsightsByTime({
			maxAgeInDays: 14,
			periodUnit: 'day',
			insightTypes: ['time_saved_min', 'failure'],
		});
		expect(byTime).toHaveLength(2);
		expect(byTime[0].date).toEqual(
			luxon_1.DateTime.utc().minus({ days: 10 }).startOf('day').toISO(),
		);
		expect(byTime[0].values).toEqual({
			timeSaved: 30,
			failed: 0,
		});
		expect(byTime[1].date).toEqual(luxon_1.DateTime.utc().startOf('day').toISO());
		expect(byTime[1].values).toEqual({
			timeSaved: 0,
			failed: 4,
		});
	});
});
describe('getAvailableDateRanges', () => {
	let licenseMock;
	let insightsService;
	beforeAll(() => {
		licenseMock = (0, jest_mock_extended_1.mock)();
		insightsService = new insights_service_1.InsightsService(
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			licenseMock,
			(0, jest_mock_extended_1.mock)(),
			(0, backend_test_utils_1.mockLogger)(),
		);
	});
	test('returns correct ranges when hourly data is enabled and max history is unlimited', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(-1);
		licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(true);
		const result = insightsService.getAvailableDateRanges();
		expect(result).toEqual([
			{ key: 'day', licensed: true, granularity: 'hour' },
			{ key: 'week', licensed: true, granularity: 'day' },
			{ key: '2weeks', licensed: true, granularity: 'day' },
			{ key: 'month', licensed: true, granularity: 'day' },
			{ key: 'quarter', licensed: true, granularity: 'week' },
			{ key: '6months', licensed: true, granularity: 'week' },
			{ key: 'year', licensed: true, granularity: 'week' },
		]);
	});
	test('returns correct ranges when hourly data is enabled and max history is 365 days', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(365);
		licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(true);
		const result = insightsService.getAvailableDateRanges();
		expect(result).toEqual([
			{ key: 'day', licensed: true, granularity: 'hour' },
			{ key: 'week', licensed: true, granularity: 'day' },
			{ key: '2weeks', licensed: true, granularity: 'day' },
			{ key: 'month', licensed: true, granularity: 'day' },
			{ key: 'quarter', licensed: true, granularity: 'week' },
			{ key: '6months', licensed: true, granularity: 'week' },
			{ key: 'year', licensed: true, granularity: 'week' },
		]);
	});
	test('returns correct ranges when hourly data is disabled and max history is 30 days', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(30);
		licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(false);
		const result = insightsService.getAvailableDateRanges();
		expect(result).toEqual([
			{ key: 'day', licensed: false, granularity: 'hour' },
			{ key: 'week', licensed: true, granularity: 'day' },
			{ key: '2weeks', licensed: true, granularity: 'day' },
			{ key: 'month', licensed: true, granularity: 'day' },
			{ key: 'quarter', licensed: false, granularity: 'week' },
			{ key: '6months', licensed: false, granularity: 'week' },
			{ key: 'year', licensed: false, granularity: 'week' },
		]);
	});
	test('returns correct ranges when max history is less than 7 days', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(5);
		licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(false);
		const result = insightsService.getAvailableDateRanges();
		expect(result).toEqual([
			{ key: 'day', licensed: false, granularity: 'hour' },
			{ key: 'week', licensed: false, granularity: 'day' },
			{ key: '2weeks', licensed: false, granularity: 'day' },
			{ key: 'month', licensed: false, granularity: 'day' },
			{ key: 'quarter', licensed: false, granularity: 'week' },
			{ key: '6months', licensed: false, granularity: 'week' },
			{ key: 'year', licensed: false, granularity: 'week' },
		]);
	});
	test('returns correct ranges when max history is 90 days and hourly data is enabled', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(90);
		licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(true);
		const result = insightsService.getAvailableDateRanges();
		expect(result).toEqual([
			{ key: 'day', licensed: true, granularity: 'hour' },
			{ key: 'week', licensed: true, granularity: 'day' },
			{ key: '2weeks', licensed: true, granularity: 'day' },
			{ key: 'month', licensed: true, granularity: 'day' },
			{ key: 'quarter', licensed: true, granularity: 'week' },
			{ key: '6months', licensed: false, granularity: 'week' },
			{ key: 'year', licensed: false, granularity: 'week' },
		]);
	});
});
describe('getMaxAgeInDaysAndGranularity', () => {
	let insightsService;
	let licenseMock;
	beforeAll(() => {
		licenseMock = (0, jest_mock_extended_1.mock)();
		insightsService = new insights_service_1.InsightsService(
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			licenseMock,
			(0, jest_mock_extended_1.mock)(),
			(0, backend_test_utils_1.mockLogger)(),
		);
	});
	test('returns correct maxAgeInDays and granularity for a valid licensed date range', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(365);
		licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(true);
		const result = insightsService.getMaxAgeInDaysAndGranularity('month');
		expect(result).toEqual({
			key: 'month',
			licensed: true,
			granularity: 'day',
			maxAgeInDays: 30,
		});
	});
	test('throws an error if the date range is not available', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(365);
		licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(true);
		expect(() => {
			insightsService.getMaxAgeInDaysAndGranularity('invalidKey');
		}).toThrowError('The selected date range is not available');
	});
	test('throws an error if the date range is not licensed', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(30);
		licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(false);
		expect(() => {
			insightsService.getMaxAgeInDaysAndGranularity('year');
		}).toThrowError('The selected date range exceeds the maximum history allowed by your license.');
	});
	test('returns correct maxAgeInDays and granularity for a valid date range with hourly data disabled', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(90);
		licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(false);
		const result = insightsService.getMaxAgeInDaysAndGranularity('quarter');
		expect(result).toEqual({
			key: 'quarter',
			licensed: true,
			granularity: 'week',
			maxAgeInDays: 90,
		});
	});
	test('returns correct maxAgeInDays and granularity for a valid date range with unlimited history', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(-1);
		licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(true);
		const result = insightsService.getMaxAgeInDaysAndGranularity('day');
		expect(result).toEqual({
			key: 'day',
			licensed: true,
			granularity: 'hour',
			maxAgeInDays: 1,
		});
	});
});
describe('shutdown', () => {
	let insightsService;
	const mockCollectionService = (0, jest_mock_extended_1.mock)({
		shutdown: jest.fn().mockResolvedValue(undefined),
		stopFlushingTimer: jest.fn(),
	});
	const mockCompactionService = (0, jest_mock_extended_1.mock)({
		stopCompactionTimer: jest.fn(),
	});
	const mockPruningService = (0, jest_mock_extended_1.mock)({
		stopPruningTimer: jest.fn(),
	});
	beforeAll(() => {
		insightsService = new insights_service_1.InsightsService(
			(0, jest_mock_extended_1.mock)(),
			mockCompactionService,
			mockCollectionService,
			mockPruningService,
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, backend_test_utils_1.mockLogger)(),
		);
	});
	test('shutdown stops timers and shuts down services', async () => {
		await insightsService.shutdown();
		expect(mockCollectionService.shutdown).toHaveBeenCalled();
		expect(mockCompactionService.stopCompactionTimer).toHaveBeenCalled();
		expect(mockPruningService.stopPruningTimer).toHaveBeenCalled();
	});
});
describe('legacy sqlite (without pooling) handles concurrent insights db process without throwing', () => {
	let initialFlushBatchSize;
	let insightsConfig;
	beforeAll(() => {
		insightsConfig = di_1.Container.get(insights_config_1.InsightsConfig);
		initialFlushBatchSize = insightsConfig.flushBatchSize;
		insightsConfig.flushBatchSize = 50;
	});
	afterAll(() => {
		insightsConfig.flushBatchSize = initialFlushBatchSize;
	});
	test('should handle concurrent flush and compaction without error', async () => {
		const insightsCollectionService = di_1.Container.get(
			insights_collection_service_1.InsightsCollectionService,
		);
		const insightsCompactionService = di_1.Container.get(
			insights_compaction_service_1.InsightsCompactionService,
		);
		const project = await (0, backend_test_utils_1.createTeamProject)();
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
		await (0, db_utils_1.createMetadata)(workflow);
		const ctx = (0, jest_mock_extended_1.mock)({ workflow });
		const startedAt = luxon_1.DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		ctx.runData = (0, jest_mock_extended_1.mock)({
			mode: 'webhook',
			status: 'success',
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});
		const rawInsights = [];
		for (let i = 0; i < 100; i++) {
			rawInsights.push({
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: luxon_1.DateTime.now().minus({ day: 91, hour: i + 1 }),
			});
		}
		await (0, db_utils_1.createRawInsightsEvents)(workflow, rawInsights);
		for (let i = 0; i < 100; i++) {
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: luxon_1.DateTime.now().minus({ day: 91, hour: i + 1 }),
			});
		}
		for (let i = 0; i < 100; i++) {
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		}
		const promises = [
			insightsCollectionService.flushEvents(),
			insightsCollectionService.flushEvents(),
			insightsCompactionService.compactRawToHour(),
			insightsCompactionService.compactHourToDay(),
		];
		await expect(Promise.all(promises)).resolves.toBeDefined();
	});
});
//# sourceMappingURL=insights.service.test.js.map
