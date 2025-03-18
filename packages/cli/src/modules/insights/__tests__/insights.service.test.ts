import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import type { ExecutionStatus, IRun, WorkflowExecuteMode } from 'n8n-workflow';

import type { Project } from '@/databases/entities/project';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { InsightsMetadataRepository } from '@/databases/repositories/insights-metadata.repository';
import { InsightsRawRepository } from '@/databases/repositories/insights-raw.repository';
import type { IWorkflowDb } from '@/interfaces';
import type { TypeUnits } from '@/modules/insights/entities/insights-shared';
import { createTeamProject } from '@test-integration/db/projects';
import { createWorkflow } from '@test-integration/db/workflows';

import * as testDb from '../../../../test/integration/shared/test-db';
import { InsightsService } from '../insights.service';

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
		await testDb.truncate(['InsightsRaw', 'InsightsMetadata', 'InsightsByPeriod']);

		project = await createTeamProject();
		workflow = await createWorkflow({}, project);
	});

	afterAll(async () => {
		await testDb.terminate();
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
		expect(allInsights).toHaveLength(2);
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
		expect(allInsights).toHaveLength(2);
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
