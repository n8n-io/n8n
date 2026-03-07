import type { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	mockLogger,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { InstanceType } from '@n8n/constants';
import type { IWorkflowDb, Project, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';

import { createCompactedInsightsEvent } from '../database/entities/__tests__/db-utils';
import type { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsCollectionService } from '../insights-collection.service';
import type { InsightsCompactionService } from '../insights-compaction.service';
import type { InsightsPruningService } from '../insights-pruning.service';
import { InsightsService } from '../insights.service';

describe('InsightsService (Integration)', () => {
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
		let pruningService: InsightsPruningService;
		let instanceSettings: MockProxy<InstanceSettings>;
		let realCollectionService: InsightsCollectionService;
		let initSpy: jest.SpyInstance;
		let shutdownSpy: jest.SpyInstance;

		beforeEach(() => {
			compactionService = mock<InsightsCompactionService>();
			pruningService = mock<InsightsPruningService>();
			instanceSettings = mock<InstanceSettings>({
				instanceType: 'main',
			});
			insightsService = new InsightsService(
				mock<InsightsByPeriodRepository>(),
				compactionService,
				pruningService,
				mock<LicenseState>(),
				instanceSettings,
				mockLogger(),
			);

			// Get the real service from the container and spy on it
			realCollectionService = Container.get(InsightsCollectionService);
			initSpy = jest.spyOn(realCollectionService, 'init');
			shutdownSpy = jest.spyOn(realCollectionService, 'shutdown');

			jest.clearAllMocks();
		});

		afterEach(async () => {
			// Shutdown the service to clear timers
			await insightsService.shutdown();
			// Clean up spies
			initSpy.mockRestore();
			shutdownSpy.mockRestore();
		});

		const setupMocks = (
			instanceType: InstanceType,
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

		test('starts flushing timer for main instance', async () => {
			setupMocks('main', false, false);

			await insightsService.init();

			expect(initSpy).toHaveBeenCalled();
			expect(compactionService.startCompactionTimer).not.toHaveBeenCalled();
			expect(pruningService.startPruningTimer).not.toHaveBeenCalled();
		});

		test('starts compaction and flushing timers for main leader instances', async () => {
			setupMocks('main', true, false);

			await insightsService.init();

			expect(initSpy).toHaveBeenCalled();
			expect(compactionService.startCompactionTimer).toHaveBeenCalled();
			expect(pruningService.startPruningTimer).not.toHaveBeenCalled();
		});

		test('starts compaction, flushing and pruning timers for main leader instance with pruning enabled', async () => {
			setupMocks('main', true, true);

			await insightsService.init();

			expect(initSpy).toHaveBeenCalled();
			expect(compactionService.startCompactionTimer).toHaveBeenCalled();
			expect(pruningService.startPruningTimer).toHaveBeenCalled();
		});

		test('starts only collection flushing timer for webhook instance', async () => {
			setupMocks('webhook', false, false);

			await insightsService.init();

			expect(initSpy).toHaveBeenCalled();
			expect(compactionService.startCompactionTimer).not.toHaveBeenCalled();
			expect(pruningService.startPruningTimer).not.toHaveBeenCalled();
		});

		test('do no start any timers for non-main instances', async () => {
			setupMocks('worker', false, false);

			await insightsService.init();

			expect(initSpy).not.toHaveBeenCalled();
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

		test('should get summarized insights for the last 7', async () => {
			// ARRANGE
			const endDate = DateTime.utc();
			const startDate = endDate.minus({ days: 6 });

			// Insights withing range
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 8,
				periodUnit: 'day',
				periodStart: endDate.minus({ day: 1 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 2,
				periodUnit: 'hour',
				periodStart: endDate.minus({ day: 2 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'day',
				periodStart: endDate.minus({ day: 2 }),
			});

			// Insights within previous period
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 15,
				periodUnit: 'day',
				periodStart: startDate.minus({ days: 1 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 3,
				periodUnit: 'day',
				periodStart: startDate.minus({ days: 2 }),
			});

			// Insights outside range should not be taken into account
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 2,
				periodUnit: 'day',
				periodStart: startDate.minus({ days: 10 }),
			});

			// ACT
			const summary = await insightsService.getInsightsSummary({
				startDate: startDate.toJSDate(),
				endDate: endDate.toJSDate(),
			});

			// ASSERT
			expect(summary).toEqual({
				averageRunTime: { deviation: 0, unit: 'millisecond', value: 0 },
				failed: { deviation: -1, unit: 'count', value: 2 },
				failureRate: { deviation: 0, unit: 'ratio', value: 0.167 },
				timeSaved: { deviation: 0, unit: 'minute', value: 0 },
				total: { deviation: -6, unit: 'count', value: 12 },
			});
		});

		test('no data for previous period should return null deviation', async () => {
			// ARRANGE
			const now = DateTime.utc();

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

		test('filter by projectId', async () => {
			// ARRANGE
			const endDate = DateTime.utc();
			const startDate = endDate.minus({ days: 6 });
			const otherProject = await createTeamProject();
			const otherWorkflow = await createWorkflow({}, otherProject);

			for (const wf of [workflow, otherWorkflow]) {
				// Insights for the current period
				await createCompactedInsightsEvent(wf, {
					type: 'success',
					value: 10,
					periodUnit: 'day',
					periodStart: endDate.minus({ days: 1 }),
				});
				await createCompactedInsightsEvent(wf, {
					type: 'runtime_ms',
					value: 400,
					periodUnit: 'day',
					periodStart: endDate.minus({ days: 1 }),
				});

				// Insights for the previous period
				await createCompactedInsightsEvent(wf, {
					type: 'success',
					value: 15,
					periodUnit: 'day',
					periodStart: startDate.minus({ days: 2 }),
				});
				await createCompactedInsightsEvent(wf, {
					type: 'runtime_ms',
					value: 600,
					periodUnit: 'day',
					periodStart: startDate.minus({ days: 2 }),
				});

				// Insights outside range should not be taken into account
				await createCompactedInsightsEvent(wf, {
					type: 'success',
					value: 2,
					periodUnit: 'day',
					periodStart: startDate.minus({ days: 10 }),
				});
				await createCompactedInsightsEvent(wf, {
					type: 'runtime_ms',
					value: 200,
					periodUnit: 'day',
					periodStart: startDate.minus({ days: 10 }),
				});
			}

			// ACT
			const summary = await insightsService.getInsightsSummary({
				startDate: startDate.toJSDate(),
				endDate: endDate.toJSDate(),
				projectId: project.id,
			});

			// ASSERT
			expect(summary).toEqual({
				averageRunTime: { value: 40, unit: 'millisecond', deviation: 0 },
				failed: { value: 0, unit: 'count', deviation: 0 },
				failureRate: { value: 0, unit: 'ratio', deviation: 0 },
				timeSaved: { value: 0, unit: 'minute', deviation: 0 },
				total: { value: 10, unit: 'count', deviation: -5 },
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
					periodStart: now.minus({ days: 2 }),
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
					periodStart: now.minus({ days: 14 }).endOf('day'),
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
			const now = DateTime.utc();
			await createCompactedInsightsEvent(workflow1, {
				type: 'success',
				value: 2,
				periodUnit: 'day',
				periodStart: now.minus({ days: 30 }),
			});

			const startDate = now.minus({ days: 14 }).toJSDate();

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
					periodStart: now.minus({ days: 14 }).endOf('day'),
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
			const now = DateTime.utc();
			// ARRANGE
			for (const workflow of [workflow1, workflow2, workflow3]) {
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
					periodStart: now.minus({ days: 14 }).endOf('day'),
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
			const byTime = await insightsService.getInsightsByTime({
				startDate,
				endDate: today,
				projectId: project.id,
			});

			expect(byTime).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						date: now.minus({ days: 14 }).startOf('day').toISO(),
						values: {
							total: 2,
							succeeded: 1,
							failed: 1,
							failureRate: 0.5,
							averageRunTime: 0,
							timeSaved: 0,
						},
					}),
					expect.objectContaining({
						date: now.minus({ days: 10 }).startOf('day').toISO(),
						values: {
							total: 2,
							succeeded: 2,
							failed: 0,
							failureRate: 0,
							averageRunTime: 15,
							timeSaved: 0,
						},
					}),
					expect.objectContaining({
						date: now.minus({ days: 2 }).startOf('day').toISO(),
						values: {
							total: 2,
							succeeded: 2,
							failed: 0,
							failureRate: 0,
							averageRunTime: 0,
							timeSaved: 0,
						},
					}),
					expect.objectContaining({
						date: now.startOf('day').toISO(),
						values: {
							total: 7,
							succeeded: 3,
							failed: 4,
							failureRate: 4 / 7,
							averageRunTime: 0,
							timeSaved: 0,
						},
					}),
				]),
			);
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
				mockPruningService,
				mock<LicenseState>(),
				mock<InstanceSettings>({ instanceType: 'main' }),
				mockLogger(),
			);
		});

		test('shutdown stops timers and shuts down services', async () => {
			// ARRANGE
			// Get the real service from the container and spy on it
			const realCollectionService = Container.get(InsightsCollectionService);
			const shutdownSpy = jest.spyOn(realCollectionService, 'shutdown');

			// ACT
			await insightsService.shutdown();

			// ASSERT
			expect(shutdownSpy).toHaveBeenCalled();
			expect(mockCompactionService.stopCompactionTimer).toHaveBeenCalled();
			expect(mockPruningService.stopPruningTimer).toHaveBeenCalled();
		});
	});
});
