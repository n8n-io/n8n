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

import { createCompactedInsightsEvent } from '../entities/__tests__/db-utils';
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

// Initialize DB once for all tests
beforeAll(async () => {
	await testDb.init();
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
});

describe('getInsightsSummary', () => {
	let insightsService: InsightsService;
	beforeAll(async () => {
		insightsService = Container.get(InsightsService);
	});

	let project: Project;
	let workflow: IWorkflowDb & WorkflowEntity;

	beforeEach(async () => {
		await truncateAll();

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

		// ACT
		const summary = await insightsService.getInsightsSummary();

		// ASSERT
		expect(summary).toEqual({
			averageRunTime: { deviation: -123, unit: 'time', value: 0 },
			failed: { deviation: 2, unit: 'count', value: 2 },
			failureRate: { deviation: 0.5, unit: 'ratio', value: 0.5 },
			timeSaved: { deviation: 0, unit: 'time', value: 0 },
			total: { deviation: 3, unit: 'count', value: 4 },
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
			await truncateAll();

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
			}

			// ACT
			const byWorkflow = await insightsService.getInsightsByWorkflow({
				nbDays: 14,
			});

			// ASSERT
			expect(byWorkflow.count).toEqual(2);
			expect(byWorkflow.data).toHaveLength(2);

			// expect first workflow to be workflow 2, because it has a bigger total (default sorting)
			expect(byWorkflow.data[0]).toEqual({
				workflowId: workflow2.id,
				workflowName: workflow2.name,
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

			expect(byWorkflow.data[1]).toEqual({
				workflowId: workflow1.id,
				workflowName: workflow1.name,
				projectId: project.id,
				projectName: project.name,
				total: 5,
				failureRate: 2 / 5,
				failed: 2,
				runTime: 123,
				succeeded: 3,
				timeSaved: 0,
				averageRunTime: 123 / 5,
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
				nbDays: 14,
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
				nbDays: 14,
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
				nbDays: 14,
			});

			// ASSERT
			expect(byWorkflow.count).toEqual(0);
			expect(byWorkflow.data).toHaveLength(0);
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

		beforeEach(async () => {
			await truncateAll();

			project = await createTeamProject();
			workflow1 = await createWorkflow({}, project);
			workflow2 = await createWorkflow({}, project);
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
			}

			// ACT
			const byWorkflow = await insightsService.getInsightsByWorkflow({
				nbDays: 14,
			});

			// ASSERT
			expect(byWorkflow.count).toEqual(2);
			expect(byWorkflow.data).toHaveLength(2);

			// expect first workflow to be workflow 2, because it has a bigger total (default sorting)
			expect(byWorkflow.data[0]).toEqual({
				workflowId: workflow2.id,
				workflowName: workflow2.name,
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

			expect(byWorkflow.data[1]).toEqual({
				workflowId: workflow1.id,
				workflowName: workflow1.name,
				projectId: project.id,
				projectName: project.name,
				total: 5,
				failureRate: 2 / 5,
				failed: 2,
				runTime: 123,
				succeeded: 3,
				timeSaved: 0,
				averageRunTime: 123 / 5,
			});
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
			await truncateAll();

			project = await createTeamProject();
			workflow1 = await createWorkflow({}, project);
			workflow2 = await createWorkflow({}, project);
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
				await createCompactedInsightsEvent(workflow, {
					type: 'failure',
					value: 2,
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
			}

			// ACT
			const byTime = await insightsService.getInsightsByTime(14);

			// ASSERT
			expect(byTime).toHaveLength(3);

			// expect date to be sorted by oldest first
			expect(byTime[0].date).toEqual(DateTime.utc().minus({ days: 10 }).startOf('day').toISO());
			expect(byTime[1].date).toEqual(DateTime.utc().minus({ days: 2 }).startOf('day').toISO());
			expect(byTime[2].date).toEqual(DateTime.utc().startOf('day').toISO());

			expect(byTime[0].values).toEqual({
				total: 2,
				succeeded: 2,
				failed: 0,
				failureRate: 0,
				averageRunTime: 15,
				timeSaved: 0,
			});

			expect(byTime[1].values).toEqual({
				total: 2,
				succeeded: 2,
				failed: 0,
				failureRate: 0,
				averageRunTime: 0,
				timeSaved: 0,
			});

			expect(byTime[2].values).toEqual({
				total: 7,
				succeeded: 3,
				failed: 4,
				failureRate: 4 / 7,
				averageRunTime: 0,
				timeSaved: 0,
			});
		});
	});
});
