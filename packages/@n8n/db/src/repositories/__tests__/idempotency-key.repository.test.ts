import { mock } from 'vitest-mock-extended';

import { IdempotencyKey } from '../../entities';
import type { TransactionRunner } from '../../services/transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { IdempotencyKeyRepository } from '../idempotency-key.repository';

describe('IdempotencyKeyRepository', () => {
	const entityManager = mockEntityManager(IdempotencyKey);
	const repository = new IdempotencyKeyRepository(
		entityManager.connection,
		mock<TransactionRunner>(),
	);

	const cutoff = new Date('2026-10-08T00:00:00.000Z');
	const limit = 2;
	const createQueryBuilder = () => ({
		getQuery: vi.fn().mockReturnValue('SELECT "key"."id" FROM "idempotency_key" "key"'),
		getParameters: vi.fn().mockReturnValue({ cutoff }),
		execute: vi.fn(),
		select: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		addOrderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		setParameters: vi.fn().mockReturnThis(),
	});

	let queryBuilder: ReturnType<typeof createQueryBuilder>;

	beforeEach(() => {
		vi.resetAllMocks();
		queryBuilder = createQueryBuilder();
		entityManager.createQueryBuilder.mockReturnValue(queryBuilder);
	});

	describe('deleteOlderThan', () => {
		it('deletes expired keys in one statement, oldest first, up to the limit', async () => {
			queryBuilder.execute.mockResolvedValueOnce({ affected: 2, raw: [] });

			const deleted = await repository.deleteOlderThan(cutoff, limit);

			expect(entityManager.find).not.toHaveBeenCalled();
			expect(queryBuilder.where).toHaveBeenCalledWith('key.createdAt < :cutoff', { cutoff });
			expect(queryBuilder.orderBy).toHaveBeenCalledWith('key.createdAt', 'ASC');
			expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('key.id', 'ASC');
			expect(queryBuilder.limit).toHaveBeenCalledWith(limit);
			expect(queryBuilder.delete).toHaveBeenCalled();
			expect(queryBuilder.where).toHaveBeenCalledWith(
				'id IN (SELECT "key"."id" FROM "idempotency_key" "key")',
			);
			expect(queryBuilder.setParameters).toHaveBeenCalledWith({ cutoff });
			expect(queryBuilder.execute).toHaveBeenCalledTimes(1);
			expect(deleted).toBe(2);
		});

		it('does not query when the limit is empty', async () => {
			const deleted = await repository.deleteOlderThan(cutoff, 0);

			expect(entityManager.createQueryBuilder).not.toHaveBeenCalled();
			expect(deleted).toBe(0);
		});

		it('reports nothing deleted when the driver does not count affected rows', async () => {
			queryBuilder.execute.mockResolvedValueOnce({ affected: null, raw: [] });

			const deleted = await repository.deleteOlderThan(cutoff, limit);

			expect(deleted).toBe(0);
		});
	});
});
