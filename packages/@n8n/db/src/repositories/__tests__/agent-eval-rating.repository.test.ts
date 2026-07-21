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
});
