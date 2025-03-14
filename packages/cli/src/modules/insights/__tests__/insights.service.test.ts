import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import type { ExecutionStatus, IRun, WorkflowExecuteMode } from 'n8n-workflow';

import type { Project } from '@/databases/entities/project';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import type { IWorkflowDb } from '@/interfaces';
import type { TypeUnits } from '@/modules/insights/entities/insights-shared';
import { InsightsMetadataRepository } from '@/modules/insights/repositories/insights-metadata.repository';
import { InsightsRawRepository } from '@/modules/insights/repositories/insights-raw.repository';
import { createTeamProject } from '@test-integration/db/projects';
import { createWorkflow } from '@test-integration/db/workflows';
import * as testDb from '@test-integration/test-db';

import { InsightsService } from '../insights.service';
import { InsightsByPeriodRepository } from '../repositories/insights-by-period.repository';

async function truncateAll() {
	const insightsRawRepository = Container.get(InsightsRawRepository);
	const insightsMetadataRepository = Container.get(InsightsMetadataRepository);
	const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
	for (const repo of [
		insightsRawRepository,
		insightsMetadataRepository,
		insightsByPeriodRepository,
	]) {
		await repo.delete({});
	}
}

describe('workflowExecuteAfterHandler', () => {
	let insightsService: InsightsService;
	let insightsRawRepository: InsightsRawRepository;
	let insightsMetadataRepository: InsightsMetadataRepository;
	beforeAll(async () => {
		await testDb.init();

		insightsService = Container.get(InsightsService);
		insightsRawRepository = Container.get(InsightsRawRepository);
		insightsMetadataRepository = Container.get(InsightsMetadataRepository);
	});

	let project: Project;
	let workflow: IWorkflowDb & WorkflowEntity;

	beforeEach(async () => {
		await truncateAll();

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

	test.each<{ status: ExecutionStatus; type: TypeUnits }>([
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

		test('compaction', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const batchSize = 100;

			let timestamp = DateTime.utc();
			for (let i = 0; i < batchSize; i++) {
				await createRawInsightsEvent(workflow, { type: 'success', value: 1, timestamp });
				// create 60 events per hour
				timestamp = timestamp.minus({ minute: 1 });
			}

			// ACT
			await insightsService.compactInsights();

			// ASSERT
			await expect(insightsRawRepository.count()).resolves.toBe(0);

			const allCompacted = await insightsByPeriodRepository.find();
			const accumulatedValues = allCompacted.reduce((acc, event) => acc + event.value, 0);
			expect(accumulatedValues).toBe(batchSize);
			for (const compacted of allCompacted) {
				expect(compacted.value).toBeLessThanOrEqual(60);
			}
		});

		test.todo('test different types');

		test.todo('does not conflate different workflows');

		test.todo('should return the number of compacted events');

		test.todo('works with data in the compacted table');
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
			const insightsRawRepository = Container.get(InsightsRawRepository);
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
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			expect(allCompacted).toHaveLength(batches.length);
			for (const [index, compacted] of allCompacted.entries()) {
				expect(compacted.value).toBe(batches[index]);
			}
		});
	});
});
