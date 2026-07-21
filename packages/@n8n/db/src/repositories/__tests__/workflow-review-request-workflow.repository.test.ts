import { Container } from '@n8n/di';
import type { Mock } from 'vitest';

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

	describe('findByRequestId', () => {
		it('returns child rows ordered by id ascending', async () => {
			const rows = [{ id: 'child-1' }] as WorkflowReviewRequestWorkflow[];
			entityManager.find.mockResolvedValueOnce(rows);

			expect(await repo.findByRequestId('req-1')).toBe(rows);
			const callArgs = entityManager.find.mock.calls[0];
			expect(callArgs?.[1]).toEqual({
				where: { workflowReviewRequestId: 'req-1' },
				order: { id: 'ASC' },
			});
		});
	});
});
