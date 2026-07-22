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
});
