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

	const createQueue = () => {
		const queue = new Bull<JobData>(QUEUE_NAME, {
			prefix,
			redis: { host: REDIS_HOST, port: REDIS_PORT },
			settings: { maxStalledCount: 0, drainDelay: 1 },
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
});
