import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import * as BullModule from 'bull';
import { mock } from 'vitest-mock-extended';

import { MaxStalledCountError } from '@/errors/max-stalled-count.error';
import { RedisClientService } from '@/services/redis-client.service';

import { JOB_TYPE_NAME, QUEUE_NAME } from '../../constants';
import type { JobData } from '../../scaling.types';
import { BullJobQueue } from '../bull-job-queue';

const mockBullQueue = {
	add: vi.fn(),
	process: vi.fn(),
	pause: vi.fn(),
	getJob: vi.fn(),
	getJobs: vi.fn(),
	getJobCounts: vi.fn(),
	on: vi.fn(),
	client: { ping: vi.fn() },
};

vi.mock('bull', () => ({
	__esModule: true,
	// Source does `new BullQueue(...)`; Vitest constructs the implementation, and
	// arrows aren't constructable. Use a regular function.
	default: vi.fn(function () {
		return mockBullQueue;
	}),
}));

type QueueListener = (...args: unknown[]) => void;

/** Look up a listener registered on the mocked Bull queue via `queue.on`. */
const findListener = (event: string): QueueListener | undefined =>
	(mockBullQueue.on.mock.calls as Array<[string, QueueListener]>).find(([e]) => e === event)?.[1];

describe('BullJobQueue', () => {
	const Bull = vi.mocked(BullModule.default);

	const globalConfig = mockInstance(GlobalConfig, {
		queue: {
			bull: {
				prefix: 'bull',
				settings: {
					lockDuration: 30000,
					lockRenewTime: 15000,
					stalledInterval: 30000,
				},
			},
		},
		executions: {
			queueRetention: { keepLastCompleted: 0, keepLastFailed: 0 },
		},
	});

	const redisClientService = mockInstance(RedisClientService);

	const jobData = mock<JobData>({ executionId: '123', workflowId: 'abc' });

	let queue: BullJobQueue;

	beforeEach(async () => {
		vi.clearAllMocks();
		redisClientService.toValidPrefix.mockImplementation((prefix) => prefix);
		queue = new BullJobQueue(globalConfig);
		await queue.start();
	});

	describe('start', () => {
		it('creates the Bull queue with maxStalledCount forced to 0', () => {
			expect(Bull).toHaveBeenCalledWith(QUEUE_NAME, {
				prefix: 'bull',
				settings: { ...globalConfig.queue.bull.settings, maxStalledCount: 0 },
				createClient: expect.any(Function),
			});
		});

		it('is idempotent', async () => {
			await queue.start();
			expect(Bull).toHaveBeenCalledTimes(1);
		});

		it('creates Redis clients tagged with (bull)', () => {
			// Bull's constructor overloads make calls[0][1] resolve to the url string
			// variant; in test code a cast to the options shape is acceptable.
			const options = Bull.mock.calls[0][1] as
				| { createClient?: (type: string, config: object) => unknown }
				| undefined;
			options?.createClient?.('subscriber', {});
			expect(redisClientService.createClient).toHaveBeenCalledWith({ type: 'subscriber(bull)' });
		});
	});

	describe('enqueue', () => {
		it('adds the job with priority and retention options, returns string id', async () => {
			mockBullQueue.add.mockResolvedValue({ id: 7, data: jobData });

			const job = await queue.enqueue(jobData, { priority: 50 });

			expect(mockBullQueue.add).toHaveBeenCalledWith(JOB_TYPE_NAME, jobData, {
				priority: 50,
				removeOnComplete: 0,
				removeOnFail: 0,
			});
			expect(job.id).toBe('7');
			expect(job.data).toBe(jobData);
		});
	});

	describe('QueueJob.finished', () => {
		it('translates Bull stall failure into MaxStalledCountError', async () => {
			mockBullQueue.add.mockResolvedValue({
				id: 7,
				data: jobData,
				finished: vi.fn().mockRejectedValue(new Error('job stalled more than maxStalledCount')),
			});

			const job = await queue.enqueue(jobData, { priority: 100 });

			await expect(job.finished()).rejects.toBeInstanceOf(MaxStalledCountError);
		});

		it('rethrows non-stall failures unchanged', async () => {
			const failure = new Error('workflow blew up');
			mockBullQueue.add.mockResolvedValue({
				id: 7,
				data: jobData,
				finished: vi.fn().mockRejectedValue(failure),
			});

			const job = await queue.enqueue(jobData, { priority: 100 });

			await expect(job.finished()).rejects.toBe(failure);
		});
	});

	describe('QueueJob.sendMessage', () => {
		it('delegates to job.progress', async () => {
			const progress = vi.fn();
			mockBullQueue.add.mockResolvedValue({ id: 7, data: jobData, progress });

			const job = await queue.enqueue(jobData, { priority: 100 });
			await job.sendMessage({ kind: 'abort-job' });

			expect(progress).toHaveBeenCalledWith({ kind: 'abort-job' });
		});
	});

	describe('registerProcessor', () => {
		it('registers the handler under the job type with the given concurrency', async () => {
			const handler = vi.fn();
			queue.registerProcessor(10, handler);

			expect(mockBullQueue.process).toHaveBeenCalledWith(JOB_TYPE_NAME, 10, expect.any(Function));

			const bullHandler = mockBullQueue.process.mock.calls[0][2] as (job: unknown) => Promise<void>;
			await bullHandler({ id: 7, data: jobData });
			expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: '7', data: jobData }));
		});
	});

	describe('onMessage', () => {
		it('filters non-JobMessage progress values and normalizes jobId', () => {
			const handler = vi.fn();
			queue.onMessage(handler);

			const progressListener = findListener('global:progress');
			progressListener?.(7, 42); // numeric progress, not a JobMessage
			progressListener?.(7, { kind: 'abort-job' });

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith('7', { kind: 'abort-job' });
		});
	});

	describe('onError', () => {
		it('registers the handler for queue error events', () => {
			const handler = vi.fn();
			queue.onError(handler);

			const errorListener = findListener('error');
			const error = new Error('boom');
			errorListener?.(error);

			expect(handler).toHaveBeenCalledWith(error);
		});
	});

	describe('onJobOutcome', () => {
		it('maps global:completed and global:failed', () => {
			const handler = vi.fn();
			queue.onJobOutcome(handler);

			const completed = findListener('global:completed');
			const failed = findListener('global:failed');
			completed?.();
			failed?.();

			expect(handler).toHaveBeenNthCalledWith(1, 'completed');
			expect(handler).toHaveBeenNthCalledWith(2, 'failed');
		});
	});

	describe('getJob', () => {
		it('returns the wrapped job', async () => {
			mockBullQueue.getJob.mockResolvedValue({ id: 7, data: jobData });

			const job = await queue.getJob('7');

			expect(mockBullQueue.getJob).toHaveBeenCalledWith('7');
			expect(job).toEqual(expect.objectContaining({ id: '7', data: jobData }));
		});

		it('returns null for missing jobs', async () => {
			mockBullQueue.getJob.mockResolvedValue(null);

			expect(await queue.getJob('999')).toBeNull();
		});
	});

	describe('findJobsByStatus', () => {
		it('filters null entries', async () => {
			mockBullQueue.getJobs.mockResolvedValue([{ id: 1, data: jobData }, null]);

			const jobs = await queue.findJobsByStatus(['active', 'waiting']);

			expect(mockBullQueue.getJobs).toHaveBeenCalledWith(['active', 'waiting']);
			expect(jobs).toHaveLength(1);
			expect(jobs[0].id).toBe('1');
		});
	});

	describe('getPendingCounts', () => {
		it('returns active and waiting counts', async () => {
			mockBullQueue.getJobCounts.mockResolvedValue({
				active: 2,
				waiting: 3,
				completed: 9,
				failed: 1,
				delayed: 0,
			});

			expect(await queue.getPendingCounts()).toEqual({ active: 2, waiting: 3 });
		});
	});

	describe('pause', () => {
		it('pauses locally without waiting for active jobs', async () => {
			await queue.pause();

			expect(mockBullQueue.pause).toHaveBeenCalledWith(true, true);
		});
	});

	describe('ping', () => {
		it('pings the underlying client', async () => {
			await queue.ping();

			expect(mockBullQueue.client.ping).toHaveBeenCalled();
		});
	});
});
