import Bull from 'bull';
import { Redis } from 'ioredis';
import { once } from 'node:events';

import { JOB_TYPE_NAME } from '../constants';
import { handBackJob } from '../job-handback';
import type { Job, JobData, JobId, JobQueue } from '../scaling.types';

const REDIS_HOST = process.env.N8N_TEST_REDIS_HOST;
const REDIS_PORT = Number(process.env.N8N_TEST_REDIS_PORT);

const PREFIX = `job-handback-${process.pid}-${Date.now()}`;
const QUEUE_NAME = 'jobs';

describe.skipIf(!REDIS_HOST || !REDIS_PORT)('handBackJob (real Redis)', () => {
	let control: Redis;
	let queues: JobQueue[];

	const createQueue = (): JobQueue => {
		const queue: JobQueue = new Bull<JobData>(QUEUE_NAME, {
			prefix: PREFIX,
			redis: { host: REDIS_HOST, port: REDIS_PORT },
			settings: { maxStalledCount: 0 },
		});
		queues.push(queue);
		return queue;
	};

	const subscribe = async (queue: JobQueue, event: 'global:failed' | 'global:completed') =>
		await once(queue, `registered:${event}`);

	beforeAll(() => {
		control = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
	});

	beforeEach(() => {
		queues = [];
	});

	afterEach(async () => {
		await Promise.all(queues.map(async (queue) => await queue.close()));
		const leftover = await control.keys(`${PREFIX}:*`);
		if (leftover.length > 0) await control.del(...leftover);
	});

	afterAll(async () => {
		await control.quit();
	});

	it('returns the job to the wait list so another worker completes it', async () => {
		const producer = createQueue();

		const globallyFailed: JobId[] = [];
		const failedRegistered = subscribe(producer, 'global:failed');
		producer.on('global:failed', (jobId: JobId) => globallyFailed.push(jobId));
		const completedRegistered = subscribe(producer, 'global:completed');
		const globallyCompleted = new Promise<JobId>((resolve) => {
			producer.on('global:completed', (jobId: JobId) => resolve(jobId));
		});
		await Promise.all([failedRegistered, completedRegistered]);

		const job = await producer.add(
			JOB_TYPE_NAME,
			{ executionId: 'exec-1', workflowId: 'wf-1', loadStaticData: false } as JobData,
			{ priority: 50 },
		);

		const workerA = createQueue();
		const failedOnWorkerA = once(workerA, 'failed') as Promise<[Job, Error]>;
		void workerA.process(JOB_TYPE_NAME, 1, async (activeJob: Job) => {
			await workerA.pause(true, true);
			handBackJob(activeJob);
		});

		const [handedBackJob] = await failedOnWorkerA;

		expect(handedBackJob.id).toBe(job.id);
		const waiting = await producer.getWaiting();
		expect(waiting.map((waitingJob) => waitingJob.id)).toContain(job.id);
		expect(await (await producer.getJob(job.id))?.getState()).toBe('waiting');
		expect(await control.exists(handedBackJob.lockKey())).toBe(0);
		expect(globallyFailed).not.toContain(job.id);

		const workerB = createQueue();
		void workerB.process(JOB_TYPE_NAME, 1, async () => {});

		await expect(globallyCompleted).resolves.toBe(job.id);
		expect(globallyFailed).not.toContain(job.id);
	});

	it('fails the handed-back job once, without a retry, when the next worker throws', async () => {
		const producer = createQueue();

		const globallyFailed: JobId[] = [];
		const failedRegistered = subscribe(producer, 'global:failed');
		const globallyFailedOnce = new Promise<JobId>((resolve) => {
			producer.on('global:failed', (jobId: JobId) => {
				globallyFailed.push(jobId);
				resolve(jobId);
			});
		});
		await failedRegistered;

		const job = await producer.add(
			JOB_TYPE_NAME,
			{ executionId: 'exec-2', workflowId: 'wf-2', loadStaticData: false } as JobData,
			{ priority: 50 },
		);

		const workerA = createQueue();
		const failedOnWorkerA = once(workerA, 'failed') as Promise<[Job, Error]>;
		void workerA.process(JOB_TYPE_NAME, 1, async (activeJob: Job) => {
			await workerA.pause(true, true);
			handBackJob(activeJob);
		});

		const [handedBackJob] = await failedOnWorkerA;

		expect(handedBackJob.id).toBe(job.id);
		expect(await (await producer.getJob(job.id))?.getState()).toBe('waiting');

		const workerC = createQueue();
		void workerC.process(JOB_TYPE_NAME, 1, async () => {
			throw new Error('execution failed');
		});

		await expect(globallyFailedOnce).resolves.toBe(job.id);

		expect(globallyFailed.filter((jobId) => jobId === job.id)).toHaveLength(1);
		expect(await (await producer.getJob(job.id))?.getState()).toBe('failed');
		const waiting = await producer.getWaiting();
		expect(waiting.map((waitingJob) => waitingJob.id)).not.toContain(job.id);
	});
});
