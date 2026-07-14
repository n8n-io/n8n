import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';
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

	describe('findByRequestId', () => {
		it('scopes the lookup to the request id', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await repo.findByRequestId('req-1');

			const callArgs = entityManager.find.mock.calls[0];
			expect(callArgs?.[1]).toEqual({
				where: { workflowReviewRequestId: 'req-1' },
				order: { id: 'ASC' },
			});
		});
	});

	describe('findByRequestIds', () => {
		it('queries reviewers for the given request ids', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await repo.findByRequestIds(['req-1', 'req-2']);

			const callArgs = entityManager.find.mock.calls[0];
			expect(callArgs?.[1]).toEqual({
				where: { workflowReviewRequestId: In(['req-1', 'req-2']) },
				order: { id: 'ASC' },
			});
		});
	});
});
