import { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { WorkflowEntity } from '../../entities';
import { SharedWorkflow } from '../../entities/shared-workflow';
import type { OperationContext, TransactionRunner } from '../../services/transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { mockInstance } from '../../utils/test-utils/mock-instance';
import { FolderRepository } from '../folder.repository';
import { SharedWorkflowRepository } from '../shared-workflow.repository';
import { WorkflowHistoryRepository } from '../workflow-history.repository';
import { WorkflowRepository } from '../workflow.repository';

describe('WorkflowRepository.createWorkflowWithOwner', () => {
	const entityManager = mockEntityManager(WorkflowEntity);
	const transactionRunner = mock<TransactionRunner>();
	const workflowRepository = new WorkflowRepository(
		entityManager.connection,
		mockInstance(GlobalConfig, { database: { type: 'postgresdb' } }),
		mockInstance(FolderRepository),
		mockInstance(SharedWorkflowRepository),
		mockInstance(WorkflowHistoryRepository),
		transactionRunner,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		transactionRunner.run.mockImplementation(
			async (ctx: OperationContext, fn: (ctx: OperationContext) => Promise<unknown>) =>
				await fn(ctx),
		);
		entityManager.create.mockImplementation((_target, entityLike) => entityLike as never);
		entityManager.save.mockImplementation(async (entity: unknown) => {
			if (entity instanceof WorkflowEntity) entity.id = 'wf-1';
			return await Promise.resolve(entity);
		});
	});

	it('saves the workflow and its owner share in one transaction', async () => {
		const workflow = new WorkflowEntity();

		const saved = await workflowRepository.createWorkflowWithOwner(workflow, 'project-1');

		expect(saved).toBe(workflow);
		expect(transactionRunner.run).toHaveBeenCalledTimes(1);
		expect(entityManager.save).toHaveBeenNthCalledWith(1, workflow);
		expect(entityManager.create).toHaveBeenCalledWith(SharedWorkflow, {
			role: 'workflow:owner',
			projectId: 'project-1',
			workflowId: 'wf-1',
		});
		expect(entityManager.save).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ workflowId: 'wf-1' }),
		);
	});

	it('does not create the share when saving the workflow fails', async () => {
		entityManager.save.mockRejectedValueOnce(new Error('boom'));

		await expect(
			workflowRepository.createWorkflowWithOwner(new WorkflowEntity(), 'project-1'),
		).rejects.toThrow('boom');

		expect(entityManager.create).not.toHaveBeenCalled();
	});
});
