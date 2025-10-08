import type { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	mockLogger,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { IWorkflowDb, Project, WorkflowEntity } from '@n8n/db';
import type { WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { InstanceSettings } from 'n8n-core';
import { UserError, type IRun } from 'n8n-workflow';

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

describe('InsightsService', () => {
	const today = new Date();

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
		beforeAll(() => {
			insightsService = Container.get(InsightsService);
		});

		let project: Project;
		let workflow: IWorkflowDb & WorkflowEntity;

		beforeEach(async () => {
			project = await createTeamProject();
			workflow = await createWorkflow({}, project);
		});

		test('compacted data are summarized correctly', async () => {
			const now = DateTime.utc();
			// ARRANGE
			// last 6 days
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: now,
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: now.minus({ day: 2 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 1,
				periodUnit: 'day',
				periodStart: now,
			});
			// last 12 days
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: now.minus({ days: 10 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: 123,
				periodUnit: 'day',
				periodStart: now.minus({ days: 10 }),
			});
			//Outside range should not be taken into account
			await createCompactedInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: 123,
				periodUnit: 'day',
				periodStart: now.minus({ days: 13 }),
			});

			const startDate = now.minus({ days: 6 }).toJSDate();

			// ACT
			const summary = await insightsService.getInsightsSummary({ startDate, endDate: today });

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
			const now = DateTime.utc();
			// last 7 days
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: now,
			});

			const startDate = now.minus({ days: 7 }).toJSDate();

			// ACT
			const summary = await insightsService.getInsightsSummary({ startDate, endDate: today });

			// ASSERT
			expect(Object.values(summary).map((v) => v.deviation)).toEqual([
				null,
				null,
				null,
				null,
				null,
			]);
		});

		test('mixed period data are summarized correctly', async () => {
			// ARRANGE

			// current period
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 14 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 2,
				periodUnit: 'hour',
				periodStart: DateTime.utc().minus({ day: 10 }),
			});

			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 11,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 13 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 8,
				periodUnit: 'hour',
				periodStart: DateTime.utc().minus({ day: 10, hours: 8 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 1,
				periodUnit: 'hour',
				periodStart: DateTime.utc().minus({ day: 9, hours: 7 }),
			});

			await createCompactedInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: 35789,
				periodUnit: 'week',
				periodStart: DateTime.utc().minus({ day: 14 }),
			});

			await createCompactedInsightsEvent(workflow, {
				type: 'time_saved_min',
				value: 15,
				periodUnit: 'week',
				periodStart: DateTime.utc().minus({ day: 14 }),
			});

			// previous period
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 2,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 16 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 17 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: 123,
				periodUnit: 'week',
				periodStart: DateTime.utc().minus({ day: 21 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'time_saved_min',
				value: 10,
				periodUnit: 'week',
				periodStart: DateTime.utc().minus({ day: 21 }),
			});

			// out of range data (after selected period)
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 5,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 6 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 3,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 4 }),
			});

			// out of range data (before selected period)
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 2,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 22 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ year: 1 }),
			});

			const startDate = DateTime.utc().minus({ days: 14 }).toJSDate();
			const endDate = DateTime.utc().minus({ days: 7 }).toJSDate();

			// ACT
			const summary = await insightsService.getInsightsSummary({ startDate, endDate });

			// ASSERT
			expect(summary).toEqual({
				averageRunTime: { value: 0, unit: 'millisecond', deviation: -8947.25 },
				failed: { value: 20, unit: 'count', deviation: 18 },
				failureRate: { value: 0.87, unit: 'ratio', deviation: 0.37 },
				timeSaved: { value: 0, unit: 'minute', deviation: -15 },
				total: { value: 23, unit: 'count', deviation: 19 },
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

			const startDate = DateTime.utc().minus({ days: 6 }).toJSDate();

			// ACT
			const summary = await insightsService.getInsightsSummary({
				startDate,
				endDate: today,
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

		beforeAll(() => {
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
			const now = DateTime.utc();
			for (const workflow of [workflow1, workflow2]) {
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: workflow === workflow1 ? 1 : 2,
					periodUnit: 'day',
					periodStart: now.minus({ day: 2 }),
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'day',
					periodStart: now.minus({ day: 3 }),
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'failure',
					value: 2,
					periodUnit: 'day',
					periodStart: now.minus({ day: 6 }),
				});
				// last 14 days
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'day',
					periodStart: now.minus({ days: 10 }),
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'runtime_ms',
					value: 123,
					periodUnit: 'day',
					periodStart: now.minus({ days: 10 }),
				});

				// Barely in range insight (should be included)
				// 1 hour before 14 days ago
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'hour',
					periodStart: now.minus({ days: 13, hours: 23 }),
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'hour',
					periodStart: now.minus({ days: 1 }),
				});

				// Out of date range insight (should not be included)
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 20,
					periodUnit: 'day',
					periodStart: now.minus({ days: 15 }),
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'failure',
					value: 10,
					periodUnit: 'day',
					periodStart: now.minus({ months: 3 }),
				});

				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 2,
					periodUnit: 'day',
					periodStart: now,
				});
			}

			const startDate = now.minus({ days: 14 }).toJSDate();
			const endDate = now.minus({ days: 1 }).toJSDate();

			// ACT
			const byWorkflow = await insightsService.getInsightsByWorkflow({
				startDate,
				endDate,
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
				total: 8,
				failed: 2,
				runTime: 123,
				succeeded: 6,
				timeSaved: 0,
			});
			expect(byWorkflow.data[0].failureRate).toBeCloseTo(2 / 8);
			expect(byWorkflow.data[0].averageRunTime).toBeCloseTo(123 / 8);

			expect(byWorkflow.data[1]).toMatchObject({
				workflowId: workflow1.id,
				workflowName: workflow1.name,
				projectId: project.id,
				projectName: project.name,
				total: 7,
				failed: 2,
				runTime: 123,
				succeeded: 5,
				timeSaved: 0,
			});
			expect(byWorkflow.data[1].failureRate).toBeCloseTo(2 / 7);
			expect(byWorkflow.data[1].averageRunTime).toBeCloseTo(123 / 7);
		});

		test('compacted data are grouped by workflow correctly with sorting', async () => {
			// ARRANGE
			const now = DateTime.utc();
			for (const workflow of [workflow1, workflow2]) {
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: workflow === workflow1 ? 1 : 2,
					periodUnit: 'day',
					periodStart: now,
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'failure',
					value: 2,
					periodUnit: 'day',
					periodStart: now,
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'runtime_ms',
					value: workflow === workflow1 ? 2 : 1,
					periodUnit: 'day',
					periodStart: now.minus({ days: 10 }),
				});
			}

			const startDate = now.minus({ days: 14 }).toJSDate();

			// ACT
			const byWorkflow = await insightsService.getInsightsByWorkflow({
				startDate,
				endDate: now.toJSDate(),
				sortBy: 'runTime:desc',
			});

			// ASSERT
			expect(byWorkflow.count).toEqual(2);
			expect(byWorkflow.data).toHaveLength(2);
			expect(byWorkflow.data[0].workflowId).toEqual(workflow1.id);
		});

		test('compacted data are grouped by workflow correctly with pagination', async () => {
			// ARRANGE
			const now = DateTime.utc();
			for (const workflow of [workflow1, workflow2, workflow3]) {
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: workflow === workflow1 ? 1 : workflow === workflow2 ? 2 : 3,
					periodUnit: 'day',
					periodStart: now,
				});
			}

			const startDate = now.minus({ days: 14 }).toJSDate();

			// ACT
			const byWorkflow = await insightsService.getInsightsByWorkflow({
				startDate,
				endDate: today,
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
			const now = DateTime.utc();
			for (const workflow of [workflow1, workflow2, workflow4]) {
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: workflow === workflow1 ? 1 : 2,
					periodUnit: 'day',
					periodStart: now,
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'day',
					periodStart: now.minus({ day: 2 }),
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'failure',
					value: 2,
					periodUnit: 'day',
					periodStart: now,
				});
				// last 14 days
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'day',
					periodStart: now.minus({ days: 10 }),
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'runtime_ms',
					value: 123,
					periodUnit: 'day',
					periodStart: now.minus({ days: 10 }),
				});

				// Barely in range insight (should be included)
				// 1 hour before 14 days ago
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'hour',
					periodStart: now.minus({ days: 14 }).startOf('day'),
				});

				// Out of date range insight (should not be included)
				// 14 days ago
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'day',
					periodStart: now.minus({ days: 15 }),
				});
			}

			const startDate = now.minus({ days: 14 }).toJSDate();

			// ACT
			const byWorkflow = await insightsService.getInsightsByWorkflow({
				startDate,
				endDate: now.toJSDate(),
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
			// ARRANGE
			const startDate = DateTime.utc().minus({ days: 14 }).toJSDate();

			// ACT
			const byWorkflow = await insightsService.getInsightsByWorkflow({
				startDate,
				endDate: today,
			});

			// ASSERT
			expect(byWorkflow.count).toEqual(0);
			expect(byWorkflow.data).toHaveLength(0);
		});
	});

	describe('getInsightsByTime', () => {
		let insightsService: InsightsService;
		beforeAll(() => {
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
			const startDate = DateTime.utc().minus({ days: 14 }).toJSDate();
			const byTime = await insightsService.getInsightsByTime({
				startDate,
				endDate: today,
			});
			expect(byTime).toEqual([]);
		});

		test('returns empty array when no insights in the time range exists', async () => {
			await createCompactedInsightsEvent(workflow1, {
				type: 'success',
				value: 2,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 30 }),
			});

			const startDate = DateTime.utc().minus({ days: 14 }).toJSDate();

			const byTime = await insightsService.getInsightsByTime({
				startDate,
				endDate: today,
			});
			expect(byTime).toEqual([]);
		});

		test('compacted data are are grouped by time correctly', async () => {
			// ARRANGE
			const now = DateTime.utc();
			for (const workflow of [workflow1, workflow2]) {
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: workflow === workflow1 ? 1 : 2,
					periodUnit: 'day',
					periodStart: now,
				});
				// Check that hourly data is grouped together with the previous daily data
				await createCompactedInsightsEvent(workflow, {
					type: 'failure',
					value: 2,
					periodUnit: 'hour',
					periodStart: now,
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'day',
					periodStart: now.minus({ day: 2 }),
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'day',
					periodStart: now.minus({ days: 10 }),
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'runtime_ms',
					value: workflow === workflow1 ? 10 : 20,
					periodUnit: 'day',
					periodStart: now.minus({ days: 10 }),
				});

				// Barely in range insight (should be included)
				await createCompactedInsightsEvent(workflow, {
					type: workflow === workflow1 ? 'success' : 'failure',
					value: 1,
					periodUnit: 'hour',
					periodStart: now.minus({ days: 14 }).startOf('day'),
				});

				// Out of date range insight (should not be included)
				// 15 days ago
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'day',
					periodStart: now.minus({ days: 15 }),
				});
			}

			const startDate = now.minus({ days: 14 }).toJSDate();

			// ACT
			const byTime = await insightsService.getInsightsByTime({
				startDate,
				endDate: today,
			});

			// ASSERT
			expect(byTime).toHaveLength(4);

			// expect date to be sorted by oldest first
			expect(byTime[0].date).toEqual(now.minus({ days: 14 }).startOf('day').toISO());
			expect(byTime[1].date).toEqual(now.minus({ days: 10 }).startOf('day').toISO());
			expect(byTime[2].date).toEqual(now.minus({ days: 2 }).startOf('day').toISO());
			expect(byTime[3].date).toEqual(now.startOf('day').toISO());

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
			const now = DateTime.utc();
			for (const workflow of [workflow1, workflow2]) {
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: workflow === workflow1 ? 1 : 2,
					periodUnit: 'day',
					periodStart: now,
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'failure',
					value: 2,
					periodUnit: 'day',
					periodStart: now,
				});
				await createCompactedInsightsEvent(workflow, {
					type: 'time_saved_min',
					value: workflow === workflow1 ? 10 : 20,
					periodUnit: 'day',
					periodStart: now.minus({ days: 10 }),
				});
			}

			const startDate = now.minus({ days: 14 }).toJSDate();

			// ACT
			const byTime = await insightsService.getInsightsByTime({
				startDate,
				endDate: today,
				insightTypes: ['time_saved_min', 'failure'],
			});

			// ASSERT
			expect(byTime).toHaveLength(2);

			// expect results to contain only failure and time saved insights
			expect(byTime[0].date).toEqual(now.minus({ days: 10 }).startOf('day').toISO());
			expect(byTime[0].values).toEqual({
				timeSaved: 30,
				failed: 0,
			});

			expect(byTime[1].date).toEqual(now.startOf('day').toISO());
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
				await createCompactedInsightsEvent(workflow, {
					type: workflow === workflow1 ? 'success' : 'failure',
					value: 1,
					periodUnit: 'hour',
					periodStart: DateTime.utc().minus({ days: 14 }).startOf('day'),
				});

				// Out of date range insight (should not be included)
				// 14 days ago
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'day',
					periodStart: DateTime.utc().minus({ days: 15 }),
				});
			}

			const startDate = DateTime.utc().minus({ days: 14 }).toJSDate();

			// ACT
			const byTime = await insightsService.getInsightsByTime({
				startDate,
				endDate: today,
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

	describe('validateDateFiltersLicense', () => {
		let licenseStateMock: jest.Mocked<LicenseState>;
		let insightsService: InsightsService;

		beforeEach(() => {
			licenseStateMock = mock<LicenseState>();
			insightsService = new InsightsService(
				mock<InsightsByPeriodRepository>(),
				mock<InsightsCompactionService>(),
				mock<InsightsCollectionService>(),
				mock<InsightsPruningService>(),
				licenseStateMock,
				mock<InstanceSettings>(),
				mockLogger(),
			);
		});

		test('throws error if granularity is hour and hourly data is not licensed', () => {
			licenseStateMock.isInsightsHourlyDataLicensed.mockReturnValue(false);
			licenseStateMock.getInsightsMaxHistory.mockReturnValue(30);

			const startDate = DateTime.now().minus({ days: 3 }).startOf('day');
			const endDate = startDate.plus({ hours: 10 });

			expect(() =>
				insightsService.validateDateFiltersLicense({
					startDate: startDate.toJSDate(),
					endDate: endDate.toJSDate(),
				}),
			).toThrowError(new UserError('Hourly data is not available with your current license'));
		});

		test('does not throw if granularity is hour and hourly data is licensed', () => {
			licenseStateMock.isInsightsHourlyDataLicensed.mockReturnValue(true);
			licenseStateMock.getInsightsMaxHistory.mockReturnValue(30);

			const startDate = DateTime.now().minus({ days: 3 }).startOf('day');
			const endDate = startDate.endOf('day');

			expect(() =>
				insightsService.validateDateFiltersLicense({
					startDate: startDate.toJSDate(),
					endDate: endDate.toJSDate(),
				}),
			).not.toThrow();
		});

		test('throws error if startDate is outside max history allowed by license', () => {
			licenseStateMock.isInsightsHourlyDataLicensed.mockReturnValue(true);
			licenseStateMock.getInsightsMaxHistory.mockReturnValue(7);

			const today = DateTime.now().startOf('day');
			const startDate = today.minus({ days: 8 }).toJSDate();
			const endDate = today.toJSDate();

			expect(() => insightsService.validateDateFiltersLicense({ startDate, endDate })).toThrowError(
				new UserError(
					'The selected date range exceeds the maximum history allowed by your license',
				),
			);
		});

		test('does not throw if startDate is within max history allowed by license', () => {
			licenseStateMock.isInsightsHourlyDataLicensed.mockReturnValue(true);
			licenseStateMock.getInsightsMaxHistory.mockReturnValue(7);

			const today = DateTime.now().startOf('day');
			const startDate = today.minus({ days: 7 }).toJSDate();
			const endDate = today.toJSDate();

			expect(() =>
				insightsService.validateDateFiltersLicense({ startDate, endDate }),
			).not.toThrow();
		});

		test('does not throw if max history is unlimited (-1)', () => {
			licenseStateMock.isInsightsHourlyDataLicensed.mockReturnValue(true);
			licenseStateMock.getInsightsMaxHistory.mockReturnValue(-1);

			const today = DateTime.now().startOf('day');
			const startDate = today.minus({ years: 3 }).toJSDate();
			const endDate = today.toJSDate();

			expect(() =>
				insightsService.validateDateFiltersLicense({ startDate, endDate }),
			).not.toThrow();
		});

		test('does not throw for day granularity when hourly data is not licensed', () => {
			licenseStateMock.isInsightsHourlyDataLicensed.mockReturnValue(false);
			licenseStateMock.getInsightsMaxHistory.mockReturnValue(30);

			const today = DateTime.now().startOf('day');
			const startDate = today.minus({ days: 2 }).toJSDate();
			const endDate = today.toJSDate();

			expect(() =>
				insightsService.validateDateFiltersLicense({ startDate, endDate }),
			).not.toThrow();
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
});
