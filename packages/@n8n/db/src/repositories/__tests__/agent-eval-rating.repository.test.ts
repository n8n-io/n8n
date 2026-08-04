import { Container } from '@n8n/di';
import type { Mock } from 'vitest';

import { AgentEvalRating } from '../../entities/agent-eval-rating.ee';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { AgentEvalRatingRepository } from '../agent-eval-rating.repository.ee';

describe('AgentEvalRatingRepository', () => {
	const entityManager = mockEntityManager(AgentEvalRating);
	const repo = Container.get(AgentEvalRatingRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('createRating', () => {
		it('defaults comment/correction/ratedById to null', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as AgentEvalRating,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createRating({ resultId: 'res-1', vote: 'up' });

			const saved = entityManager.save.mock.calls[0]?.[1];
			expect(saved).toMatchObject({
				resultId: 'res-1',
				vote: 'up',
				comment: null,
				correction: null,
				ratedById: null,
			});
		});

		it('persists a downvote with a correction and author', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as AgentEvalRating,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createRating({
				resultId: 'res-1',
				vote: 'down',
				comment: 'wrong tone',
				correction: { answer: 'better' },
				ratedById: 'user-1',
			});

			const saved = entityManager.save.mock.calls[0]?.[1];
			expect(saved).toMatchObject({
				vote: 'down',
				comment: 'wrong tone',
				correction: { answer: 'better' },
				ratedById: 'user-1',
			});
		});
	});

	describe('findByResultId', () => {
		it('scopes to resultId, newest first', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await repo.findByResultId('res-1');

			const callArgs = entityManager.find.mock.calls[0];
			expect(callArgs?.[1]).toEqual({ where: { resultId: 'res-1' }, order: { createdAt: 'DESC' } });
		});
	});

	describe('findLatestByRunId', () => {
		/** Pass one returns `{ id, resultId }` rows; pass two loads those ids. */
		const queryBuilderReturning = (rows: Array<{ id: string; resultId: string }>) => {
			const qb = {
				select: vi.fn().mockReturnThis(),
				addSelect: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				addOrderBy: vi.fn().mockReturnThis(),
				getRawMany: vi.fn().mockResolvedValue(rows),
			};
			(entityManager.createQueryBuilder as Mock).mockReturnValue(qb);
			return qb;
		};

		it('loads only the newest rating per result and scopes the join to the run', async () => {
			// Ordered as the query returns them: grouped by result, newest first.
			const qb = queryBuilderReturning([
				{ id: 'r-2', resultId: 'res-1' },
				{ id: 'r-1', resultId: 'res-1' },
				{ id: 'r-3', resultId: 'res-2' },
			]);
			entityManager.find.mockResolvedValueOnce([
				// Deliberately out of order: the caller-visible order comes from pass one.
				{ id: 'r-3', resultId: 'res-2' },
				{ id: 'r-2', resultId: 'res-1' },
			] as AgentEvalRating[]);

			const latest = await repo.findLatestByRunId('run-1');

			expect(qb.where).toHaveBeenCalledWith('result.runId = :runId', { runId: 'run-1' });
			// The superseded r-1 is never fetched, only the two winners.
			expect(entityManager.find.mock.calls[0]?.[1]).toEqual({
				where: { id: expect.objectContaining({ _value: ['r-2', 'r-3'] }) },
			});
			expect(latest.map((rating) => rating.id)).toEqual(['r-2', 'r-3']);
		});

		it('returns an empty list without a second query when the run has no ratings', async () => {
			queryBuilderReturning([]);

			await expect(repo.findLatestByRunId('run-1')).resolves.toEqual([]);
			expect(entityManager.find).not.toHaveBeenCalled();
		});
	});
});
