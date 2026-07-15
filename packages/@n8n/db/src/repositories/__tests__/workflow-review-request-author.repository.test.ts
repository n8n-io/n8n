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
		it('persists an author row', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequestAuthor,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.addAuthor({ id: 'author-1', workflowReviewRequestId: 'req-1', userId: 'user-1' });

			const savedEntity = entityManager.save.mock.calls[0]?.[1];
			expect(savedEntity).toMatchObject({
				id: 'author-1',
				workflowReviewRequestId: 'req-1',
				userId: 'user-1',
			});
		});

		it('saves through the provided transaction manager when given', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequestAuthor,
			);
			const trx = mock<EntityManager>();
			trx.save.mockImplementation(async (_target, entity) => entity);

			await repo.addAuthor({ workflowReviewRequestId: 'req-1', userId: 'user-1' }, trx);

			expect(trx.save).toHaveBeenCalledTimes(1);
			expect(entityManager.save).not.toHaveBeenCalled();
		});
	});
});
