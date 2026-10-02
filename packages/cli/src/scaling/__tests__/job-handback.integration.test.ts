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

	const addJob = async (queue: JobQueue, name: string, priority: number) =>
		await queue.add(
			JOB_TYPE_NAME,
			{ executionId: `exec-${name}`, workflowId: `wf-${name}`, loadStaticData: false } as JobData,
			{ priority },
		);

	const holdNextJob = async (queue: JobQueue) => {
		let release: () => void = () => {};
		const released = new Promise<void>((resolve) => (release = resolve));
		let markStarted: (activeJob: Job) => void = () => {};
		const started = new Promise<Job>((resolve) => (markStarted = resolve));
		const failed = once(queue, 'failed') as Promise<[Job, Error]>;

		void queue.process(JOB_TYPE_NAME, 1, async (activeJob: Job) => {
			await queue.pause(true, true);
			markStarted(activeJob);
			await released;
			await handBackJob(activeJob);
		});

		const heldJob = await started;
		const handBack = async () => {
			release();
			const [handedBackJob] = await failed;
			return handedBackJob;
		};
		return { heldJob, handBack };
	};

	const runOrder = async (queue: JobQueue, count: number) => {
		const ran: JobId[] = [];
		await new Promise<void>((resolve) => {
			void queue.process(JOB_TYPE_NAME, 1, async (activeJob: Job) => {
				ran.push(activeJob.id);
				if (ran.length === count) resolve();
			});
		});
		return ran;
	};

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
			await handBackJob(activeJob);
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

	it('returns the job to the wait list before the current jobs of a paused worker finish', async () => {
		const producer = createQueue();

		const job = await producer.add(
			JOB_TYPE_NAME,
			{ executionId: 'exec-3', workflowId: 'wf-3', loadStaticData: false } as JobData,
			{ priority: 50 },
		);

		const workerA = createQueue();

		let release: () => void = () => {};
		const released = new Promise<void>((resolve) => (release = resolve));
		let markStarted: (activeJob: Job) => void = () => {};
		const started = new Promise<Job>((resolve) => (markStarted = resolve));

		void workerA.process(JOB_TYPE_NAME, 1, async (activeJob: Job) => {
			markStarted(activeJob);
			await released;
			await handBackJob(activeJob);
		});

		const activeJob = await started;

		expect(await (await producer.getJob(job.id))?.getState()).toBe('active');

		await workerA.pause(true, true);
		const currentJobsFinished = workerA.whenCurrentJobsFinished();

		release();
		await currentJobsFinished;

		expect(activeJob.id).toBe(job.id);
		const waiting = await producer.getWaiting();
		expect(waiting.map((waitingJob) => waitingJob.id)).toContain(job.id);
		expect(await (await producer.getJob(job.id))?.getState()).toBe('waiting');
		expect(await control.exists(activeJob.lockKey())).toBe(0);
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
			await handBackJob(activeJob);
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

	it('runs a handed-back job before jobs of its priority that arrived while it was active', async () => {
		const producer = createQueue();

		const globallyFailed: JobId[] = [];
		const failedRegistered = subscribe(producer, 'global:failed');
		producer.on('global:failed', (jobId: JobId) => globallyFailed.push(jobId));
		await failedRegistered;

		const held = await addJob(producer, 'held', 100);

		const workerA = createQueue();
		const { heldJob, handBack } = await holdNextJob(workerA);
		expect(heldJob.id).toBe(held.id);

		const behind1 = await addJob(producer, 'behind-1', 100);
		const behind2 = await addJob(producer, 'behind-2', 100);
		const urgent = await addJob(producer, 'urgent', 50);

		await handBack();

		const workerB = createQueue();
		const ran = await runOrder(workerB, 4);

		expect(ran).toEqual([urgent.id, held.id, behind1.id, behind2.id]);
		expect(globallyFailed).not.toContain(held.id);
	});

	it('runs a later job of a higher priority before a handed-back job', async () => {
		const producer = createQueue();

		const held = await addJob(producer, 'held', 100);

		const workerA = createQueue();
		const { heldJob, handBack } = await holdNextJob(workerA);
		expect(heldJob.id).toBe(held.id);

		const behind = await addJob(producer, 'behind', 100);

		await handBack();

		const later = await addJob(producer, 'later', 50);

		const workerB = createQueue();
		const ran = await runOrder(workerB, 3);

		expect(ran).toEqual([later.id, held.id, behind.id]);
	});

	it('keeps the priority of a job handed back twice from drifting past the next band', async () => {
		const producer = createQueue();

		const held = await addJob(producer, 'held', 100);

		const workerA1 = createQueue();
		const first = await holdNextJob(workerA1);
		expect(first.heldJob.id).toBe(held.id);
		await first.handBack();

		const workerA2 = createQueue();
		const second = await holdNextJob(workerA2);
		expect(second.heldJob.id).toBe(held.id);

		const behind = await addJob(producer, 'behind', 100);

		await second.handBack();

		const next = await addJob(producer, 'next', 99);

		const workerB = createQueue();
		const ran = await runOrder(workerB, 3);

		expect(ran).toEqual([next.id, held.id, behind.id]);
	});

	it('does not write a fractional priority when the stored priority cannot represent one', async () => {
		const producer = createQueue();

		const priority = 2 ** 52;
		const held = await addJob(producer, 'held', priority);

		const workerA = createQueue();
		const { heldJob, handBack } = await holdNextJob(workerA);
		expect(heldJob.id).toBe(held.id);

		await handBack();

		const storedPriority = await control.hget(producer.toKey(String(held.id)), 'priority');
		expect(Number(storedPriority)).toBe(priority);
	});
});
