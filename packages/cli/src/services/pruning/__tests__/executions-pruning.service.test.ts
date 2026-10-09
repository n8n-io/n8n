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
		return { service, logger, executionRepository, executionPersistence };
	};

	const batchOf = (size: number, offset = 0): SoftDeletedRef[] =>
		Array.from({ length: size }, (_, i) => ({
			executionId: `exec-${offset + i}`,
			workflowId: 'wf-1',
			storedAt: 'db' as const,
		}));

	/** Serves the batches in order and records a copy of each select's excluded ids. */
	const selectsOf = (executionRepository: ExecutionRepository, batches: SoftDeletedRef[][]) => {
		const selects: string[][] = [];
		vi.mocked(executionRepository.findSoftDeletedExecutions).mockImplementation(
			async (excludedIds = []) => {
				selects.push([...excludedIds]);
				return batches[selects.length - 1] ?? [];
			},
		);
		return selects;
	};

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

		it('should delete one by one when a batch fails', async () => {
			const { service, executionRepository, executionPersistence } = makeService();
			const batch = batchOf(BATCH_SIZE);
			const badRef = batch[42];
			executionRepository.findSoftDeletedExecutions
				.mockResolvedValueOnce(batch)
				.mockResolvedValueOnce([]);
			executionPersistence.hardDelete.mockImplementation(async (target) => {
				const targets = Array.isArray(target) ? target : [target];
				if (targets.includes(badRef)) throw new Error('object locked');
			});

			const run = service.hardDelete(new AbortController().signal);
			await vi.runAllTimersAsync();
			await run;

			expect(singleCalls(executionPersistence)).toEqual(batch.map((ref) => [ref]));
		});

		it('should log the ids of every row that failed once per run', async () => {
			const { service, logger, executionRepository, executionPersistence } = makeService();
			const batches = [batchOf(BATCH_SIZE), batchOf(30, BATCH_SIZE)];
			const badRefs = [batches[0][42], batches[1][7]];
			selectsOf(executionRepository, batches);
			executionPersistence.hardDelete.mockImplementation(async (target) => {
				const targets = Array.isArray(target) ? target : [target];
				if (targets.some((ref) => badRefs.includes(ref))) throw new Error('object locked');
			});

			const run = service.hardDelete(new AbortController().signal);
			await vi.runAllTimersAsync();
			await run;

			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith(expect.any(String), {
				executionIds: badRefs.map((ref) => ref.executionId),
			});
		});

		it('should leave the rows that failed out of the next select', async () => {
			const { service, executionRepository, executionPersistence } = makeService();
			const batch = batchOf(BATCH_SIZE);
			const badRef = batch[42];
			const selects = selectsOf(executionRepository, [batch, []]);
			executionPersistence.hardDelete.mockImplementation(async (target) => {
				const targets = Array.isArray(target) ? target : [target];
				if (targets.includes(badRef)) throw new Error('object locked');
			});

			const run = service.hardDelete(new AbortController().signal);
			await vi.runAllTimersAsync();
			await run;

			expect(selects).toEqual([[], [badRef.executionId]]);
		});

		it('should give up after a batch size of failed rows', async () => {
			const { service, executionRepository, executionPersistence } = makeService();
			const batches = [
				batchOf(BATCH_SIZE),
				batchOf(BATCH_SIZE, BATCH_SIZE),
				batchOf(BATCH_SIZE, 2 * BATCH_SIZE),
			];
			const isBad = (ref: SoftDeletedRef) => Number(ref.executionId.slice(5)) % 2 === 0;
			const selects = selectsOf(executionRepository, batches);
			executionPersistence.hardDelete.mockImplementation(async (target) => {
				const targets = Array.isArray(target) ? target : [target];
				if (targets.some(isBad)) throw new Error('object locked');
			});

			const run = service.hardDelete(new AbortController().signal);
			await vi.runAllTimersAsync();
			await run;

			expect(selects).toEqual([[], batches[0].filter(isBad).map((ref) => ref.executionId)]);
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
			const { service, logger, executionRepository, executionPersistence } = makeService();
			const batchError = new Error('blob store down');
			executionRepository.findSoftDeletedExecutions.mockResolvedValue(batchOf(BATCH_SIZE));
			executionPersistence.hardDelete.mockRejectedValue(batchError);

			await expect(service.hardDelete(new AbortController().signal)).rejects.toBe(batchError);

			expect(executionRepository.findSoftDeletedExecutions).toHaveBeenCalledTimes(1);
			expect(executionPersistence.hardDelete).toHaveBeenCalledTimes(1 + BATCH_SIZE);
			expect(logger.error).not.toHaveBeenCalled();
		});
	});
});
