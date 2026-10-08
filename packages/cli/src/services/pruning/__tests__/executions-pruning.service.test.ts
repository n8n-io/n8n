import type { Logger } from '@n8n/backend-common';
import type { ExecutionRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { ErrorReporter } from 'n8n-core';

import type { ExecutionPersistence } from '@/executions/execution-persistence';

import { ExecutionsPruningService } from '../executions-pruning.service';

type SoftDeletedRef = Awaited<ReturnType<ExecutionRepository['findSoftDeletedExecutions']>>[number];

const BATCH_SIZE = 100;

describe('ExecutionsPruningService', () => {
	const makeService = () => {
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const errorReporter = mock<ErrorReporter>();
		const executionRepository = mock<ExecutionRepository>({ hardDeletionBatchSize: BATCH_SIZE });
		const executionPersistence = mock<ExecutionPersistence>();
		const service = new ExecutionsPruningService(
			logger,
			errorReporter,
			executionRepository,
			executionPersistence,
		);
		return { service, logger, errorReporter, executionRepository, executionPersistence };
	};

	const batchOf = (size: number): SoftDeletedRef[] =>
		Array.from({ length: size }, (_, i) => ({
			executionId: `exec-${i}`,
			workflowId: 'wf-1',
			storedAt: 'db' as const,
		}));

	const singleCalls = (executionPersistence: ExecutionPersistence) =>
		vi
			.mocked(executionPersistence.hardDelete)
			.mock.calls.filter(([target]) => !Array.isArray(target));

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

		it('should not delete a batch when the signal aborts during the select', async () => {
			const { service, executionRepository, executionPersistence } = makeService();
			const controller = new AbortController();
			executionRepository.findSoftDeletedExecutions.mockImplementation(async () => {
				controller.abort();
				return batchOf(BATCH_SIZE);
			});

			await service.hardDelete(controller.signal);

			expect(executionPersistence.hardDelete).not.toHaveBeenCalled();
		});

		it('should delete one by one and report the rows that fail when a batch fails', async () => {
			const { service, logger, errorReporter, executionRepository, executionPersistence } =
				makeService();
			const batch = batchOf(BATCH_SIZE);
			const badRef = batch[42];
			const badRowError = new Error('object locked');
			executionRepository.findSoftDeletedExecutions
				.mockResolvedValueOnce(batch)
				.mockResolvedValueOnce([]);
			executionPersistence.hardDelete.mockImplementation(async (target) => {
				const targets = Array.isArray(target) ? target : [target];
				if (targets.includes(badRef)) throw badRowError;
			});

			const run = service.hardDelete(new AbortController().signal);
			await vi.runAllTimersAsync();
			await run;

			expect(singleCalls(executionPersistence)).toEqual(batch.map((ref) => [ref]));
			expect(errorReporter.error).toHaveBeenCalledTimes(1);
			expect(errorReporter.error).toHaveBeenCalledWith(badRowError, {
				extra: { executionId: badRef.executionId },
				shouldBeLogged: false,
				shouldIsolate: true,
			});
			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith(expect.any(String), {
				executionIds: [badRef.executionId],
			});
		});

		it('should stop the single deletes when the signal aborts', async () => {
			const { service, executionRepository, executionPersistence } = makeService();
			const batch = batchOf(BATCH_SIZE);
			const controller = new AbortController();
			executionRepository.findSoftDeletedExecutions.mockResolvedValue(batch);
			executionPersistence.hardDelete
				.mockRejectedValueOnce(new Error('blob store down'))
				.mockImplementation(async () => controller.abort());

			await service.hardDelete(controller.signal);

			expect(singleCalls(executionPersistence)).toEqual([[batch[0]]]);
		});

		it('should reject when a batch fails and no single delete succeeds', async () => {
			const { service, logger, errorReporter, executionRepository, executionPersistence } =
				makeService();
			const batchError = new Error('blob store down');
			executionRepository.findSoftDeletedExecutions.mockResolvedValue(batchOf(BATCH_SIZE));
			executionPersistence.hardDelete.mockRejectedValue(batchError);

			await expect(service.hardDelete(new AbortController().signal)).rejects.toBe(batchError);

			expect(executionRepository.findSoftDeletedExecutions).toHaveBeenCalledTimes(1);
			expect(executionPersistence.hardDelete).toHaveBeenCalledTimes(1 + BATCH_SIZE);
			expect(errorReporter.error).toHaveBeenCalledTimes(BATCH_SIZE);
			expect(logger.error).toHaveBeenCalledTimes(1);
		});
	});
});
