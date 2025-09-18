import type { InsightsDateRange } from '@n8n/api-types';
import type { LicenseState } from '@n8n/backend-common';
import {
	mockLogger,
	createTeamProject,
	createWorkflow,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, WorkflowEntity, IWorkflowDb } from '@n8n/db';
import type { WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { InstanceSettings } from 'n8n-core';
import type { IRun } from 'n8n-workflow';

import {
	createCompactedInsightsEvent,
	createMetadata,
	createRawInsightsEvents,
} from '../database/entities/__tests__/db-utils';
import type { InsightsRaw } from '../database/entities/insights-raw';
import type { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsCollectionService } from '../insights-collection.service';
import { InsightsCompactionService } from '../insights-compaction.service';
import type { InsightsPruningService } from '../insights-pruning.service';
import { InsightsConfig } from '../insights.config';
import { InsightsService } from '../insights.service';

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

// Terminate DB once after all tests complete
afterAll(async () => {
	await testDb.terminate();
});

describe('startTimers', () => {
	let insightsService: InsightsService;
	let compactionService: InsightsCompactionService;
	let collectionService: InsightsCollectionService;
	let pruningService: InsightsPruningService;
	let instanceSettings: MockProxy<InstanceSettings>;

	beforeEach(() => {
		compactionService = mock<InsightsCompactionService>();
		collectionService = mock<InsightsCollectionService>();
		pruningService = mock<InsightsPruningService>();
		instanceSettings = mock<InstanceSettings>({
			instanceType: 'main',
		});
		insightsService = new InsightsService(
			mock<InsightsByPeriodRepository>(),
			compactionService,
			collectionService,
			pruningService,
			mock<LicenseState>(),
			instanceSettings,
			mockLogger(),
		);

		jest.clearAllMocks();
	});

	const setupMocks = (
		instanceType: string,
		isLeader: boolean = false,
		isPruningEnabled: boolean = false,
	) => {
		(instanceSettings as any).instanceType = instanceType;
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
	let insightsService: InsightsService;
	beforeAll(async () => {
		insightsService = Container.get(InsightsService);
	});

	let project: Project;
	let workflow: IWorkflowDb & WorkflowEntity;

	beforeEach(async () => {
		project = await createTeamProject();
		workflow = await createWorkflow({}, project);
	});

	test('compacted data are summarized correctly', async () => {
		// ARRANGE
		// last 6 days
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc(),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ day: 2 }),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'failure',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc(),
		});
		// last 12 days
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 10 }),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'runtime_ms',
			value: 123,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 10 }),
		});
		//Outside range should not be taken into account
		await createCompactedInsightsEvent(workflow, {
			type: 'runtime_ms',
			value: 123,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 13 }),
		});

		// ACT
		const summary = await insightsService.getInsightsSummary({ periodLengthInDays: 6 });

		// ASSERT
		expect(summary).toEqual({
			averageRunTime: { deviation: -123, unit: 'millisecond', value: 0 },
			failed: { deviation: 1, unit: 'count', value: 1 },
			failureRate: { deviation: 0.333, unit: 'ratio', value: 0.333 },
			timeSaved: { deviation: 0, unit: 'minute', value: 0 },
			total: { deviation: 2, unit: 'count', value: 3 },
		});
	});

	test('no data for previous period should return null deviation', async () => {
		// ARRANGE
		// last 7 days
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc(),
		});

		// ACT
		const summary = await insightsService.getInsightsSummary({ periodLengthInDays: 7 });

		// ASSERT
		expect(Object.values(summary).map((v) => v.deviation)).toEqual([null, null, null, null, null]);
	});

	test('mixed period data are summarized correctly', async () => {
		// ARRANGE
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'hour',
			periodStart: DateTime.utc(),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ day: 1 }),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'failure',
			value: 2,
			periodUnit: 'day',
			periodStart: DateTime.utc(),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 2,
			periodUnit: 'hour',
			periodStart: DateTime.utc().minus({ day: 10 }),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 3,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ day: 11 }),
		});

		// ACT
		const summary = await insightsService.getInsightsSummary({ periodLengthInDays: 7 });

		// ASSERT
		expect(summary).toEqual({
			averageRunTime: { deviation: 0, unit: 'millisecond', value: 0 },
			failed: { deviation: 2, unit: 'count', value: 2 },
			failureRate: { deviation: 0.5, unit: 'ratio', value: 0.5 },
			timeSaved: { deviation: 0, unit: 'minute', value: 0 },
			total: { deviation: -1, unit: 'count', value: 4 },
		});
	});

	test('filter by projectId', async () => {
		// ARRANGE
		const otherProject = await createTeamProject();
		const otherWorkflow = await createWorkflow({}, otherProject);

		// last 6 days
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc(),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ day: 2 }),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'failure',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc(),
		});

		await createCompactedInsightsEvent(otherWorkflow, {
			type: 'runtime_ms',
			value: 430,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ day: 1 }),
		});
		await createCompactedInsightsEvent(otherWorkflow, {
			type: 'failure',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ day: 3 }),
		});

		// last 12 days
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 10 }),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'runtime_ms',
			value: 123,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 10 }),
		});
		await createCompactedInsightsEvent(otherWorkflow, {
			type: 'runtime_ms',
			value: 45,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 11 }),
		});
		//Outside range should not be taken into account
		await createCompactedInsightsEvent(workflow, {
			type: 'runtime_ms',
			value: 123,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 13 }),
		});
		await createCompactedInsightsEvent(otherWorkflow, {
			type: 'runtime_ms',
			value: 100,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 20 }),
		});

		// ACT
		const summary = await insightsService.getInsightsSummary({
			periodLengthInDays: 6,
			projectId: project.id,
		});

		// ASSERT
		expect(summary).toEqual({
			averageRunTime: { deviation: -123, unit: 'millisecond', value: 0 },
			failed: { deviation: 1, unit: 'count', value: 1 },
			failureRate: { deviation: 0.333, unit: 'ratio', value: 0.333 },
			timeSaved: { deviation: 0, unit: 'minute', value: 0 },
			total: { deviation: 2, unit: 'count', value: 3 },
		});
	});
});

describe('getInsightsByWorkflow', () => {
	let insightsService: InsightsService;
	beforeAll(async () => {
		insightsService = Container.get(InsightsService);
	});

	let project: Project;
	let project2: Project;
	let workflow1: IWorkflowDb & WorkflowEntity;
	let workflow2: IWorkflowDb & WorkflowEntity;
	let workflow3: IWorkflowDb & WorkflowEntity;
	let workflow4: IWorkflowDb & WorkflowEntity;

	beforeEach(async () => {
		project = await createTeamProject();
		workflow1 = await createWorkflow({}, project);
		workflow2 = await createWorkflow({}, project);
		workflow3 = await createWorkflow({}, project);

		project2 = await createTeamProject();
		workflow4 = await createWorkflow({}, project2);
	});

	test('compacted data are are grouped by workflow correctly', async () => {
		// ARRANGE
		for (const workflow of [workflow1, workflow2]) {
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 2 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			// last 14 days
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: 123,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});

			// Barely in range insight (should be included)
			// 1 hour before 14 days ago
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: DateTime.utc().minus({ days: 13, hours: 23 }),
			});

			// Out of date range insight (should not be included)
			// 14 days ago
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 14 }),
			});
		}

		// ACT
		const byWorkflow = await insightsService.getInsightsByWorkflow({
			maxAgeInDays: 14,
		});

		// ASSERT
		expect(byWorkflow.count).toEqual(2);
		expect(byWorkflow.data).toHaveLength(2);

		// expect first workflow to be workflow 2, because it has a bigger total (default sorting)
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
		// ARRANGE
		for (const workflow of [workflow1, workflow2]) {
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: workflow === workflow1 ? 2 : 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});
		}

		// ACT
		const byWorkflow = await insightsService.getInsightsByWorkflow({
			maxAgeInDays: 14,
			sortBy: 'runTime:desc',
		});

		// ASSERT
		expect(byWorkflow.count).toEqual(2);
		expect(byWorkflow.data).toHaveLength(2);
		expect(byWorkflow.data[0].workflowId).toEqual(workflow1.id);
	});

	test('compacted data are grouped by workflow correctly with pagination', async () => {
		// ARRANGE
		for (const workflow of [workflow1, workflow2, workflow3]) {
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : workflow === workflow2 ? 2 : 3,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
		}

		// ACT
		const byWorkflow = await insightsService.getInsightsByWorkflow({
			maxAgeInDays: 14,
			sortBy: 'succeeded:desc',
			skip: 1,
			take: 1,
		});

		// ASSERT
		expect(byWorkflow.count).toEqual(3);
		expect(byWorkflow.data).toHaveLength(1);
		expect(byWorkflow.data[0].workflowId).toEqual(workflow2.id);
	});

	test('compacted data are grouped by workflow correctly with projectId filter', async () => {
		// ARRANGE
		for (const workflow of [workflow1, workflow2, workflow4]) {
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 2 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			// last 14 days
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: 123,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});

			// Barely in range insight (should be included)
			// 1 hour before 14 days ago
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: DateTime.utc().minus({ days: 13, hours: 23 }),
			});

			// Out of date range insight (should not be included)
			// 14 days ago
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 14 }),
			});
		}

		// ACT
		const byWorkflow = await insightsService.getInsightsByWorkflow({
			maxAgeInDays: 14,
			projectId: project.id,
		});

		// ASSERT
		expect(byWorkflow.count).toEqual(2);
		expect(byWorkflow.data).toHaveLength(2);

		// expect first workflow to be workflow 2, because it has a bigger total (default sorting)
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

	test('compacted data are grouped by workflow correctly even with 0 data (check division by 0)', async () => {
		// ACT
		const byWorkflow = await insightsService.getInsightsByWorkflow({
			maxAgeInDays: 14,
		});

		// ASSERT
		expect(byWorkflow.count).toEqual(0);
		expect(byWorkflow.data).toHaveLength(0);
	});
});

describe('getInsightsByTime', () => {
	let insightsService: InsightsService;
	beforeAll(async () => {
		insightsService = Container.get(InsightsService);
	});

	let project: Project;
	let otherProject: Project;
	let workflow1: IWorkflowDb & WorkflowEntity;
	let workflow2: IWorkflowDb & WorkflowEntity;
	let workflow3: IWorkflowDb & WorkflowEntity;

	beforeEach(async () => {
		project = await createTeamProject();
		workflow1 = await createWorkflow({}, project);
		workflow2 = await createWorkflow({}, project);

		otherProject = await createTeamProject();
		workflow3 = await createWorkflow({}, otherProject);
	});

	test('returns empty array when no insights exist', async () => {
		const byTime = await insightsService.getInsightsByTime({ maxAgeInDays: 14, periodUnit: 'day' });
		expect(byTime).toEqual([]);
	});

	test('returns empty array when no insights in the time range exists', async () => {
		await createCompactedInsightsEvent(workflow1, {
			type: 'success',
			value: 2,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 30 }),
		});

		const byTime = await insightsService.getInsightsByTime({ maxAgeInDays: 14, periodUnit: 'day' });
		expect(byTime).toEqual([]);
	});

	test('compacted data are are grouped by time correctly', async () => {
		// ARRANGE
		for (const workflow of [workflow1, workflow2]) {
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			// Check that hourly data is grouped together with the previous daily data
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'hour',
				periodStart: DateTime.utc(),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 2 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: workflow === workflow1 ? 10 : 20,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});

			// Barely in range insight (should be included)
			// 1 hour before 14 days ago
			await createCompactedInsightsEvent(workflow, {
				type: workflow === workflow1 ? 'success' : 'failure',
				value: 1,
				periodUnit: 'hour',
				periodStart: DateTime.utc().minus({ days: 13, hours: 23 }),
			});

			// Out of date range insight (should not be included)
			// 14 days ago
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 14 }),
			});
		}

		// ACT
		const byTime = await insightsService.getInsightsByTime({ maxAgeInDays: 14, periodUnit: 'day' });

		// ASSERT
		expect(byTime).toHaveLength(4);

		// expect date to be sorted by oldest first
		expect(byTime[0].date).toEqual(DateTime.utc().minus({ days: 14 }).startOf('day').toISO());
		expect(byTime[1].date).toEqual(DateTime.utc().minus({ days: 10 }).startOf('day').toISO());
		expect(byTime[2].date).toEqual(DateTime.utc().minus({ days: 2 }).startOf('day').toISO());
		expect(byTime[3].date).toEqual(DateTime.utc().startOf('day').toISO());

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
		// ARRANGE
		for (const workflow of [workflow1, workflow2]) {
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'time_saved_min',
				value: workflow === workflow1 ? 10 : 20,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});
		}

		// ACT
		const byTime = await insightsService.getInsightsByTime({
			maxAgeInDays: 14,
			periodUnit: 'day',
			insightTypes: ['time_saved_min', 'failure'],
		});

		// ASSERT
		expect(byTime).toHaveLength(2);

		// expect results to contain only failure and time saved insights
		expect(byTime[0].date).toEqual(DateTime.utc().minus({ days: 10 }).startOf('day').toISO());
		expect(byTime[0].values).toEqual({
			timeSaved: 30,
			failed: 0,
		});

		expect(byTime[1].date).toEqual(DateTime.utc().startOf('day').toISO());
		expect(byTime[1].values).toEqual({
			timeSaved: 0,
			failed: 4,
		});
	});

	test('compacted data are are grouped by time correctly with projectId filter', async () => {
		// ARRANGE
		for (const workflow of [workflow1, workflow2, workflow3]) {
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			// Check that hourly data is grouped together with the previous daily data
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'hour',
				periodStart: DateTime.utc(),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 2 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: workflow === workflow1 ? 10 : 20,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});

			// Barely in range insight (should be included)
			// 1 hour before 14 days ago
			await createCompactedInsightsEvent(workflow, {
				type: workflow === workflow1 ? 'success' : 'failure',
				value: 1,
				periodUnit: 'hour',
				periodStart: DateTime.utc().minus({ days: 13, hours: 23 }),
			});

			// Out of date range insight (should not be included)
			// 14 days ago
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 14 }),
			});
		}

		// ACT
		const byTime = await insightsService.getInsightsByTime({
			maxAgeInDays: 14,
			periodUnit: 'day',
			projectId: project.id,
		});

		// ASSERT
		expect(byTime).toHaveLength(4);

		// expect date to be sorted by oldest first
		expect(byTime[0].date).toEqual(DateTime.utc().minus({ days: 14 }).startOf('day').toISO());
		expect(byTime[1].date).toEqual(DateTime.utc().minus({ days: 10 }).startOf('day').toISO());
		expect(byTime[2].date).toEqual(DateTime.utc().minus({ days: 2 }).startOf('day').toISO());
		expect(byTime[3].date).toEqual(DateTime.utc().startOf('day').toISO());

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
});

describe('getAvailableDateRanges', () => {
	let licenseMock: jest.Mocked<LicenseState>;
	let insightsService: InsightsService;

	beforeAll(() => {
		licenseMock = mock<LicenseState>();
		insightsService = new InsightsService(
			mock(),
			mock(),
			mock(),
			mock(),
			licenseMock,
			mock(),
			mockLogger(),
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
	let insightsService: InsightsService;
	let licenseMock: jest.Mocked<LicenseState>;

	beforeAll(() => {
		licenseMock = mock<LicenseState>();
		insightsService = new InsightsService(
			mock<InsightsByPeriodRepository>(),
			mock<InsightsCompactionService>(),
			mock<InsightsCollectionService>(),
			mock<InsightsPruningService>(),
			licenseMock,
			mock<InstanceSettings>(),
			mockLogger(),
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
			insightsService.getMaxAgeInDaysAndGranularity('invalidKey' as InsightsDateRange['key']);
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
	let insightsService: InsightsService;

	const mockCollectionService = mock<InsightsCollectionService>({
		shutdown: jest.fn().mockResolvedValue(undefined),
		stopFlushingTimer: jest.fn(),
	});

	const mockCompactionService = mock<InsightsCompactionService>({
		stopCompactionTimer: jest.fn(),
	});

	const mockPruningService = mock<InsightsPruningService>({
		stopPruningTimer: jest.fn(),
	});

	beforeAll(() => {
		insightsService = new InsightsService(
			mock<InsightsByPeriodRepository>(),
			mockCompactionService,
			mockCollectionService,
			mockPruningService,
			mock<LicenseState>(),
			mock<InstanceSettings>(),
			mockLogger(),
		);
	});

	test('shutdown stops timers and shuts down services', async () => {
		// ACT
		await insightsService.shutdown();

		// ASSERT
		expect(mockCollectionService.shutdown).toHaveBeenCalled();
		expect(mockCompactionService.stopCompactionTimer).toHaveBeenCalled();
		expect(mockPruningService.stopPruningTimer).toHaveBeenCalled();
	});
});

describe('legacy sqlite (without pooling) handles concurrent insights db process without throwing', () => {
	let initialFlushBatchSize: number;
	let insightsConfig: InsightsConfig;
	beforeAll(() => {
		insightsConfig = Container.get(InsightsConfig);
		initialFlushBatchSize = insightsConfig.flushBatchSize;

		insightsConfig.flushBatchSize = 50;
	});

	afterAll(() => {
		insightsConfig.flushBatchSize = initialFlushBatchSize;
	});

	test('should handle concurrent flush and compaction without error', async () => {
		const insightsCollectionService = Container.get(InsightsCollectionService);
		const insightsCompactionService = Container.get(InsightsCompactionService);

		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);
		await createMetadata(workflow);

		const ctx = mock<WorkflowExecuteAfterContext>({ workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		ctx.runData = mock<IRun>({
			mode: 'webhook',
			status: 'success',
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// Create test data
		const rawInsights = [];
		for (let i = 0; i < 100; i++) {
			rawInsights.push({
				type: 'success' as InsightsRaw['type'],
				value: 1,
				periodUnit: 'hour',
				periodStart: DateTime.now().minus({ day: 91, hour: i + 1 }),
			});
		}
		// Create raw insights events to be compacted
		await createRawInsightsEvents(workflow, rawInsights);

		//
		for (let i = 0; i < 100; i++) {
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: DateTime.now().minus({ day: 91, hour: i + 1 }),
			});
		}

		for (let i = 0; i < 100; i++) {
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		}

		// ACT
		const promises = [
			insightsCollectionService.flushEvents(),
			insightsCollectionService.flushEvents(),
			insightsCompactionService.compactRawToHour(),
			insightsCompactionService.compactHourToDay(),
		];
		await expect(Promise.all(promises)).resolves.toBeDefined();
	});
});
