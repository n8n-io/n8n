import { Container } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { WorkflowReviewRequestWorkflow } from '../../entities/workflow-review-request-workflow.ee';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { WorkflowReviewRequestWorkflowRepository } from '../workflow-review-request-workflow.repository';

describe('WorkflowReviewRequestWorkflowRepository', () => {
	const entityManager = mockEntityManager(WorkflowReviewRequestWorkflow);
	const repo = Container.get(WorkflowReviewRequestWorkflowRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('createWorkflowRow', () => {
		it('persists a child row with the pinned workflow version', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequestWorkflow,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createWorkflowRow({
				id: 'child-1',
				workflowReviewRequestId: 'req-1',
				workflowId: 'wf-1',
				workflowVersionId: 'ver-1',
			});

			const savedEntity = entityManager.save.mock.calls[0]?.[1];
			expect(savedEntity).toMatchObject({
				id: 'child-1',
				workflowReviewRequestId: 'req-1',
				workflowId: 'wf-1',
				workflowVersionId: 'ver-1',
			});
		});

		it('allows a null workflowVersionId for future git-backed reviews', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequestWorkflow,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createWorkflowRow({
				workflowReviewRequestId: 'req-1',
				workflowId: 'wf-1',
			});

			const savedEntity = entityManager.save.mock.calls[0]?.[1];
			expect(savedEntity).toMatchObject({
				workflowVersionId: null,
			});
		});
	});

	describe('updateWorkflowVersion', () => {
		it('updates only the row matching the (requestId, workflowId) pair', async () => {
			await repo.updateWorkflowVersion({
				workflowReviewRequestId: 'req-1',
				workflowId: 'wf-1',
				workflowVersionId: 'ver-2',
			});

			expect(entityManager.update).toHaveBeenCalledWith(
				WorkflowReviewRequestWorkflow,
				{ workflowReviewRequestId: 'req-1', workflowId: 'wf-1' },
				{ workflowVersionId: 'ver-2' },
			);
		});

		it('writes through the provided transaction manager', async () => {
			const trx = mock<EntityManager>();

			await repo.updateWorkflowVersion(
				{ workflowReviewRequestId: 'req-1', workflowId: 'wf-1', workflowVersionId: 'ver-2' },
				trx,
			);

			expect(trx.update).toHaveBeenCalledWith(
				WorkflowReviewRequestWorkflow,
				{ workflowReviewRequestId: 'req-1', workflowId: 'wf-1' },
				{ workflowVersionId: 'ver-2' },
			);
			expect(entityManager.update).not.toHaveBeenCalled();
		});
	});
});
