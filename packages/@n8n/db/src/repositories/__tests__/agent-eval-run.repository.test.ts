import { Container } from '@n8n/di';
import type { Mock } from 'vitest';

import { AgentEvalRun } from '../../entities/agent-eval-run.ee';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { AgentEvalRunRepository } from '../agent-eval-run.repository.ee';

describe('AgentEvalRunRepository', () => {
	const entityManager = mockEntityManager(AgentEvalRun);
	const repo = Container.get(AgentEvalRunRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('createRun', () => {
		it('starts a run as "new" with cancellation cleared', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as AgentEvalRun,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createRun({ datasetId: 'ds-1', agentVersionId: 'v-1' });

			const saved = entityManager.save.mock.calls[0]?.[1];
			expect(saved).toMatchObject({
				status: 'new',
				datasetId: 'ds-1',
				agentVersionId: 'v-1',
				createdById: null,
				cancelRequested: false,
			});
		});

		it('defaults agentVersionId to null when unpinned', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as AgentEvalRun,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createRun({ datasetId: 'ds-1' });

			const saved = entityManager.save.mock.calls[0]?.[1] as AgentEvalRun;
			expect(saved.agentVersionId).toBeNull();
		});
	});

	describe('markAsRunning', () => {
		it('records the running instance for cross-main cancellation', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, generatedMaps: [], raw: [] });

			await repo.markAsRunning('run-1', 'main-2');

			const callArgs = entityManager.update.mock.calls[0];
			expect(callArgs?.[1]).toBe('run-1');
			expect(callArgs?.[2]).toMatchObject({ status: 'running', runningInstanceId: 'main-2' });
			expect((callArgs?.[2] as { runAt: Date }).runAt).toBeInstanceOf(Date);
		});

		it('nulls the running instance when none is given', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, generatedMaps: [], raw: [] });

			await repo.markAsRunning('run-1');

			const callArgs = entityManager.update.mock.calls[0];
			expect((callArgs?.[2] as { runningInstanceId: string | null }).runningInstanceId).toBeNull();
		});
	});

	describe('markAsError', () => {
		it('stores the error code and details', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, generatedMaps: [], raw: [] });

			await repo.markAsError('run-1', 'RUNNER_FAILED', { message: 'boom' });

			const callArgs = entityManager.update.mock.calls[0];
			expect(callArgs?.[2]).toMatchObject({
				status: 'error',
				errorCode: 'RUNNER_FAILED',
				errorDetails: { message: 'boom' },
				runningInstanceId: null,
			});
		});

		it('stores metrics alongside the error so a partial run keeps its tally', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, generatedMaps: [], raw: [] });

			await repo.markAsError(
				'run-1',
				'timeout',
				{ message: 'deadline exceeded' },
				{ total: 5, success: 3, usage: { inputTokens: 20, outputTokens: 40 } },
			);

			const callArgs = entityManager.update.mock.calls[0];
			expect(callArgs?.[2]).toMatchObject({
				status: 'error',
				errorCode: 'timeout',
				errorDetails: { message: 'deadline exceeded' },
				metrics: { total: 5, success: 3, usage: { inputTokens: 20, outputTokens: 40 } },
			});
		});

		it('clears the running instance so finished runs leave no stale pointer', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, generatedMaps: [], raw: [] });

			await repo.markAsCompleted('run-1', { score: 1 });

			const callArgs = entityManager.update.mock.calls[0];
			expect(callArgs?.[2]).toMatchObject({ status: 'completed', runningInstanceId: null });
		});
	});

	describe('requestCancellation', () => {
		it('sets the cancel flag as a pub/sub fallback', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, generatedMaps: [], raw: [] });

			await repo.requestCancellation('run-1');

			const callArgs = entityManager.update.mock.calls[0];
			expect(callArgs?.[1]).toBe('run-1');
			expect(callArgs?.[2]).toEqual({ cancelRequested: true });
		});
	});

	describe('findByDatasetId', () => {
		it('scopes to datasetId, newest first', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await repo.findByDatasetId('ds-1');

			const callArgs = entityManager.find.mock.calls[0];
			expect(callArgs?.[1]).toEqual({ where: { datasetId: 'ds-1' }, order: { createdAt: 'DESC' } });
		});
	});

	describe('markAsCancelled', () => {
		it('marks cancelled, persists partial metrics, and clears the running instance', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, generatedMaps: [], raw: [] });

			await repo.markAsCancelled('run-1', { total: 3, usage: { inputTokens: 5 } });

			const callArgs = entityManager.update.mock.calls[0];
			expect(callArgs?.[1]).toBe('run-1');
			expect(callArgs?.[2]).toMatchObject({
				status: 'cancelled',
				metrics: { total: 3, usage: { inputTokens: 5 } },
				runningInstanceId: null,
			});
		});

		it('defaults metrics to null when none are given', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, generatedMaps: [], raw: [] });

			await repo.markAsCancelled('run-1');

			expect(entityManager.update.mock.calls[0]?.[2]).toMatchObject({
				status: 'cancelled',
				metrics: null,
			});
		});
	});

	describe('findById', () => {
		it('looks up a run by id', async () => {
			entityManager.findOneBy.mockResolvedValueOnce(null);

			await repo.findById('run-1');

			expect(entityManager.findOneBy.mock.calls[0]?.[1]).toEqual({ id: 'run-1' });
		});
	});

	// A run has no agent column of its own — the agent under test is its
	// dataset's — so these scoped reads walk the relation.
	describe('findByIdAndAgentId', () => {
		it('constrains the run by its dataset’s agent', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);

			await repo.findByIdAndAgentId('run-1', 'agent-1');

			expect(entityManager.findOne.mock.calls[0]?.[1]).toEqual({
				where: { id: 'run-1', dataset: { agentId: 'agent-1' } },
			});
		});
	});

	describe('findAndCountByDatasetIdAndAgentId', () => {
		it('constrains the dataset’s runs by that agent, newest first', async () => {
			entityManager.findAndCount.mockResolvedValueOnce([[], 0]);

			await repo.findAndCountByDatasetIdAndAgentId('ds-1', 'agent-1');

			expect(entityManager.findAndCount.mock.calls[0]?.[1]).toMatchObject({
				where: { datasetId: 'ds-1', dataset: { agentId: 'agent-1' } },
			});
		});

		// `createdAt` alone is not a total order, so without the tiebreak a run
		// sharing a timestamp could show up on two pages, or on none.
		it('breaks createdAt ties deterministically so paging cannot skip a run', async () => {
			entityManager.findAndCount.mockResolvedValueOnce([[], 0]);

			await repo.findAndCountByDatasetIdAndAgentId('ds-1', 'agent-1');

			expect(entityManager.findAndCount.mock.calls[0]?.[1]).toMatchObject({
				order: { createdAt: 'DESC', id: 'DESC' },
			});
		});

		// The point of the method: one page from the database, not every run.
		it('pushes the page window into the query', async () => {
			entityManager.findAndCount.mockResolvedValueOnce([[], 0]);

			await repo.findAndCountByDatasetIdAndAgentId('ds-1', 'agent-1', { take: 20, skip: 40 });

			expect(entityManager.findAndCount.mock.calls[0]?.[1]).toMatchObject({
				take: 20,
				skip: 40,
			});
		});

		it('returns the unpaginated total alongside the page', async () => {
			const page = [{ id: 'run-1' }, { id: 'run-2' }] as AgentEvalRun[];
			entityManager.findAndCount.mockResolvedValueOnce([page, 137]);

			const [runs, count] = await repo.findAndCountByDatasetIdAndAgentId('ds-1', 'agent-1', {
				take: 2,
				skip: 0,
			});

			expect(runs).toEqual(page);
			expect(count).toBe(137);
		});
	});

	describe('isCancellationRequested', () => {
		it('reads only the cancel flag and returns it', async () => {
			entityManager.findOne.mockResolvedValueOnce({ id: 'run-1', cancelRequested: true });

			const result = await repo.isCancellationRequested('run-1');

			expect(result).toBe(true);
			expect(entityManager.findOne.mock.calls[0]?.[1]).toEqual({
				where: { id: 'run-1' },
				select: ['id', 'cancelRequested'],
			});
		});

		it('returns false when the run no longer exists', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);

			expect(await repo.isCancellationRequested('run-x')).toBe(false);
		});
	});

	describe('markAllIncompleteAsError', () => {
		it('flips new/running runs to error and clears the running instance', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 3, generatedMaps: [], raw: [] });

			await repo.markAllIncompleteAsError();

			const callArgs = entityManager.update.mock.calls[0];
			// [1] is the status criteria, [2] the patch applied to matching rows.
			expect(callArgs?.[2]).toMatchObject({
				status: 'error',
				errorCode: 'interrupted',
				runningInstanceId: null,
			});
		});
	});
});
