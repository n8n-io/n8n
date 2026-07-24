import { Container } from '@n8n/di';
import type { Mock } from 'vitest';

import { WorkflowReviewRequestReviewer } from '../../entities/workflow-review-request-reviewer.ee';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { WorkflowReviewRequestReviewerRepository } from '../workflow-review-request-reviewer.repository';

describe('WorkflowReviewRequestReviewerRepository', () => {
	const entityManager = mockEntityManager(WorkflowReviewRequestReviewer);
	const repo = Container.get(WorkflowReviewRequestReviewerRepository);

	beforeEach(() => {
		vi.resetAllMocks();
		entityManager.transaction.mockImplementation(async (fn: unknown) => {
			return await (fn as (em: typeof entityManager) => Promise<unknown>)(entityManager);
		});
	});

	describe('setReviewers', () => {
		it('replaces the notify list for the request in a transaction', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequestReviewer,
			);
			entityManager.save.mockResolvedValueOnce([
				{ workflowReviewRequestId: 'req-1', userId: 'user-1' },
				{ workflowReviewRequestId: 'req-1', userId: 'user-2' },
			]);

			const result = await repo.setReviewers('req-1', ['user-1', 'user-2', 'user-1']);

			expect(entityManager.transaction).toHaveBeenCalled();
			expect(entityManager.delete).toHaveBeenCalledWith(WorkflowReviewRequestReviewer, {
				workflowReviewRequestId: 'req-1',
			});
			expect(entityManager.save).toHaveBeenCalledTimes(1);
			expect(result).toHaveLength(2);
		});

		it('clears the notify list and returns an empty array when given no reviewers', async () => {
			const result = await repo.setReviewers('req-1', []);

			expect(entityManager.delete).toHaveBeenCalledWith(WorkflowReviewRequestReviewer, {
				workflowReviewRequestId: 'req-1',
			});
			expect(entityManager.save).not.toHaveBeenCalled();
			expect(result).toEqual([]);
		});
	});
});
