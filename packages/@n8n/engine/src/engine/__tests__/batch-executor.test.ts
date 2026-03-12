import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BatchExecutorService } from '../batch-executor.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockDataSource() {
	const stored: Record<string, unknown> = {};

	const mockQueryBuilder = {
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockImplementation((data: Record<string, unknown>) => {
			Object.assign(stored, data);
			return mockQueryBuilder;
		}),
		where: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		into: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		orIgnore: vi.fn().mockReturnThis(),
		execute: vi.fn().mockResolvedValue({ raw: [] }),
	};

	const mockRepo = {
		createQueryBuilder: vi.fn(() => mockQueryBuilder),
		findOneByOrFail: vi.fn(),
	};

	return {
		dataSource: {
			getRepository: vi.fn(() => mockRepo),
			query: vi.fn().mockResolvedValue(undefined),
		} as unknown as Parameters<
			typeof BatchExecutorService extends new (
				...args: infer P
			) => unknown
				? (...args: P) => void
				: never
		>[0],
		mockRepo,
		mockQueryBuilder,
		stored,
	};
}

function createMockEventBus() {
	return {
		emit: vi.fn(),
		on: vi.fn(),
	};
}

function createMockGraph() {
	return {
		getBatchChildStepId: vi.fn((parentId: string, index: number) => `${parentId}_child_${index}`),
	};
}

function createParentStep(overrides: Record<string, unknown> = {}) {
	return {
		id: 'parent-step-exec-1',
		executionId: 'exec-1',
		stepId: 'batch-step-1',
		status: 'running',
		metadata: null,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BatchExecutorService', () => {
	let service: BatchExecutorService;
	let mockDs: ReturnType<typeof createMockDataSource>;
	let mockEventBus: ReturnType<typeof createMockEventBus>;
	let mockGraph: ReturnType<typeof createMockGraph>;

	beforeEach(() => {
		mockDs = createMockDataSource();
		mockEventBus = createMockEventBus();
		mockGraph = createMockGraph();
		service = new BatchExecutorService(mockDs.dataSource as never, mockEventBus as never);
	});

	describe('processBatch', () => {
		it('completes parent immediately for empty items', async () => {
			const parent = createParentStep();

			await service.processBatch(parent as never, [], mockGraph as never);

			// Should complete parent with empty results
			expect(mockEventBus.emit).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'step:completed',
					executionId: 'exec-1',
					stepId: 'batch-step-1',
					output: [],
				}),
			);
		});

		it('creates child step executions for each item', async () => {
			const parent = createParentStep();
			const items = ['a', 'b', 'c'];

			await service.processBatch(parent as never, items, mockGraph as never);

			// Should call insert for each item (3 child steps)
			// Plus one update for parent metadata
			const insertCalls = mockDs.mockQueryBuilder.values.mock.calls;
			expect(insertCalls).toHaveLength(3);

			// Verify child step IDs
			expect(mockGraph.getBatchChildStepId).toHaveBeenCalledWith('batch-step-1', 0);
			expect(mockGraph.getBatchChildStepId).toHaveBeenCalledWith('batch-step-1', 1);
			expect(mockGraph.getBatchChildStepId).toHaveBeenCalledWith('batch-step-1', 2);
		});

		it('sets parent to waiting status with batch metadata', async () => {
			const parent = createParentStep();

			await service.processBatch(parent as never, [1, 2], mockGraph as never);

			// First set call should be the metadata update
			const setCalls = mockDs.mockQueryBuilder.set.mock.calls;
			const metadataUpdate = setCalls[0][0] as Record<string, unknown>;
			expect(metadataUpdate.status).toBe('waiting');
			expect(metadataUpdate.metadata).toBeDefined();
		});
	});

	describe('handleChildCompletion', () => {
		it('returns incomplete when not all children are done', async () => {
			// After atomic SQL update, re-read returns updated count (1 of 3)
			mockDs.mockRepo.findOneByOrFail.mockResolvedValue({
				id: 'parent-step-exec-1',
				executionId: 'exec-1',
				stepId: 'batch-step-1',
				metadata: {
					itemCount: 3,
					onItemFailure: 'continue',
					completedCount: 1,
					failedCount: 0,
					results: [{ status: 'fulfilled', value: 'result-0' }, null, null],
				},
			});

			const result = await service.handleChildCompletion('parent-step-exec-1', 0, {
				status: 'fulfilled',
				value: 'result-0',
			});

			expect(result.complete).toBe(false);
		});

		it('completes parent when all children succeed', async () => {
			// After atomic SQL update of child 1, re-read shows 2/2 complete
			mockDs.mockRepo.findOneByOrFail.mockResolvedValue({
				id: 'parent-step-exec-1',
				executionId: 'exec-1',
				stepId: 'batch-step-1',
				metadata: {
					itemCount: 2,
					onItemFailure: 'continue',
					completedCount: 2,
					failedCount: 0,
					results: [
						{ status: 'fulfilled', value: 'r0' },
						{ status: 'fulfilled', value: 'r1' },
					],
				},
			});

			const result = await service.handleChildCompletion('parent-step-exec-1', 1, {
				status: 'fulfilled',
				value: 'r1',
			});

			expect(result.complete).toBe(true);
			expect(mockEventBus.emit).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'step:completed',
					stepId: 'batch-step-1',
				}),
			);
		});

		it('fail-fast: fails parent on first child failure', async () => {
			// After atomic SQL update, re-read shows 1 completed, 1 failed
			mockDs.mockRepo.findOneByOrFail.mockResolvedValue({
				id: 'parent-step-exec-1',
				executionId: 'exec-1',
				stepId: 'batch-step-1',
				metadata: {
					itemCount: 3,
					onItemFailure: 'fail-fast',
					completedCount: 1,
					failedCount: 1,
					results: [{ status: 'rejected', reason: { message: 'boom' } }, null, null],
				},
			});

			const result = await service.handleChildCompletion('parent-step-exec-1', 0, {
				status: 'rejected',
				reason: new Error('boom'),
			});

			expect(result.complete).toBe(true);
			expect(mockEventBus.emit).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'step:failed',
					stepId: 'batch-step-1',
				}),
			);
		});

		it('continue: collects failures and completes', async () => {
			// After atomic SQL update of child 1, re-read shows 2/2 complete (1 failed)
			mockDs.mockRepo.findOneByOrFail.mockResolvedValue({
				id: 'parent-step-exec-1',
				executionId: 'exec-1',
				stepId: 'batch-step-1',
				metadata: {
					itemCount: 2,
					onItemFailure: 'continue',
					completedCount: 2,
					failedCount: 1,
					results: [
						{ status: 'rejected', reason: { message: 'err' } },
						{ status: 'fulfilled', value: 'ok' },
					],
				},
			});

			const result = await service.handleChildCompletion('parent-step-exec-1', 1, {
				status: 'fulfilled',
				value: 'ok',
			});

			expect(result.complete).toBe(true);
			// Parent should complete (not fail) even with a failed item
			expect(mockEventBus.emit).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'step:completed',
				}),
			);
		});

		it('abort-remaining: marks unprocessed items as rejected', async () => {
			// After atomic SQL update, re-read shows 1 completed, 1 failed
			mockDs.mockRepo.findOneByOrFail.mockResolvedValue({
				id: 'parent-step-exec-1',
				executionId: 'exec-1',
				stepId: 'batch-step-1',
				metadata: {
					itemCount: 3,
					onItemFailure: 'abort-remaining',
					completedCount: 1,
					failedCount: 1,
					results: [{ status: 'rejected', reason: { message: 'fail' } }, null, null],
				},
			});

			const result = await service.handleChildCompletion('parent-step-exec-1', 0, {
				status: 'rejected',
				reason: new Error('fail'),
			});

			expect(result.complete).toBe(true);
			expect(result.results).toBeDefined();

			// Item 0 should be rejected (the original failure)
			expect(result.results![0].status).toBe('rejected');
			// Items 1 and 2 should be rejected with abort message
			expect(result.results![1].status).toBe('rejected');
			expect(result.results![1].reason?.message).toContain('Aborted');
			expect(result.results![2].status).toBe('rejected');
			expect(result.results![2].reason?.message).toContain('Aborted');
		});
	});
});
