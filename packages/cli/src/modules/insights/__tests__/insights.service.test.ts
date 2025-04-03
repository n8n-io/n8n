import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import type { ExecutionStatus, IRun, WorkflowExecuteMode } from 'n8n-workflow';

import type { Project } from '@/databases/entities/project';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import type { IWorkflowDb } from '@/interfaces';
import type { TypeUnit } from '@/modules/insights/database/entities/insights-shared';
import { InsightsMetadataRepository } from '@/modules/insights/database/repositories/insights-metadata.repository';
import { InsightsRawRepository } from '@/modules/insights/database/repositories/insights-raw.repository';
import { createTeamProject } from '@test-integration/db/projects';
import { createWorkflow } from '@test-integration/db/workflows';
import * as testDb from '@test-integration/test-db';

import {
	createMetadata,
	createRawInsightsEvent,
	createCompactedInsightsEvent,
	createRawInsightsEvents,
} from '../database/entities/__tests__/db-utils';
import { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsConfig } from '../insights.config';
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

describe('workflowExecuteAfterHandler', () => {
	let insightsService: InsightsService;
	let insightsRawRepository: InsightsRawRepository;
	let insightsMetadataRepository: InsightsMetadataRepository;
	beforeAll(async () => {
		insightsService = Container.get(InsightsService);
		insightsRawRepository = Container.get(InsightsRawRepository);
		insightsMetadataRepository = Container.get(InsightsMetadataRepository);
	});

	let project: Project;
	let workflow: IWorkflowDb & WorkflowEntity;

	beforeEach(async () => {
		project = await createTeamProject();
		workflow = await createWorkflow(
			{
				settings: {
					timeSavedPerExecution: 3,
				},
			},
			project,
		);
	});

	test.each<{ status: ExecutionStatus; type: TypeUnit }>([
		{ status: 'success', type: 'success' },
		{ status: 'error', type: 'failure' },
		{ status: 'crashed', type: 'failure' },
	])('stores events for executions with the status `$status`', async ({ status, type }) => {
		// ARRANGE
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		const run = mock<IRun>({
			mode: 'webhook',
			status,
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// ACT
		await insightsService.workflowExecuteAfterHandler(ctx, run);

		// ASSERT
		const metadata = await insightsMetadataRepository.findOneBy({ workflowId: workflow.id });

		if (!metadata) {
			return fail('expected metadata to exist');
		}

		expect(metadata).toMatchObject({
			workflowId: workflow.id,
			workflowName: workflow.name,
			projectId: project.id,
			projectName: project.name,
		});

		const allInsights = await insightsRawRepository.find();
		expect(allInsights).toHaveLength(status === 'success' ? 3 : 2);
		expect(allInsights).toContainEqual(
			expect.objectContaining({ metaId: metadata.metaId, type, value: 1 }),
		);
		expect(allInsights).toContainEqual(
			expect.objectContaining({
				metaId: metadata.metaId,
				type: 'runtime_ms',
				value: stoppedAt.diff(startedAt).toMillis(),
			}),
		);
		if (status === 'success') {
			expect(allInsights).toContainEqual(
				expect.objectContaining({
					metaId: metadata.metaId,
					type: 'time_saved_min',
					value: 3,
				}),
			);
		}
	});

	test.each<{ status: ExecutionStatus }>([
		{ status: 'waiting' },
		{ status: 'canceled' },
		{ status: 'unknown' },
		{ status: 'new' },
		{ status: 'running' },
	])('does not store events for executions with the status `$status`', async ({ status }) => {
		// ARRANGE
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		const run = mock<IRun>({
			mode: 'webhook',
			status,
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// ACT
		await insightsService.workflowExecuteAfterHandler(ctx, run);

		// ASSERT
		const metadata = await insightsMetadataRepository.findOneBy({ workflowId: workflow.id });
		const allInsights = await insightsRawRepository.find();
		expect(metadata).toBeNull();
		expect(allInsights).toHaveLength(0);
	});

	test.each<{ mode: WorkflowExecuteMode }>([{ mode: 'internal' }, { mode: 'manual' }])(
		'does not store events for executions with the mode `$mode`',
		async ({ mode }) => {
			// ARRANGE
			const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });
			const startedAt = DateTime.utc();
			const stoppedAt = startedAt.plus({ seconds: 5 });
			const run = mock<IRun>({
				mode,
				status: 'success',
				startedAt: startedAt.toJSDate(),
				stoppedAt: stoppedAt.toJSDate(),
			});

			// ACT
			await insightsService.workflowExecuteAfterHandler(ctx, run);

			// ASSERT
			const metadata = await insightsMetadataRepository.findOneBy({ workflowId: workflow.id });
			const allInsights = await insightsRawRepository.find();
			expect(metadata).toBeNull();
			expect(allInsights).toHaveLength(0);
		},
	);

	test.each<{ mode: WorkflowExecuteMode }>([
		{ mode: 'evaluation' },
		{ mode: 'error' },
		{ mode: 'cli' },
		{ mode: 'retry' },
		{ mode: 'trigger' },
		{ mode: 'webhook' },
		{ mode: 'integrated' },
	])('stores events for executions with the mode `$mode`', async ({ mode }) => {
		// ARRANGE
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		const run = mock<IRun>({
			mode,
			status: 'success',
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// ACT
		await insightsService.workflowExecuteAfterHandler(ctx, run);

		// ASSERT
		const metadata = await insightsMetadataRepository.findOneBy({ workflowId: workflow.id });

		if (!metadata) {
			return fail('expected metadata to exist');
		}

		expect(metadata).toMatchObject({
			workflowId: workflow.id,
			workflowName: workflow.name,
			projectId: project.id,
			projectName: project.name,
		});

		const allInsights = await insightsRawRepository.find();
		expect(allInsights).toHaveLength(3);
		expect(allInsights).toContainEqual(
			expect.objectContaining({ metaId: metadata.metaId, type: 'success', value: 1 }),
		);
		expect(allInsights).toContainEqual(
			expect.objectContaining({
				metaId: metadata.metaId,
				type: 'runtime_ms',
				value: stoppedAt.diff(startedAt).toMillis(),
			}),
		);
		expect(allInsights).toContainEqual(
			expect.objectContaining({
				metaId: metadata.metaId,
				type: 'time_saved_min',
				value: 3,
			}),
		);
	});

	test("throws UnexpectedError if the execution's workflow has no owner", async () => {
		// ARRANGE
		const workflow = await createWorkflow({});
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		const run = mock<IRun>({
			mode: 'webhook',
			status: 'success',
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// ACT & ASSERT
		await expect(insightsService.workflowExecuteAfterHandler(ctx, run)).rejects.toThrowError(
			`Could not find an owner for the workflow with the name '${workflow.name}' and the id '${workflow.id}'`,
		);
	});
});

describe('compaction', () => {
	describe('compactRawToHour', () => {
		type TestData = {
			name: string;
			timestamps: DateTime[];
			batches: number[];
		};

		test.each<TestData>([
			{
				name: 'compact into 2 rows',
				timestamps: [
					DateTime.utc(2000, 1, 1, 0, 0),
					DateTime.utc(2000, 1, 1, 0, 59),
					DateTime.utc(2000, 1, 1, 1, 0),
				],
				batches: [2, 1],
			},
			{
				name: 'compact into 3 rows',
				timestamps: [
					DateTime.utc(2000, 1, 1, 0, 0),
					DateTime.utc(2000, 1, 1, 1, 0),
					DateTime.utc(2000, 1, 1, 2, 0),
				],
				batches: [1, 1, 1],
			},
		])('$name', async ({ timestamps, batches }) => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);
			// create before so we can create the raw events in parallel
			await createMetadata(workflow);
			for (const timestamp of timestamps) {
				await createRawInsightsEvent(workflow, { type: 'success', value: 1, timestamp });
			}

			// ACT
			const compactedRows = await insightsService.compactRawToHour();

			// ASSERT
			expect(compactedRows).toBe(timestamps.length);
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			expect(allCompacted).toHaveLength(batches.length);
			for (const [index, compacted] of allCompacted.entries()) {
				expect(compacted.value).toBe(batches[index]);
			}
		});

		test('batch compaction split events in hourly insight periods', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const batchSize = 100;

			let timestamp = DateTime.utc().startOf('hour');
			for (let i = 0; i < batchSize; i++) {
				await createRawInsightsEvent(workflow, { type: 'success', value: 1, timestamp });
				// create 60 events per hour
				timestamp = timestamp.plus({ minute: 1 });
			}

			// ACT
			await insightsService.compactInsights();

			// ASSERT
			await expect(insightsRawRepository.count()).resolves.toBe(0);

			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			const accumulatedValues = allCompacted.reduce((acc, event) => acc + event.value, 0);
			expect(accumulatedValues).toBe(batchSize);
			expect(allCompacted[0].value).toBe(60);
			expect(allCompacted[1].value).toBe(40);
		});

		test('batch compaction split events in hourly insight periods by type and workflow', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow1 = await createWorkflow({}, project);
			const workflow2 = await createWorkflow({}, project);

			const batchSize = 100;

			let timestamp = DateTime.utc().startOf('hour');
			for (let i = 0; i < batchSize / 4; i++) {
				await createRawInsightsEvent(workflow1, { type: 'success', value: 1, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}

			for (let i = 0; i < batchSize / 4; i++) {
				await createRawInsightsEvent(workflow1, { type: 'failure', value: 1, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}

			for (let i = 0; i < batchSize / 4; i++) {
				await createRawInsightsEvent(workflow2, { type: 'runtime_ms', value: 1200, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}

			for (let i = 0; i < batchSize / 4; i++) {
				await createRawInsightsEvent(workflow2, { type: 'time_saved_min', value: 3, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}

			// ACT
			await insightsService.compactInsights();

			// ASSERT
			await expect(insightsRawRepository.count()).resolves.toBe(0);

			const allCompacted = await insightsByPeriodRepository.find({
				order: { metaId: 'ASC', periodStart: 'ASC' },
			});

			// Expect 2 insights for workflow 1 (for success and failure)
			// and 3 for workflow 2 (2 period starts for runtime_ms and 1 for time_saved_min)
			expect(allCompacted).toHaveLength(5);
			const metaIds = allCompacted.map((event) => event.metaId);

			// meta id are ordered. first 2 are for workflow 1, last 3 are for workflow 2
			const uniqueMetaIds = [metaIds[0], metaIds[2]];
			const workflow1Insights = allCompacted.filter((event) => event.metaId === uniqueMetaIds[0]);
			const workflow2Insights = allCompacted.filter((event) => event.metaId === uniqueMetaIds[1]);

			expect(workflow1Insights).toHaveLength(2);
			expect(workflow2Insights).toHaveLength(3);

			const successInsights = workflow1Insights.find((event) => event.type === 'success');
			const failureInsights = workflow1Insights.find((event) => event.type === 'failure');

			expect(successInsights).toBeTruthy();
			expect(failureInsights).toBeTruthy();
			// success and failure insights should have the value matching the number or raw events (because value = 1)
			expect(successInsights!.value).toBe(25);
			expect(failureInsights!.value).toBe(25);

			const runtimeMsEvents = workflow2Insights.filter((event) => event.type === 'runtime_ms');
			const timeSavedMinEvents = workflow2Insights.find((event) => event.type === 'time_saved_min');
			expect(runtimeMsEvents).toHaveLength(2);

			// The last 10 minutes of the first hour
			expect(runtimeMsEvents[0].value).toBe(1200 * 10);

			// The first 15 minutes of the second hour
			expect(runtimeMsEvents[1].value).toBe(1200 * 15);
			expect(timeSavedMinEvents).toBeTruthy();
			expect(timeSavedMinEvents!.value).toBe(3 * 25);
		});

		test('should return the number of compacted events', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const batchSize = 100;

			let timestamp = DateTime.utc(2000, 1, 1, 0, 0);
			for (let i = 0; i < batchSize; i++) {
				await createRawInsightsEvent(workflow, { type: 'success', value: 1, timestamp });
				// create 60 events per hour
				timestamp = timestamp.plus({ minute: 1 });
			}

			// ACT
			const numberOfCompactedData = await insightsService.compactRawToHour();

			// ASSERT
			expect(numberOfCompactedData).toBe(100);
		});

		test('works with data in the compacted table', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const batchSize = 100;

			let timestamp = DateTime.utc().startOf('hour');

			// Create an existing compacted event for the first hour
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 10,
				periodUnit: 'hour',
				periodStart: timestamp,
			});

			const events = Array<{ type: 'success'; value: number; timestamp: DateTime }>();
			for (let i = 0; i < batchSize; i++) {
				events.push({ type: 'success', value: 1, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}
			await createRawInsightsEvents(workflow, events);

			// ACT
			await insightsService.compactInsights();

			// ASSERT
			await expect(insightsRawRepository.count()).resolves.toBe(0);

			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			const accumulatedValues = allCompacted.reduce((acc, event) => acc + event.value, 0);
			expect(accumulatedValues).toBe(batchSize + 10);
			expect(allCompacted[0].value).toBe(70);
			expect(allCompacted[1].value).toBe(40);
		});

		test('works with data bigger than the batch size', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			// spy on the compactRawToHour method to check if it's called multiple times
			const rawToHourSpy = jest.spyOn(insightsService, 'compactRawToHour');

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const batchSize = 600;

			let timestamp = DateTime.utc().startOf('hour');
			const events = Array<{ type: 'success'; value: number; timestamp: DateTime }>();
			for (let i = 0; i < batchSize; i++) {
				events.push({ type: 'success', value: 1, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}
			await createRawInsightsEvents(workflow, events);

			// ACT
			await insightsService.compactInsights();

			// ASSERT
			expect(rawToHourSpy).toHaveBeenCalledTimes(3);
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			const accumulatedValues = allCompacted.reduce((acc, event) => acc + event.value, 0);
			expect(accumulatedValues).toBe(batchSize);
		});
	});

	describe('compactionSchedule', () => {
		test('compaction is running on schedule', async () => {
			jest.useFakeTimers();
			try {
				// ARRANGE
				const insightsService = Container.get(InsightsService);
				insightsService.initializeCompaction();

				// spy on the compactInsights method to check if it's called
				insightsService.compactInsights = jest.fn();

				// ACT
				// advance by 1 hour and 1 minute
				jest.advanceTimersByTime(1000 * 60 * 61);

				// ASSERT
				expect(insightsService.compactInsights).toHaveBeenCalledTimes(1);
			} finally {
				jest.useRealTimers();
			}
		});
	});

	describe('compactHourToDay', () => {
		type TestData = {
			name: string;
			periodStarts: DateTime[];
			batches: number[];
		};

		test.each<TestData>([
			{
				name: 'compact into 2 rows',
				periodStarts: [
					DateTime.utc(2000, 1, 1, 0, 0),
					DateTime.utc(2000, 1, 1, 23, 59),
					DateTime.utc(2000, 1, 2, 1, 0),
				],
				batches: [2, 1],
			},
			{
				name: 'compact into 3 rows',
				periodStarts: [
					DateTime.utc(2000, 1, 1, 0, 0),
					DateTime.utc(2000, 1, 1, 23, 59),
					DateTime.utc(2000, 1, 2, 0, 0),
					DateTime.utc(2000, 1, 2, 23, 59),
					DateTime.utc(2000, 1, 3, 23, 59),
				],
				batches: [2, 2, 1],
			},
		])('$name', async ({ periodStarts, batches }) => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);
			// create before so we can create the raw events in parallel
			await createMetadata(workflow);
			for (const periodStart of periodStarts) {
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'hour',
					periodStart,
				});
			}

			// ACT
			const compactedRows = await insightsService.compactHourToDay();

			// ASSERT
			expect(compactedRows).toBe(periodStarts.length);
			const hourInsights = (await insightsByPeriodRepository.find()).filter(
				(insight) => insight.periodUnit !== 'day',
			);
			expect(hourInsights).toBeEmptyArray();
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			expect(allCompacted).toHaveLength(batches.length);
			for (const [index, compacted] of allCompacted.entries()) {
				expect(compacted.value).toBe(batches[index]);
			}
		});

		test('recent insight periods should not be compacted', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);
			// create before so we can create the raw events in parallel
			await createMetadata(workflow);
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: DateTime.utc().minus({ day: 79 }).startOf('hour'),
			});

			// ACT
			const compactedRows = await insightsService.compactHourToDay();

			// ASSERT
			expect(compactedRows).toBe(0);
		});
	});

	describe('compactDayToWeek', () => {
		type TestData = {
			name: string;
			periodStarts: DateTime[];
			batches: number[];
		};

		test.each<TestData>([
			{
				name: 'compact into 2 rows',
				periodStarts: [
					// 2000-01-03 is a Monday
					DateTime.utc(2000, 1, 3, 0, 0),
					DateTime.utc(2000, 1, 5, 23, 59),
					DateTime.utc(2000, 1, 11, 1, 0),
				],
				batches: [2, 1],
			},
			{
				name: 'compact into 3 rows',
				periodStarts: [
					// 2000-01-03 is a Monday
					DateTime.utc(2000, 1, 3, 0, 0),
					DateTime.utc(2000, 1, 4, 23, 59),
					DateTime.utc(2000, 1, 11, 0, 0),
					DateTime.utc(2000, 1, 12, 23, 59),
					DateTime.utc(2000, 1, 18, 23, 59),
				],
				batches: [2, 2, 1],
			},
		])('$name', async ({ periodStarts, batches }) => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			await createMetadata(workflow);
			for (const periodStart of periodStarts) {
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'day',
					periodStart,
				});
			}

			// ACT
			const compactedRows = await insightsService.compactDayToWeek();

			// ASSERT
			expect(compactedRows).toBe(periodStarts.length);
			const hourAndDayInsights = (await insightsByPeriodRepository.find()).filter(
				(insight) => insight.periodUnit !== 'week',
			);
			expect(hourAndDayInsights).toBeEmptyArray();
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			expect(allCompacted).toHaveLength(batches.length);
			for (const [index, compacted] of allCompacted.entries()) {
				expect(compacted.periodStart.getDay()).toBe(1);
				expect(compacted.value).toBe(batches[index]);
			}
		});

		test('recent insight periods should not be compacted', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);
			await createMetadata(workflow);
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 179 }).startOf('day'),
			});

			// ACT
			const compactedRows = await insightsService.compactDayToWeek();

			// ASSERT
			expect(compactedRows).toBe(0);
		});
	});

	describe('compaction threshold configuration', () => {
		test('insights by period older than the hourly to daily threshold are not compacted', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
			const config = Container.get(InsightsConfig);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const thresholdDays = config.compactionHourlyToDailyThresholdDays;

			// Create insights by period within and beyond the threshold
			const withinThresholdTimestamp = DateTime.utc().minus({ days: thresholdDays - 1 });
			const beyondThresholdTimestamp = DateTime.utc().minus({ days: thresholdDays + 1 });

			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: withinThresholdTimestamp,
			});

			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: beyondThresholdTimestamp,
			});

			// ACT
			const compactedRows = await insightsService.compactHourToDay();

			// ASSERT
			expect(compactedRows).toBe(1); // Only the event within the threshold should be compacted
			const insightsByPeriods = await insightsByPeriodRepository.find();
			const dailyInsights = insightsByPeriods.filter((insight) => insight.periodUnit === 'day');
			expect(dailyInsights).toHaveLength(1); // The event beyond the threshold should remain
			expect(dailyInsights[0].periodStart.toISOString()).toEqual(
				beyondThresholdTimestamp.startOf('day').toISO(),
			);
		});

		test('insights by period older than the daily to weekly threshold are not compacted', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
			const config = Container.get(InsightsConfig);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const thresholdDays = config.compactionDailyToWeeklyThresholdDays;

			// Create insights by period within and beyond the threshold
			const withinThresholdTimestamp = DateTime.utc().minus({ days: thresholdDays - 1 });
			const beyondThresholdTimestamp = DateTime.utc().minus({ days: thresholdDays + 1 });

			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: withinThresholdTimestamp,
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: beyondThresholdTimestamp,
			});

			// ACT
			const compactedRows = await insightsService.compactDayToWeek();

			// ASSERT
			expect(compactedRows).toBe(1); // Only the event within the threshold should be compacted
			const insightsByPeriods = await insightsByPeriodRepository.find();
			const weeklyInsights = insightsByPeriods.filter((insight) => insight.periodUnit === 'week');
			expect(weeklyInsights).toHaveLength(1); // The event beyond the threshold should remain
			expect(weeklyInsights[0].periodStart.toISOString()).toEqual(
				beyondThresholdTimestamp.startOf('week').toISO(),
			);
		});
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
		// last 7 days
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

		// ACT
		const summary = await insightsService.getInsightsSummary();

		// ASSERT
		expect(summary).toEqual({
			averageRunTime: { deviation: -123, unit: 'time', value: 0 },
			failed: { deviation: 1, unit: 'count', value: 1 },
			failureRate: { deviation: 0.333, unit: 'ratio', value: 0.333 },
			timeSaved: { deviation: 0, unit: 'time', value: 0 },
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
		const summary = await insightsService.getInsightsSummary();

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
		const summary = await insightsService.getInsightsSummary();

		// ASSERT
		expect(summary).toEqual({
			averageRunTime: { deviation: 0, unit: 'time', value: 0 },
			failed: { deviation: 2, unit: 'count', value: 2 },
			failureRate: { deviation: 0.5, unit: 'ratio', value: 0.5 },
			timeSaved: { deviation: 0, unit: 'time', value: 0 },
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
			failureRate: 2 / 7,
			failed: 2,
			runTime: 123,
			succeeded: 5,
			timeSaved: 0,
			averageRunTime: 123 / 7,
		});

		expect(byWorkflow.data[1]).toEqual({
			workflowId: workflow1.id,
			workflowName: workflow1.name,
			projectId: project.id,
			projectName: project.name,
			total: 6,
			failureRate: 2 / 6,
			failed: 2,
			runTime: 123,
			succeeded: 4,
			timeSaved: 0,
			averageRunTime: 123 / 6,
		});
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
