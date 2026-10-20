import Bull from 'bull';
import { Redis } from 'ioredis';

import { JOB_TYPE_NAME } from '../constants';
import type { Job, JobData, JobQueue } from '../scaling.types';

const REDIS_HOST = process.env.N8N_TEST_REDIS_HOST;
const REDIS_PORT = Number(process.env.N8N_TEST_REDIS_PORT);

const QUEUE_NAME = 'jobs';

/** Bull internals the tests drive directly. Bull's type declarations leave them out. */
type RawQueue = JobQueue & {
	bclient: Redis;
	getNextJob(): Promise<Job | null | undefined>;
	moveToActive(jobId?: string): Promise<Job | null>;
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

	it('should leave a job in the queue while a blocked worker has not claimed it yet', async () => {
		const blocked = createQueue();
		const producer = createQueue();
		const sweeper = createQueue();
		await Promise.all(queues.map(async (queue) => await queue.isReady()));
		// The worker's event loop is blocked after Redis answered its wait, so its claim never runs
		const claim = vi.spyOn(blocked, 'moveToActive').mockReturnValue(new Promise(() => {}));

		void blocked.getNextJob();
		const job = await addJob(producer);
		await vi.waitFor(() => expect(claim).toHaveBeenCalled());

		expect(await control.lrange(key('wait'), 0, -1)).toEqual([String(job.id)]);
		expect(await control.lrange(key('active'), 0, -1)).toEqual([]);

		await sweepTwice(sweeper);
		expect(await job.getState()).toBe('waiting');

		const claimed = await createQueue().getNextJob();
		expect(claimed?.id).toBe(job.id);
		expect(await control.exists(key(`${job.id}:lock`))).toBe(1);
	});

	it('should fall back to BRPOPLPUSH when Redis has no BLMOVE', async () => {
		const worker = createQueue();
		const producer = createQueue();
		await Promise.all(queues.map(async (queue) => await queue.isReady()));
		const blmove = vi
			.spyOn(worker.bclient, 'blmove')
			.mockRejectedValue(new Error("ERR unknown command 'blmove'"));
		const job = await addJob(producer);

		const claimed = await worker.getNextJob();
		expect(claimed?.id).toBe(job.id);
		expect(await job.getState()).toBe('active');

		await addJob(producer);
		await worker.getNextJob();
		expect(blmove).toHaveBeenCalledTimes(1);
	});

	describe('idle slots of one worker', () => {
		/** Starts idle workers and counts every claim attempt they make. */
		const startIdleWorkers = async (workerCount: number, concurrency: number, drainDelay = 1) => {
			const workers = Array.from({ length: workerCount }, () => createQueue(drainDelay));
			let claims = 0;
			let started = 0;
			for (const worker of workers) {
				const claim = worker.moveToActive.bind(worker);
				worker.moveToActive = async (jobId?: string) => {
					claims++;
					return await claim(jobId);
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

		it('should make one claim in each idle worker for a new job', async () => {
			const idle = await startIdleWorkers(3, 5);
			const producer = createQueue();
			idle.reset();

			await addJob(producer);
			await vi.waitFor(() => expect(idle.started()).toBe(1));
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(idle.claims()).toBe(3);
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
