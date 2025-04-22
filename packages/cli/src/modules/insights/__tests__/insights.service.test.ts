import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { Logger } from 'n8n-core';

import type { Project } from '@/databases/entities/project';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import type { IWorkflowDb } from '@/interfaces';
import type { License } from '@/license';
import { createTeamProject } from '@test-integration/db/projects';
import { createWorkflow } from '@test-integration/db/workflows';
import * as testDb from '@test-integration/test-db';

import { createCompactedInsightsEvent } from '../database/entities/__tests__/db-utils';
import type { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import type { InsightsCollectionService } from '../insights-collection.service';
import type { InsightsCompactionService } from '../insights-compaction.service';
import { InsightsService } from '../insights.service';

// Initialize DB once for all tests
beforeAll(async () => {
	await testDb.init(['insights']);
});

beforeEach(async () => {
	await testDb.truncate([
		'InsightsRaw',
		'InsightsByPeriod',
		'InsightsMetadata',
		'Workflow',
		'Project',
	]);
});

// Terminate DB once after all tests complete
afterAll(async () => {
	await testDb.terminate();
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
});

describe('getInsightsByWorkflow', () => {
	let insightsService: InsightsService;
	beforeAll(async () => {
		insightsService = Container.get(InsightsService);
	});

	let project: Project;
	let workflow1: IWorkflowDb & WorkflowEntity;
	let workflow2: IWorkflowDb & WorkflowEntity;
	let workflow3: IWorkflowDb & WorkflowEntity;

	beforeEach(async () => {
		project = await createTeamProject();
		workflow1 = await createWorkflow({}, project);
		workflow2 = await createWorkflow({}, project);
		workflow3 = await createWorkflow({}, project);
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
	let workflow1: IWorkflowDb & WorkflowEntity;
	let workflow2: IWorkflowDb & WorkflowEntity;

	beforeEach(async () => {
		project = await createTeamProject();
		workflow1 = await createWorkflow({}, project);
		workflow2 = await createWorkflow({}, project);
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
});

describe('getAvailableDateRanges', () => {
	let insightsService: InsightsService;
	let licenseMock: jest.Mocked<License>;

	beforeAll(() => {
		licenseMock = mock<License>();
		insightsService = new InsightsService(
			mock<InsightsByPeriodRepository>(),
			mock<InsightsCompactionService>(),
			mock<InsightsCollectionService>(),
			licenseMock,
			mock<Logger>(),
		);
	});

	test('returns correct ranges when hourly data is enabled and max history is unlimited', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(-1);
		licenseMock.isInsightsHourlyDataEnabled.mockReturnValue(true);

		const result = insightsService.getAvailableDateRanges();

		expect(result).toEqual([
			{ key: 'day', licensed: true, granularity: 'hour' },
			{ key: 'week', licensed: true, granularity: 'day' },
			{ key: '2weeks', licensed: true, granularity: 'day' },
			{ key: 'month', licensed: true, granularity: 'day' },
			{ key: 'quarter', licensed: true, granularity: 'week' },
			{ key: 'year', licensed: true, granularity: 'week' },
		]);
	});

	test('returns correct ranges when hourly data is enabled and max history is 365 days', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(365);
		licenseMock.isInsightsHourlyDataEnabled.mockReturnValue(true);

		const result = insightsService.getAvailableDateRanges();

		expect(result).toEqual([
			{ key: 'day', licensed: true, granularity: 'hour' },
			{ key: 'week', licensed: true, granularity: 'day' },
			{ key: '2weeks', licensed: true, granularity: 'day' },
			{ key: 'month', licensed: true, granularity: 'day' },
			{ key: 'quarter', licensed: true, granularity: 'week' },
			{ key: 'year', licensed: true, granularity: 'week' },
		]);
	});

	test('returns correct ranges when hourly data is disabled and max history is 30 days', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(30);
		licenseMock.isInsightsHourlyDataEnabled.mockReturnValue(false);

		const result = insightsService.getAvailableDateRanges();

		expect(result).toEqual([
			{ key: 'day', licensed: false, granularity: 'hour' },
			{ key: 'week', licensed: true, granularity: 'day' },
			{ key: '2weeks', licensed: true, granularity: 'day' },
			{ key: 'month', licensed: true, granularity: 'day' },
			{ key: 'quarter', licensed: false, granularity: 'week' },
			{ key: 'year', licensed: false, granularity: 'week' },
		]);
	});

	test('returns correct ranges when max history is less than 7 days', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(5);
		licenseMock.isInsightsHourlyDataEnabled.mockReturnValue(false);

		const result = insightsService.getAvailableDateRanges();

		expect(result).toEqual([
			{ key: 'day', licensed: false, granularity: 'hour' },
			{ key: 'week', licensed: false, granularity: 'day' },
			{ key: '2weeks', licensed: false, granularity: 'day' },
			{ key: 'month', licensed: false, granularity: 'day' },
			{ key: 'quarter', licensed: false, granularity: 'week' },
			{ key: 'year', licensed: false, granularity: 'week' },
		]);
	});

	test('returns correct ranges when max history is 90 days and hourly data is enabled', () => {
		licenseMock.getInsightsMaxHistory.mockReturnValue(90);
		licenseMock.isInsightsHourlyDataEnabled.mockReturnValue(true);

		const result = insightsService.getAvailableDateRanges();

		expect(result).toEqual([
			{ key: 'day', licensed: true, granularity: 'hour' },
			{ key: 'week', licensed: true, granularity: 'day' },
			{ key: '2weeks', licensed: true, granularity: 'day' },
			{ key: 'month', licensed: true, granularity: 'day' },
			{ key: 'quarter', licensed: true, granularity: 'week' },
			{ key: 'year', licensed: false, granularity: 'week' },
		]);
	});
});
