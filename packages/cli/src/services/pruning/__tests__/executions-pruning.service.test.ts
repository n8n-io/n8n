import type { Logger } from '@n8n/backend-common';
import type { ExecutionRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';

import { ExecutionsPruningService } from '../executions-pruning.service';

type SoftDeletedRef = Awaited<ReturnType<ExecutionRepository['findSoftDeletedExecutions']>>[number];

const BATCH_SIZE = 100;

describe('ExecutionsPruningService', () => {
	const makeService = () => {
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const executionRepository = mock<ExecutionRepository>({ hardDeletionBatchSize: BATCH_SIZE });
		const executionPersistence = mock<ExecutionPersistence>();
		const service = new ExecutionsPruningService(logger, executionRepository, executionPersistence);
		return { service, executionRepository, executionPersistence };
	};

	const batchOf = (size: number): SoftDeletedRef[] =>
		Array.from({ length: size }, (_, i) => ({
			executionId: `exec-${i}`,
			workflowId: 'wf-1',
			storedAt: 'db' as const,
		}));

	describe('softDelete', () => {
		it('should soft-delete prunable executions', async () => {
			const { service, executionRepository } = makeService();
			executionRepository.softDeletePrunableExecutions.mockResolvedValue({
				affected: 3,
				raw: {},
				generatedMaps: [],
			});

			await service.softDelete();

			expect(executionRepository.softDeletePrunableExecutions).toHaveBeenCalledTimes(1);
		});
	});

	describe('hardDelete', () => {
		beforeEach(() => vi.useFakeTimers());
		afterEach(() => vi.useRealTimers());

		it('should delete batches until one comes back short', async () => {
			const { service, executionRepository, executionPersistence } = makeService();
			const batches = [batchOf(BATCH_SIZE), batchOf(BATCH_SIZE), batchOf(30)];
			for (const batch of batches) {
				executionRepository.findSoftDeletedExecutions.mockResolvedValueOnce(batch);
			}

			const run = service.hardDelete(new AbortController().signal);
			await vi.runAllTimersAsync();
			await run;

			expect(executionPersistence.hardDelete.mock.calls).toEqual(batches.map((batch) => [batch]));
		});

		it('should stop after an empty batch', async () => {
			const { service, executionRepository } = makeService();
			executionRepository.findSoftDeletedExecutions.mockResolvedValue([]);

			await service.hardDelete(new AbortController().signal);

			expect(executionRepository.findSoftDeletedExecutions).toHaveBeenCalledTimes(1);
		});

		it('should pause one second between full batches', async () => {
			const { service, executionRepository, executionPersistence } = makeService();
			executionRepository.findSoftDeletedExecutions
				.mockResolvedValueOnce(batchOf(BATCH_SIZE))
				.mockResolvedValueOnce(batchOf(BATCH_SIZE))
				.mockResolvedValueOnce([]);

			const run = service.hardDelete(new AbortController().signal);
			await vi.advanceTimersByTimeAsync(999);
			expect(executionPersistence.hardDelete).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(1);
			expect(executionPersistence.hardDelete).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(1000);
			await run;
		});

		it('should stop at the pause when the signal aborts', async () => {
			const { service, executionRepository, executionPersistence } = makeService();
			executionRepository.findSoftDeletedExecutions.mockResolvedValue(batchOf(BATCH_SIZE));
			const controller = new AbortController();

			const run = service.hardDelete(controller.signal);
			await vi.advanceTimersByTimeAsync(0);
			controller.abort();

			await expect(run).resolves.toBeUndefined();
			expect(executionPersistence.hardDelete).toHaveBeenCalledTimes(1);
		});

		it('should reject when a batch fails and select no further batch', async () => {
			const { service, executionRepository, executionPersistence } = makeService();
			executionRepository.findSoftDeletedExecutions.mockResolvedValue(batchOf(BATCH_SIZE));
			executionPersistence.hardDelete.mockRejectedValue(new Error('blob store down'));

			await expect(service.hardDelete(new AbortController().signal)).rejects.toThrow(
				'blob store down',
			);

			expect(executionRepository.findSoftDeletedExecutions).toHaveBeenCalledTimes(1);
		});
	});
});
