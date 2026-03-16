import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { StepQueueService } from '../step-queue.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockDataSource(claimedSteps: unknown[] = []) {
	return {
		transaction: vi.fn(async (fn: (manager: unknown) => Promise<unknown>) => {
			const mockManager = {
				getRepository: vi.fn(() => ({
					createQueryBuilder: vi.fn(() => ({
						innerJoin: vi.fn().mockReturnThis(),
						setLock: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orWhere: vi.fn().mockReturnThis(),
						andWhere: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						limit: vi.fn().mockReturnThis(),
						getMany: vi.fn().mockResolvedValue(claimedSteps),
					})),
				})),
				createQueryBuilder: vi.fn(() => ({
					update: vi.fn().mockReturnThis(),
					set: vi.fn().mockReturnThis(),
					whereInIds: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue({}),
				})),
			};
			return fn(mockManager);
		}),
		getRepository: vi.fn(() => ({
			createQueryBuilder: vi.fn(() => ({
				update: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				andWhere: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue({}),
			})),
		})),
	};
}

function createMockStepProcessor() {
	return {
		processStep: vi.fn().mockResolvedValue(undefined),
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StepQueueService — adaptive polling', () => {
	let service: StepQueueService;
	let mockDs: ReturnType<typeof createMockDataSource>;
	let mockProcessor: ReturnType<typeof createMockStepProcessor>;

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		service?.stop();
		vi.useRealTimers();
	});

	it('starts with MIN_POLL_INTERVAL (10ms)', () => {
		mockDs = createMockDataSource();
		mockProcessor = createMockStepProcessor();
		service = new StepQueueService(mockDs as never, mockProcessor as never, 10);

		expect(service.getCurrentInterval()).toBe(10);
	});

	it('doubles interval on empty polls (exponential backoff)', async () => {
		mockDs = createMockDataSource([]);
		mockProcessor = createMockStepProcessor();
		service = new StepQueueService(mockDs as never, mockProcessor as never, 10);

		// Empty poll should double the interval
		await service.poll();
		expect(service.getCurrentInterval()).toBe(20);

		await service.poll();
		expect(service.getCurrentInterval()).toBe(40);

		await service.poll();
		expect(service.getCurrentInterval()).toBe(80);
	});

	it('caps interval at MAX_POLL_INTERVAL (1000ms)', async () => {
		mockDs = createMockDataSource([]);
		mockProcessor = createMockStepProcessor();
		service = new StepQueueService(mockDs as never, mockProcessor as never, 10);

		// Poll enough times to exceed 1000ms
		for (let i = 0; i < 20; i++) {
			await service.poll();
		}

		expect(service.getCurrentInterval()).toBe(1000);
	});

	it('resets to MIN_POLL_INTERVAL when work is found', async () => {
		// Start with empty polls to increase interval
		mockDs = createMockDataSource([]);
		mockProcessor = createMockStepProcessor();
		service = new StepQueueService(mockDs as never, mockProcessor as never, 10);

		await service.poll();
		await service.poll();
		await service.poll();
		expect(service.getCurrentInterval()).toBe(80);

		// Now return some work
		const mockStep = { id: 'step-1', executionId: 'exec-1' };
		mockDs.transaction.mockImplementation(async (fn: (manager: unknown) => Promise<unknown>) => {
			const mockManager = {
				getRepository: vi.fn(() => ({
					createQueryBuilder: vi.fn(() => ({
						innerJoin: vi.fn().mockReturnThis(),
						setLock: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orWhere: vi.fn().mockReturnThis(),
						andWhere: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						limit: vi.fn().mockReturnThis(),
						getMany: vi.fn().mockResolvedValue([mockStep]),
					})),
				})),
				createQueryBuilder: vi.fn(() => ({
					update: vi.fn().mockReturnThis(),
					set: vi.fn().mockReturnThis(),
					whereInIds: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue({}),
				})),
			};
			return fn(mockManager);
		});

		await service.poll();
		expect(service.getCurrentInterval()).toBe(10);
	});

	it('wake() resets interval to MIN_POLL_INTERVAL', async () => {
		mockDs = createMockDataSource([]);
		mockProcessor = createMockStepProcessor();
		service = new StepQueueService(mockDs as never, mockProcessor as never, 10);

		// Backoff
		await service.poll();
		await service.poll();
		expect(service.getCurrentInterval()).toBe(40);

		// Wake
		service.wake();
		expect(service.getCurrentInterval()).toBe(10);
	});

	it('start() uses setTimeout, not setInterval', () => {
		mockDs = createMockDataSource([]);
		mockProcessor = createMockStepProcessor();
		service = new StepQueueService(mockDs as never, mockProcessor as never, 10);

		service.start();
		expect(service.isRunning()).toBe(true);

		service.stop();
		expect(service.isRunning()).toBe(false);
	});
});
