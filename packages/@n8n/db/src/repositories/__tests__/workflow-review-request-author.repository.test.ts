import { Container } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { WorkflowReviewRequestAuthor } from '../../entities/workflow-review-request-author.ee';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { WorkflowReviewRequestAuthorRepository } from '../workflow-review-request-author.repository';

describe('WorkflowReviewRequestAuthorRepository', () => {
	const entityManager = mockEntityManager(WorkflowReviewRequestAuthor);
	const repo = Container.get(WorkflowReviewRequestAuthorRepository);

	/** A transaction manager plus the context that resolves to it. */
	const transacted = () => {
		const transactionManager = mock<EntityManager>();
		return { transactionManager, ctx: { trx: new TypeOrmTransaction(transactionManager) } };
	};

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('addAuthor', () => {
		it("maps and saves the author through the context's transaction manager", async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequestAuthor,
			);
			const { transactionManager, ctx } = transacted();
			transactionManager.save.mockImplementation(async (_target, entity) => entity);

			await repo.addAuthor({ workflowReviewRequestId: 'req-1', userId: 'user-1' }, ctx);

			expect(transactionManager.save.mock.calls[0]?.[1]).toMatchObject({
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
			const { transactionManager, ctx } = transacted();
			transactionManager.existsBy.mockResolvedValue(false);
			transactionManager.save.mockImplementation(async (_target, entity) => entity);

			await repo.addAuthorIfMissing({ workflowReviewRequestId: 'req-1', userId: 'user-1' }, ctx);

			expect(transactionManager.existsBy).toHaveBeenCalledWith(WorkflowReviewRequestAuthor, {
				workflowReviewRequestId: 'req-1',
				userId: 'user-1',
			});
			expect(transactionManager.save.mock.calls[0]?.[1]).toMatchObject({
				workflowReviewRequestId: 'req-1',
				userId: 'user-1',
			});
		});

		it('is a no-op when the author row already exists', async () => {
			const { transactionManager, ctx } = transacted();
			transactionManager.existsBy.mockResolvedValue(true);

			await repo.addAuthorIfMissing({ workflowReviewRequestId: 'req-1', userId: 'user-1' }, ctx);

			expect(transactionManager.save).not.toHaveBeenCalled();
			expect(entityManager.save).not.toHaveBeenCalled();
		});
	});
});
