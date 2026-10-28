import Bull from 'bull';
import { Redis } from 'ioredis';

import { JOB_TYPE_NAME } from '../constants';
import type { Job, JobData, JobQueue } from '../scaling.types';

const REDIS_HOST = process.env.N8N_TEST_REDIS_HOST;
const REDIS_PORT = Number(process.env.N8N_TEST_REDIS_PORT);

const QUEUE_NAME = 'jobs';

/** Bull internals the tests drive directly. Bull's type declarations leave them out. */
type RawQueue = JobQueue & {
	getNextJob(): Promise<Job | null | undefined>;
	moveToActive(jobId?: string, fromKey?: string): Promise<Job | null>;
	moveUnlockedJobsToWait(): Promise<void>;
};

let caseCounter = 0;

describe.skipIf(!REDIS_HOST || !REDIS_PORT)('idle worker job claim (real Redis)', () => {
	let control: Redis;
	let prefix: string;
	let queues: RawQueue[];

	const key = (suffix: string) => `${prefix}:${QUEUE_NAME}:${suffix}`;

	const createQueue = (drainDelaySeconds = 1) => {
		const queue = new Bull<JobData>(QUEUE_NAME, {
			prefix,
			redis: { host: REDIS_HOST, port: REDIS_PORT },
			settings: { maxStalledCount: 0, drainDelay: drainDelaySeconds },
		}) as RawQueue;
		queues.push(queue);
		return queue;
	};

	const addJob = async (queue: JobQueue) =>
		await queue.add(JOB_TYPE_NAME, {
			executionId: 'exec-1',
			workflowId: 'wf-1',
			loadStaticData: false,
		} as JobData);

	/** Sweep N marks the `active` jobs, and sweep N+1 fails the marked ones without a lock. */
	const sweepTwice = async (queue: RawQueue) => {
		for (let i = 0; i < 2; i++) {
			await control.del(key('stalled-check'));
			await queue.moveUnlockedJobsToWait();
		}
	};

	beforeAll(() => {
		control = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
	});

	beforeEach(() => {
		prefix = `idle-claim-${process.pid}-${caseCounter++}`;
		queues = [];
	});

	afterEach(async () => {
		await Promise.all(queues.map(async (queue) => await queue.close()));
		const leftover = await control.keys(`${prefix}:*`);
		if (leftover.length > 0) await control.del(...leftover);
	});

	afterAll(async () => {
		await control.quit();
	});

	it('should return a job to the queue when a blocked worker has not claimed it yet', async () => {
		const blocked = createQueue();
		const producer = createQueue();
		const sweeper = createQueue();
		await Promise.all(queues.map(async (queue) => await queue.isReady()));
		// The worker's event loop is blocked after Redis answered its wait, so its claim never runs
		const claim = vi.spyOn(blocked, 'moveToActive').mockReturnValue(new Promise(() => {}));

		void blocked.getNextJob();
		const job = await addJob(producer);
		await vi.waitFor(() => expect(claim).toHaveBeenCalled());

		expect(await control.lrange(key('claiming'), 0, -1)).toEqual([String(job.id)]);
		expect(await control.lrange(key('active'), 0, -1)).toEqual([]);

		await sweepTwice(sweeper);
		expect(await job.getState()).toBe('waiting');

		const claimed = await createQueue().getNextJob();
		expect(claimed?.id).toBe(job.id);
		expect(await control.exists(key(`${job.id}:lock`))).toBe(1);
	});

	it('should remove a job that a blocked worker has not claimed yet', async () => {
		const blocked = createQueue();
		const producer = createQueue();
		await Promise.all(queues.map(async (queue) => await queue.isReady()));
		const claim = vi.spyOn(blocked, 'moveToActive').mockReturnValue(new Promise(() => {}));

		void blocked.getNextJob();
		const job = await addJob(producer);
		await vi.waitFor(() => expect(claim).toHaveBeenCalled());

		await job.remove();

		expect(await control.lrange(key('claiming'), 0, -1)).toEqual([]);
	});

	it('should list a job that a blocked worker has not claimed yet as waiting', async () => {
		const blocked = createQueue();
		const producer = createQueue();
		await Promise.all(queues.map(async (queue) => await queue.isReady()));
		const claim = vi.spyOn(blocked, 'moveToActive').mockReturnValue(new Promise(() => {}));

		void blocked.getNextJob();
		const job = await addJob(producer);
		await vi.waitFor(() => expect(claim).toHaveBeenCalled());
		expect(await control.lrange(key('wait'), 0, -1)).toEqual([]);
		expect(await control.lrange(key('active'), 0, -1)).toEqual([]);

		// Queue recovery reads these job lists, and marks executions without a job as crashed
		const listed = await producer.getJobs(['active', 'waiting']);

		expect(listed.map((listedJob) => listedJob?.id)).toEqual([job.id]);
	});

	describe('idle slots of one worker', () => {
		/** Starts idle workers and counts every claim attempt they make. */
		const startIdleWorkers = async (workerCount: number, concurrency: number, drainDelay = 1) => {
			const workers = Array.from({ length: workerCount }, () => createQueue(drainDelay));
			let claims = 0;
			let started = 0;
			for (const worker of workers) {
				const claim = worker.moveToActive.bind(worker);
				worker.moveToActive = async (jobId?: string, fromKey?: string) => {
					claims++;
					return await claim(jobId, fromKey);
				};
				void worker.process(JOB_TYPE_NAME, concurrency, async () => {
					started++;
					await new Promise((resolve) => setTimeout(resolve, 200));
				});
			}
			await Promise.all(queues.map(async (queue) => await queue.isReady()));
			// Let every idle slot reach its wait
			await new Promise((resolve) => setTimeout(resolve, 300));
			return {
				workers,
				claims: () => claims,
				started: () => started,
				reset: () => {
					claims = 0;
					started = 0;
				},
			};
		};

		it('should make one claim for a new job', async () => {
			const idle = await startIdleWorkers(3, 5);
			const producer = createQueue();
			idle.reset();

			await addJob(producer);
			await vi.waitFor(() => expect(idle.started()).toBe(1));
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(idle.claims()).toBe(1);
		});

		it('should give each new job to the worker that runs the fewest jobs', async () => {
			const workers = [createQueue(), createQueue()];
			const runs = [0, 0];
			// Jobs run until the test ends, so each worker keeps its load
			let finishJobs = () => {};
			const jobsFinished = new Promise<void>((resolve) => (finishJobs = resolve));
			workers.forEach((worker, index) => {
				void worker.process(JOB_TYPE_NAME, 5, async () => {
					runs[index]++;
					await jobsFinished;
				});
			});
			const producer = createQueue();
			await Promise.all(queues.map(async (queue) => await queue.isReady()));
			await new Promise((resolve) => setTimeout(resolve, 300));

			try {
				for (let i = 1; i <= 6; i++) {
					await addJob(producer);
					await vi.waitFor(() => expect(runs[0] + runs[1]).toBe(i));
				}

				expect(runs).toEqual([3, 3]);
			} finally {
				finishJobs();
			}
		});

		it('should start a burst of jobs on all idle slots', async () => {
			const idle = await startIdleWorkers(2, 5);
			const producer = createQueue();
			idle.reset();

			await Promise.all(Array.from({ length: 10 }, async () => await addJob(producer)));

			await vi.waitFor(() => expect(idle.started()).toBe(10), { timeout: 2_000 });
		});

		it('should stop waiting at once when the worker pauses', async () => {
			const {
				workers: [worker],
			} = await startIdleWorkers(1, 10, 5);
			const startedAt = Date.now();

			// Worker shutdown pauses the queue, then waits for every slot
			await worker.pause(true, true);
			await worker.whenCurrentJobsFinished();

			// Bull's disconnects take up to 0.5 s each. A slot that waits again after the
			// pause would hold the shutdown for the 5 s drain delay.
			expect(Date.now() - startedAt).toBeLessThan(2_000);
		});
	});
});
