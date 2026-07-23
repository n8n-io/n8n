import { Container } from '@n8n/di';
import type { Mock } from 'vitest';

import { AgentEvalResult } from '../../entities/agent-eval-result.ee';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { AgentEvalResultRepository } from '../agent-eval-result.repository.ee';

describe('AgentEvalResultRepository', () => {
	const entityManager = mockEntityManager(AgentEvalResult);
	const repo = Container.get(AgentEvalResultRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('seedResults', () => {
		it('creates one pending result per case, preserving order index', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as AgentEvalResult,
			);
			entityManager.save.mockImplementationOnce(async (_target, entities) => entities);

			await repo.seedResults([
				{ runId: 'run-1', sourceRowId: 'row-a', runIndex: 0, input: { q: '1' } },
				{ runId: 'run-1', sourceRowId: 'row-b', runIndex: 1, input: { q: '2' } },
			]);

			const saved = entityManager.save.mock.calls[0]?.[1] as AgentEvalResult[];
			expect(saved).toHaveLength(2);
			expect(saved[0]).toMatchObject({
				status: 'new',
				runId: 'run-1',
				sourceRowId: 'row-a',
				runIndex: 0,
				input: { q: '1' },
			});
			expect(saved[1]).toMatchObject({ runIndex: 1, sourceRowId: 'row-b' });
		});

		it('defaults sourceRowId/input to null and runIndex to the seed position', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as AgentEvalResult,
			);
			entityManager.save.mockImplementationOnce(async (_target, entities) => entities);

			await repo.seedResults([{ runId: 'run-1' }, { runId: 'run-1' }]);

			const saved = entityManager.save.mock.calls[0]?.[1] as AgentEvalResult[];
			expect(saved[0]).toMatchObject({
				status: 'new',
				sourceRowId: null,
				runIndex: 0,
				input: null,
			});
			// runIndex falls back to the array position, so order is stable cross-DB.
			expect(saved[1]).toMatchObject({ runIndex: 1 });
		});
	});

	describe('markAsCompleted', () => {
		it('stores the agent output and defaults toolCalls/metrics to null', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, generatedMaps: [], raw: [] });

			await repo.markAsCompleted('res-1', { output: { answer: '42' } });

			const callArgs = entityManager.update.mock.calls[0];
			expect(callArgs?.[1]).toBe('res-1');
			expect(callArgs?.[2]).toMatchObject({
				status: 'success',
				output: { answer: '42' },
				toolCalls: null,
				metrics: null,
			});
		});
	});

	describe('markAsError', () => {
		it('stores the error code and details', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, generatedMaps: [], raw: [] });

			await repo.markAsError('res-1', 'AGENT_THREW', { message: 'boom' });

			const callArgs = entityManager.update.mock.calls[0];
			expect(callArgs?.[2]).toMatchObject({
				status: 'error',
				errorCode: 'AGENT_THREW',
				errorDetails: { message: 'boom' },
			});
		});
	});

	describe('findByRunId', () => {
		it('scopes to runId ordered by runIndex ascending', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await repo.findByRunId('run-1');

			const callArgs = entityManager.find.mock.calls[0];
			expect(callArgs?.[1]).toEqual({ where: { runId: 'run-1' }, order: { runIndex: 'ASC' } });
		});
	});
});
