import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import {
	ExecutionRepository,
	type SharedWorkflowRepository,
	type User,
	type WorkflowEntity,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { createRunExecutionData, type ExecutionError, type INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { extractExecutionDebugInfo, extractNodeOutput } from '../../instance-ai.adapter.service';
import { FailedExecutionPortabilityService } from '../failed-execution-portability.service';

const projectId = 'project-1';
const user = mock<User>({ id: 'user-1' });
const startedAt = new Date('2025-01-01T00:00:01.000Z');
const stoppedAt = new Date('2025-01-01T00:00:05.000Z');
const workflowVersionId = '22222222-2222-4222-8222-222222222222';

const prepareNode: INode = {
	id: 'prepare-node',
	name: 'Prepare',
	type: 'n8n-nodes-base.set',
	typeVersion: 3,
	position: [0, 0],
	parameters: {},
};

const failNode: INode = {
	id: 'fail-node',
	name: 'Fail',
	type: 'n8n-nodes-base.code',
	typeVersion: 2,
	position: [200, 0],
	parameters: {},
};

describe('FailedExecutionPortabilityService integration', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'ExecutionEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('round-trips native persistence and remains readable by existing execution tools', async () => {
		const executionPersistence = Container.get(ExecutionPersistence);
		const sourceWorkflow = await createWorkflow({
			name: 'Historical failure',
			nodes: [prepareNode, failNode],
			connections: {},
			settings: { executionOrder: 'v1' },
		});
		const targetWorkflow = await createWorkflow({
			name: 'Current edited workflow',
			nodes: [],
			connections: {},
			settings: { executionOrder: 'v1' },
		});
		const data = createRunExecutionData({
			resultData: {
				error: { message: 'Synthetic failure' } as ExecutionError,
				lastNodeExecuted: 'Fail',
				runData: {
					Prepare: [
						{
							startTime: startedAt.getTime(),
							executionTime: 5,
							executionIndex: 0,
							source: [],
							data: {
								main: [Array.from({ length: 12 }, (_, index) => ({ json: { index } }))],
							},
						},
					],
					Fail: [
						{
							startTime: stoppedAt.getTime() - 10,
							executionTime: 10,
							executionIndex: 1,
							source: [{ previousNode: 'Prepare' }],
							error: { message: 'Synthetic failure' } as ExecutionError,
						},
					],
				},
			},
		});
		const sourceExecutionId = await executionPersistence.create({
			workflowId: sourceWorkflow.id,
			data,
			workflowData: { ...sourceWorkflow, versionId: workflowVersionId },
			mode: 'manual',
			status: 'error',
			finished: false,
			startedAt,
			stoppedAt,
		});

		const activeExecutions = mock<ActiveExecutions>();
		activeExecutions.has.mockReturnValue(false);
		const workflowFinderService = mock<WorkflowFinderService>();
		workflowFinderService.findWorkflowForUser.mockImplementation(async (workflowId) => {
			if (workflowId === sourceWorkflow.id) return sourceWorkflow as WorkflowEntity;
			if (workflowId === targetWorkflow.id) return targetWorkflow as WorkflowEntity;
			return null;
		});
		const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue({ id: projectId } as never);
		const service = new FailedExecutionPortabilityService(
			executionPersistence,
			activeExecutions,
			workflowFinderService,
			sharedWorkflowRepository,
			mock<Logger>(),
		);

		const exported = await service.exportExecution(user, projectId, sourceExecutionId);
		const restored = await service.restoreExecution(
			user,
			projectId,
			targetWorkflow.id,
			exported.envelope,
		);

		expect(restored).toMatchObject({
			ok: true,
			workflowId: targetWorkflow.id,
			summary: {
				status: 'error',
				lastNodeExecuted: 'Fail',
				error: 'Synthetic failure',
				nodeRunCounts: { Prepare: 1, Fail: 1 },
			},
		});
		const persisted = await executionPersistence.findSingleExecution(restored.executionId, {
			includeData: true,
			unflattenData: true,
		});
		expect(persisted?.workflowId).toBe(targetWorkflow.id);
		expect(persisted?.workflowVersionId).toBe(workflowVersionId);
		expect(persisted?.workflowData.nodes).toEqual([prepareNode, failNode]);
		expect(persisted?.data?.resultData.runData.Prepare[0].data?.main[0]).toHaveLength(12);

		if (!persisted) throw new Error('Restored execution was not found');
		const nodeOutput = await extractNodeOutput(persisted, 'Prepare', { maxItems: 20 });
		expect(nodeOutput.totalItems).toBe(12);
		const debugInfo = await extractExecutionDebugInfo(persisted, false);
		expect(debugInfo).toMatchObject({
			status: 'error',
			failedNode: { name: 'Fail', error: 'Synthetic failure' },
		});

		const executionRepository = Container.get(ExecutionRepository);
		const executionsConfig = Container.get(GlobalConfig).executions;
		const originalMaxAge = executionsConfig.pruneDataMaxAge;
		const originalMaxCount = executionsConfig.pruneDataMaxCount;
		try {
			executionsConfig.pruneDataMaxAge = 1;
			executionsConfig.pruneDataMaxCount = 0;
			await executionRepository.softDeletePrunableExecutions();
		} finally {
			executionsConfig.pruneDataMaxAge = originalMaxAge;
			executionsConfig.pruneDataMaxCount = originalMaxCount;
		}
		expect(
			await executionRepository.findOne({
				where: { id: sourceExecutionId },
				withDeleted: true,
			}),
		).toMatchObject({ deletedAt: expect.any(Date) });
		expect(await executionRepository.findOneBy({ id: restored.executionId })).not.toBeNull();
	});
});
