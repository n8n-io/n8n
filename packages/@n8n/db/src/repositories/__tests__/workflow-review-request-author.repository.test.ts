import { Container } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { WorkflowReviewRequestAuthor } from '../../entities/workflow-review-request-author.ee';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { WorkflowReviewRequestAuthorRepository } from '../workflow-review-request-author.repository';

describe('WorkflowReviewRequestAuthorRepository', () => {
	const entityManager = mockEntityManager(WorkflowReviewRequestAuthor);
	const repo = Container.get(WorkflowReviewRequestAuthorRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('addAuthor', () => {
		it('maps and saves the author through the provided transaction manager', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequestAuthor,
			);
			const trx = mock<EntityManager>();
			trx.save.mockImplementation(async (_target, entity) => entity);

			await repo.addAuthor({ workflowReviewRequestId: 'req-1', userId: 'user-1' }, trx);

			expect(trx.save.mock.calls[0]?.[1]).toMatchObject({
				workflowReviewRequestId: 'req-1',
				userId: 'user-1',
			});
			expect(entityManager.save).not.toHaveBeenCalled();
		});
	});

	describe('addAuthorIfMissing', () => {
		it('inserts the author when they have not been added yet', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequestAuthor,
			);
			const trx = mock<EntityManager>();
			trx.existsBy.mockResolvedValue(false);
			trx.save.mockImplementation(async (_target, entity) => entity);

			await repo.addAuthorIfMissing({ workflowReviewRequestId: 'req-1', userId: 'user-1' }, trx);

			expect(trx.existsBy).toHaveBeenCalledWith(WorkflowReviewRequestAuthor, {
				workflowReviewRequestId: 'req-1',
				userId: 'user-1',
			});
			expect(trx.save.mock.calls[0]?.[1]).toMatchObject({
				workflowReviewRequestId: 'req-1',
				userId: 'user-1',
			});
		});

		it('is a no-op when the author row already exists', async () => {
			const trx = mock<EntityManager>();
			trx.existsBy.mockResolvedValue(true);

			await repo.addAuthorIfMissing({ workflowReviewRequestId: 'req-1', userId: 'user-1' }, trx);

			expect(trx.save).not.toHaveBeenCalled();
			expect(entityManager.save).not.toHaveBeenCalled();
		});
	});
});
