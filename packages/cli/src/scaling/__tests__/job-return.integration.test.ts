import Bull from 'bull';
import { Redis } from 'ioredis';
import { once } from 'node:events';

import { JOB_TYPE_NAME } from '../constants';
import { getLockToken, returnJobToQueue, returnUnstartedJobsToQueue } from '../job-return';
import type { Job, JobData, JobId, JobQueue } from '../scaling.types';

const REDIS_HOST = process.env.N8N_TEST_REDIS_HOST;
const REDIS_PORT = Number(process.env.N8N_TEST_REDIS_PORT);

const PREFIX = `job-return-${process.pid}-${Date.now()}`;
const QUEUE_NAME = 'jobs';

describe.skipIf(!REDIS_HOST || !REDIS_PORT)('returnJobToQueue (real Redis)', () => {
	let control: Redis;
	let queues: JobQueue[];

	const createQueue = (settings: Bull.AdvancedSettings = {}): JobQueue => {
		const queue: JobQueue = new Bull<JobData>(QUEUE_NAME, {
			prefix: PREFIX,
			redis: { host: REDIS_HOST, port: REDIS_PORT },
			settings: { maxStalledCount: 0, ...settings },
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
			await returnJobToQueue(activeJob);
		});

		const heldJob = await started;
		const returnToQueue = async () => {
			release();
			const [returnedJob] = await failed;
			return returnedJob;
		};
		return { heldJob, returnToQueue };
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
			await returnJobToQueue(activeJob);
		});

		const [returnedJob] = await failedOnWorkerA;

		expect(returnedJob.id).toBe(job.id);
		const waiting = await producer.getWaiting();
		expect(waiting.map((waitingJob) => waitingJob.id)).toContain(job.id);
		expect(await (await producer.getJob(job.id))?.getState()).toBe('waiting');
		expect(await control.exists(returnedJob.lockKey())).toBe(0);
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
			await returnJobToQueue(activeJob);
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

	it('fails the returned job once, without a retry, when the next worker throws', async () => {
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
			await returnJobToQueue(activeJob);
		});

		const [returnedJob] = await failedOnWorkerA;

		expect(returnedJob.id).toBe(job.id);
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

	describe('returnUnstartedJobsToQueue', () => {
		const addJob = async (queue: JobQueue, executionId: string, priority = 50) =>
			await queue.add(
				JOB_TYPE_NAME,
				{ executionId, workflowId: 'wf-sweep', loadStaticData: false } as JobData,
				{ priority },
			);

		const lockTokenOf = (queue: JobQueue) => {
			const token = getLockToken(queue);
			if (typeof token !== 'string') throw new Error('Queue has no lock token');
			return token;
		};

		const stateOf = async (queue: JobQueue, jobId: JobId) =>
			await (await queue.getJob(jobId))?.getState();

		const attemptsMadeOf = async (jobId: JobId) =>
			await control.hget(`${PREFIX}:${QUEUE_NAME}:${jobId}`, 'attemptsMade');

		const fetchNextJobOnCompletion = async (worker: JobQueue, expectedJobId: JobId) => {
			const first = await worker.getNextJob();
			expect(first?.id).toBe(expectedJobId);
			await first?.moveToCompleted('x');
		};

		it('leaves a job fetched by a completion to fail as stalled when nothing hands it back', async () => {
			const producer = createQueue();
			const job1 = await addJob(producer, 'exec-c1');
			const job2 = await addJob(producer, 'exec-c2');

			const worker = createQueue({ lockDuration: 500 });
			await fetchNextJobOnCompletion(worker, job1.id);

			expect(await stateOf(producer, job2.id)).toBe('active');
			expect(await control.get(job2.lockKey())).toBe(Reflect.get(worker, 'token'));

			const stallChecker = createQueue({ stalledInterval: 200 });
			const failedOnStallChecker = new Promise<Job>((resolve) => {
				stallChecker.on('failed', (failedJob: Job) => {
					if (failedJob.id === job2.id) resolve(failedJob);
				});
			});
			void stallChecker.process(JOB_TYPE_NAME, 1, async () => {});

			await failedOnStallChecker;

			expect(await stateOf(producer, job2.id)).toBe('failed');
			expect((await producer.getJob(job2.id))?.failedReason).toMatch(/stalled/);
		});

		it('returns a job fetched by a completion to the wait list so another worker completes it', async () => {
			const producer = createQueue();

			const globallyFailed: JobId[] = [];
			const failedRegistered = subscribe(producer, 'global:failed');
			producer.on('global:failed', (jobId: JobId) => globallyFailed.push(jobId));
			const completedRegistered = subscribe(producer, 'global:completed');
			const job2Completed = new Promise<JobId>((resolve) => {
				producer.on('global:completed', (jobId: JobId) => {
					if (String(jobId) === String(job2.id)) resolve(jobId);
				});
			});
			await Promise.all([failedRegistered, completedRegistered]);

			const job1 = await addJob(producer, 'exec-c1');
			const job2 = await addJob(producer, 'exec-c2');

			const worker = createQueue();
			await fetchNextJobOnCompletion(worker, job1.id);

			const returned = await returnUnstartedJobsToQueue(worker, lockTokenOf(worker), () => false);

			expect(returned).toEqual([String(job2.id)]);
			expect(await stateOf(producer, job2.id)).toBe('waiting');
			expect(await control.exists(job2.lockKey())).toBe(0);
			expect(globallyFailed).not.toContain(job2.id);

			const nextWorker = createQueue();
			void nextWorker.process(JOB_TYPE_NAME, 1, async () => {});

			await expect(job2Completed).resolves.toBe(job2.id);
			expect(globallyFailed).not.toContain(job2.id);
		});

		it('returns several jobs fetched by completions to the front of their priority band in fetch order', async () => {
			const producer = createQueue();
			const completed1 = await addJob(producer, 'exec-done-1', 100);
			const held1 = await addJob(producer, 'exec-held-1', 100);
			const completed2 = await addJob(producer, 'exec-done-2', 100);
			const held2 = await addJob(producer, 'exec-held-2', 100);

			const worker = createQueue();
			await fetchNextJobOnCompletion(worker, completed1.id);
			await fetchNextJobOnCompletion(worker, completed2.id);

			expect(await stateOf(producer, held1.id)).toBe('active');
			expect(await stateOf(producer, held2.id)).toBe('active');

			const behind = await addJob(producer, 'exec-behind', 100);

			await returnUnstartedJobsToQueue(worker, lockTokenOf(worker), () => false);

			const nextWorker = createQueue();
			const ran = await runOrder(nextWorker, 3);

			expect(ran).toEqual([held1.id, held2.id, behind.id]);
		});

		it('leaves a job locked by another queue instance untouched', async () => {
			const producer = createQueue();
			const job = await addJob(producer, 'exec-other');

			const otherWorker = createQueue();
			const taken = await otherWorker.getNextJob();
			expect(taken?.id).toBe(job.id);
			const attemptsBefore = await attemptsMadeOf(job.id);

			const worker = createQueue();
			const returned = await returnUnstartedJobsToQueue(worker, lockTokenOf(worker), () => false);

			expect(returned).toEqual([]);
			expect(await stateOf(producer, job.id)).toBe('active');
			expect(await attemptsMadeOf(job.id)).toBe(attemptsBefore);
			expect(await control.get(job.lockKey())).toBe(lockTokenOf(otherWorker));
		});

		it('leaves an active job with no lock untouched', async () => {
			const producer = createQueue();
			const job = await addJob(producer, 'exec-unlocked');

			await control.rpoplpush(`${PREFIX}:${QUEUE_NAME}:wait`, `${PREFIX}:${QUEUE_NAME}:active`);
			const attemptsBefore = await attemptsMadeOf(job.id);

			const worker = createQueue();
			const returned = await returnUnstartedJobsToQueue(worker, lockTokenOf(worker), () => false);

			expect(returned).toEqual([]);
			expect(await stateOf(producer, job.id)).toBe('active');
			expect(await attemptsMadeOf(job.id)).toBe(attemptsBefore);
		});

		it('leaves a locked job that reached the handler untouched', async () => {
			const producer = createQueue();
			const job = await addJob(producer, 'exec-started');

			const worker = createQueue();
			const taken = await worker.getNextJob();
			expect(taken?.id).toBe(job.id);
			const attemptsBefore = await attemptsMadeOf(job.id);

			const returned = await returnUnstartedJobsToQueue(
				worker,
				lockTokenOf(worker),
				(jobId: string) => jobId === String(job.id),
			);

			expect(returned).toEqual([]);
			expect(await stateOf(producer, job.id)).toBe('active');
			expect(await attemptsMadeOf(job.id)).toBe(attemptsBefore);
			expect(await control.exists(job.lockKey())).toBe(1);
		});

		describe('Bull worker behaviour', () => {
			it('does not fetch the next waiting job when a job completes on a locally paused worker', async () => {
				const producer = createQueue();
				const job1 = await addJob(producer, 'exec-p1');
				const job2 = await addJob(producer, 'exec-p2');

				const worker = createQueue();
				const handled: JobId[] = [];
				const completed = once(worker, 'completed') as Promise<[Job]>;
				void worker.process(JOB_TYPE_NAME, 1, async (activeJob: Job) => {
					handled.push(activeJob.id);
					await worker.pause(true, true);
				});

				const [completedJob] = await completed;

				expect(completedJob.id).toBe(job1.id);
				expect(await stateOf(producer, job1.id)).toBe('completed');
				expect(await stateOf(producer, job2.id)).toBe('waiting');
				expect(await control.exists(job2.lockKey())).toBe(0);
				expect(handled).toEqual([job1.id]);
			});

			it('parks a job fetched by a completion when the worker pauses before processing it', async () => {
				const producer = createQueue();
				const job1 = await addJob(producer, 'exec-p1');
				const job2 = await addJob(producer, 'exec-p2');

				const worker = createQueue();
				const handled: JobId[] = [];
				const paused = once(worker, 'paused');
				worker.on('completed', () => {
					void worker.pause(true, true);
				});
				void worker.process(JOB_TYPE_NAME, 1, async (activeJob: Job) => {
					handled.push(activeJob.id);
				});

				await paused;

				expect(await stateOf(producer, job1.id)).toBe('completed');
				expect(await stateOf(producer, job2.id)).toBe('active');
				expect(await control.get(job2.lockKey())).toBe(lockTokenOf(worker));
				expect(handled).toEqual([job1.id]);
			});
		});
	});

	it('runs a returned job before jobs of its priority that arrived while it was active', async () => {
		const producer = createQueue();

		const globallyFailed: JobId[] = [];
		const failedRegistered = subscribe(producer, 'global:failed');
		producer.on('global:failed', (jobId: JobId) => globallyFailed.push(jobId));
		await failedRegistered;

		const held = await addJob(producer, 'held', 100);

		const workerA = createQueue();
		const { heldJob, returnToQueue } = await holdNextJob(workerA);
		expect(heldJob.id).toBe(held.id);

		const behind1 = await addJob(producer, 'behind-1', 100);
		const behind2 = await addJob(producer, 'behind-2', 100);
		const urgent = await addJob(producer, 'urgent', 50);

		await returnToQueue();

		const workerB = createQueue();
		const ran = await runOrder(workerB, 4);

		expect(ran).toEqual([urgent.id, held.id, behind1.id, behind2.id]);
		expect(globallyFailed).not.toContain(held.id);
	});

	it('runs a later job of a higher priority before a returned job', async () => {
		const producer = createQueue();

		const held = await addJob(producer, 'held', 100);

		const workerA = createQueue();
		const { heldJob, returnToQueue } = await holdNextJob(workerA);
		expect(heldJob.id).toBe(held.id);

		const behind = await addJob(producer, 'behind', 100);

		await returnToQueue();

		const later = await addJob(producer, 'later', 50);

		const workerB = createQueue();
		const ran = await runOrder(workerB, 3);

		expect(ran).toEqual([later.id, held.id, behind.id]);
	});

	it('keeps the priority of a job returned twice from drifting past the next priority', async () => {
		const producer = createQueue();

		const held = await addJob(producer, 'held', 100);

		const workerA1 = createQueue();
		const first = await holdNextJob(workerA1);
		expect(first.heldJob.id).toBe(held.id);
		await first.returnToQueue();

		const workerA2 = createQueue();
		const second = await holdNextJob(workerA2);
		expect(second.heldJob.id).toBe(held.id);

		const behind = await addJob(producer, 'behind', 100);

		await second.returnToQueue();

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
		const { heldJob, returnToQueue } = await holdNextJob(workerA);
		expect(heldJob.id).toBe(held.id);

		await returnToQueue();

		const storedPriority = await control.hget(producer.toKey(String(held.id)), 'priority');
		expect(Number(storedPriority)).toBe(priority);
	});
});
