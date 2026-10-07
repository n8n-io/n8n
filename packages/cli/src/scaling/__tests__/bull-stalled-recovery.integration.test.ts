import type { EventService } from '@n8n/backend-services';
import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionRepository } from '@n8n/db';
import Bull from 'bull';
import type { Job, Queue } from 'bull';
import { Redis } from 'ioredis';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';

import { JobOutcomeTracker } from '../job-outcome-tracker';
import type { JobData } from '../scaling.types';

const REDIS_HOST = process.env.N8N_TEST_REDIS_HOST;
const REDIS_PORT = Number(process.env.N8N_TEST_REDIS_PORT);

const QUEUE_NAME = 'jobs';
const SETTINGS = { maxStalledCount: 0, stalledInterval: 60_000, lockDuration: 60_000 };
const STALL_FAILURE = 'job stalled more than allowable limit';

const jobData = (executionId: string): JobData => ({
	executionId,
	workflowId: 'workflow-1',
	loadStaticData: false,
});

/** Bull internals the tests drive directly. Bull's type declarations leave them out. */
type RawQueue = Queue<JobData> & {
	token: string;
	moveToActive(jobId?: string): Promise<Job<JobData> | null>;
	moveUnlockedJobsToWait(): Promise<void>;
};

let caseCounter = 0;

/**
 * Drives the patched Bull Lua scripts in `patches/bull@4.16.4.patch` through
 * real `Queue` instances. Worker A is the victim, worker B runs the stall sweep.
 * No `process()` handler runs unless a case registers one, so every state
 * transition is explicit.
 */
describe.skipIf(!REDIS_HOST || !REDIS_PORT)('Bull stalled-job recovery (real Redis)', () => {
	let redis: Redis;
	let prefix: string;
	let a: RawQueue;
	let b: RawQueue;

	const key = (suffix: string) => `${prefix}:${QUEUE_NAME}:${suffix}`;
	const lockKey = (jobId: string) => key(`${jobId}:lock`);
	const list = async (name: string) => await redis.lrange(key(name), 0, -1);
	const hasField = async (jobId: string, field: string) =>
		(await redis.hexists(key(jobId), field)) === 1;
	const stateOf = async (jobId: string) => await (await a.getJob(jobId))?.getState();

	const createQueue = () =>
		new Bull<JobData>(QUEUE_NAME, {
			prefix,
			redis: { host: REDIS_HOST, port: REDIS_PORT },
			settings: SETTINGS,
		}) as RawQueue;

	/** Models a worker whose `BRPOPLPUSH` completed but whose event loop has not run `moveToActive` yet. */
	const dequeueWithoutActivating = async () => await redis.rpoplpush(key('wait'), key('active'));

	const addAndDequeue = async (opts?: { priority?: number }) => {
		const job = await a.add(jobData('1'), opts);
		const jobId = String(job.id);
		expect(await dequeueWithoutActivating()).toBe(jobId);
		return jobId;
	};

	/** One real sweep. The script skips while its own `stalled-check` TTL key exists. */
	const sweep = async () => {
		await redis.del(key('stalled-check'));
		await b.moveUnlockedJobsToWait();
	};

	/** Sweep N marks `active` jobs; sweep N+1 handles the marked ones that lost their lock. */
	const sweepTwice = async () => {
		await sweep();
		await sweep();
	};

	/** Recovers the never-activated job in `active` and returns its fresh id. */
	const recover = async (oldId: string) => {
		await sweepTwice();
		const [newId] = await list('wait');
		expect(newId).toBeDefined();
		expect(newId).not.toBe(oldId);
		return newId;
	};

	beforeAll(() => {
		redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
	});

	beforeEach(async () => {
		prefix = `cat4776-${process.pid}-${caseCounter++}`;
		a = createQueue();
		b = createQueue();
		await Promise.all([a.isReady(), b.isReady()]);
	});

	afterEach(async () => {
		await Promise.all([a.close(), b.close()]);
		const keys = await redis.keys(`${prefix}:*`);
		if (keys.length > 0) await redis.del(keys);
	});

	afterAll(async () => {
		await redis.quit();
	});

	describe('stall sweep', () => {
		test('R5: never-activated job is returned to wait under a fresh id, not failed', async () => {
			const oldId = await addAndDequeue();

			const newId = await recover(oldId);

			expect(await list('active')).toEqual([]);
			expect(await redis.exists(key(oldId))).toBe(0);
			expect(await stateOf(newId)).toBe('waiting');
			expect(await redis.hget(key(newId), 'data')).toBe(JSON.stringify(jobData('1')));
			expect(await hasField(newId, 'stalledCounter')).toBe(false);
			expect(await hasField(newId, 'processedOn')).toBe(false);

			const picked = await b.getNextJob();
			expect(String(picked?.id)).toBe(newId);
			expect(await hasField(newId, 'processedOn')).toBe(true);
		});

		test('the fresh id keeps the priority score of the old id', async () => {
			const oldId = await addAndDequeue({ priority: 5 });
			expect(await redis.zscore(key('priority'), oldId)).toBe('5');

			const newId = await recover(oldId);

			expect(await redis.zscore(key('priority'), oldId)).toBeNull();
			expect(await redis.zscore(key('priority'), newId)).toBe('5');
		});

		test('repeated never-activated recovery leaves stalledCounter unset', async () => {
			let jobId = await addAndDequeue();

			for (let cycle = 0; cycle < 3; cycle++) {
				jobId = await recover(jobId);
				expect(await dequeueWithoutActivating()).toBe(jobId);
			}
			jobId = await recover(jobId);

			expect(await list('wait')).toEqual([jobId]);
			expect(await hasField(jobId, 'stalledCounter')).toBe(false);
		});

		test('R9: recovery on a globally paused queue lands in paused, not wait', async () => {
			await a.pause();
			const job = await a.add(jobData('1'));
			const oldId = String(job.id);
			expect(await redis.rpoplpush(key('paused'), key('active'))).toBe(oldId);

			await sweepTwice();

			const paused = await list('paused');
			expect(paused).toHaveLength(1);
			expect(paused[0]).not.toBe(oldId);
			expect(await list('wait')).toEqual([]);
			expect(await list('active')).toEqual([]);
		});

		test('an activated job that lost its lock still fails under maxStalledCount 0', async () => {
			const jobId = await addAndDequeue();
			expect(await b.moveToActive(jobId)).not.toBeNull();
			await redis.del(lockKey(jobId));

			await sweepTwice();

			expect(await stateOf(jobId)).toBe('failed');
			expect(await redis.hget(key(jobId), 'failedReason')).toBe(STALL_FAILURE);
		});
	});

	describe('explicit-id activation', () => {
		test('R1: the worker that dequeued the job activates it when no sweep ran', async () => {
			const jobId = await addAndDequeue();

			const activated = await a.moveToActive(jobId);

			expect(String(activated?.id)).toBe(jobId);
			expect(await redis.get(lockKey(jobId))).toBe(a.token);
			expect(await hasField(jobId, 'processedOn')).toBe(true);
			expect(await list('active')).toEqual([jobId]);
		});

		test('R2: stale activation of a recovered job returns nothing and changes no state', async () => {
			const oldId = await addAndDequeue();
			const newId = await recover(oldId);

			const stale = await a.moveToActive(oldId);

			expect(stale).toBeNull();
			expect(await redis.exists(lockKey(oldId))).toBe(0);
			expect(await redis.exists(key(oldId))).toBe(0);
			expect(await list('wait')).toEqual([newId]);
			expect(await list('active')).toEqual([]);
			expect(await redis.smembers(key('stalled'))).toEqual([]);

			const picked = await b.getNextJob();
			expect(String(picked?.id)).toBe(newId);
			await picked!.moveToCompleted('ok', false, true);
			expect(await stateOf(newId)).toBe('completed');
		});

		test('R3/R4: the stale worker never adopts the fresh id, whichever worker activates it', async () => {
			const oldId = await addAndDequeue();
			const newId = await recover(oldId);
			expect(await dequeueWithoutActivating()).toBe(newId);

			expect(await a.moveToActive(oldId)).toBeNull();
			expect(await redis.exists(lockKey(newId))).toBe(0);

			expect(String((await b.moveToActive(newId))?.id)).toBe(newId);
			expect(await a.moveToActive(oldId)).toBeNull();
			expect(await redis.get(lockKey(newId))).toBe(b.token);
			expect(await list('active')).toEqual([newId]);
		});

		test('a job returned to wait with processedOn set is activated normally', async () => {
			// Models a worker that hands an activated job back during shutdown (CAT-4728)
			const jobId = await addAndDequeue();
			expect(await b.moveToActive(jobId)).not.toBeNull();
			await redis.del(lockKey(jobId));
			await redis.lrem(key('active'), 0, jobId);
			await redis.rpush(key('wait'), jobId);
			expect(await dequeueWithoutActivating()).toBe(jobId);

			const activated = await a.moveToActive(jobId);

			expect(String(activated?.id)).toBe(jobId);
			expect(await redis.get(lockKey(jobId))).toBe(a.token);
		});

		test.each([
			['completed', async (job: Job<JobData>) => await job.moveToCompleted('ok', false, true)],
			['failed', async (job: Job<JobData>) => await job.moveToFailed(new Error('boom'), false)],
		])('R11: stale activation after the job %s returns nothing', async (_, finish) => {
			const jobId = await addAndDequeue();
			const job = await b.moveToActive(jobId);
			await finish(job!);

			expect(await a.moveToActive(jobId)).toBeNull();

			expect(await redis.exists(lockKey(jobId))).toBe(0);
			expect(await list('active')).toEqual([]);
		});

		test('R11: stale activation after the job was removed returns nothing', async () => {
			const oldId = await addAndDequeue();
			const newId = await recover(oldId);
			await (await a.getJob(newId))!.remove();

			expect(await a.moveToActive(oldId)).toBeNull();
			expect(await a.moveToActive(newId)).toBeNull();

			expect(await redis.keys(`${prefix}:*:lock`)).toEqual([]);
			expect(await redis.exists(key(oldId), key(newId))).toBe(0);
		});

		test('completion fetch-next activates the next job, so a stale explicit activation is refused', async () => {
			const first = await a.add(jobData('1'));
			const second = await a.add(jobData('2'));
			const secondId = String(second.id);
			const running = await b.moveToActive();
			expect(String(running?.id)).toBe(String(first.id));

			await running!.moveToCompleted('ok', false, false);

			expect(await list('active')).toEqual([secondId]);
			expect(await redis.get(lockKey(secondId))).toBe(b.token);
			expect(await hasField(secondId, 'processedOn')).toBe(true);
			expect(await a.moveToActive(secondId)).toBeNull();
			expect(await redis.get(lockKey(secondId))).toBe(b.token);
		});
	});

	describe('processor path', () => {
		test('the handler runs a recovered job once while the stale worker wakes up', async () => {
			const oldId = await addAndDequeue();
			const newId = await recover(oldId);

			let releaseHandler!: () => void;
			const handlerRunning = new Promise<void>((resolve) => {
				const held = new Promise<void>((release) => (releaseHandler = release));
				void b.process(async () => {
					await redis.incr(key('runs'));
					resolve();
					await held;
					return 'ok';
				});
			});
			await handlerRunning;
			expect(await list('active')).toEqual([newId]);

			expect(await a.moveToActive(oldId)).toBeNull();
			expect(await redis.get(lockKey(newId))).toBe(b.token);

			releaseHandler();
			await vi.waitFor(async () => expect(await stateOf(newId)).toBe('completed'));
			expect(await redis.get(key('runs'))).toBe('1');
		});

		test('an unpatched worker that wakes up with the old id gets no runnable job', async () => {
			// Models a rolling upgrade: the stale worker still runs Bull's unguarded activation script
			const oldId = await addAndDequeue();
			const newId = await recover(oldId);
			const patched = readFileSync(
				createRequire(__filename).resolve('bull/lib/commands/moveToActive-8.lua'),
				'utf8',
			);
			const start = patched.indexOf('  -- n8n patch');
			const end = patched.indexOf('  -- clean stalled key');
			expect(start).toBeGreaterThan(0);
			const unpatched = patched.slice(0, start) + patched.slice(end);

			const raw = (await redis.eval(
				unpatched,
				8,
				key('wait'),
				key('active'),
				key('priority'),
				`${key('active')}@stale-token`,
				key('stalled'),
				key('limiter'),
				key('delayed'),
				key('drained'),
				key(''),
				'stale-token',
				'60000',
				String(Date.now()),
				oldId,
			)) as [string[], string] | null;

			const fields = Object.fromEntries(
				(raw?.[0] ?? []).reduce<Array<[string, string]>>((pairs, value, i, all) => {
					if (i % 2 === 0) pairs.push([value, all[i + 1]]);
					return pairs;
				}, []),
			);
			expect(fields.data).toBeUndefined();
			expect(await list('wait')).toEqual([newId]);
			expect(await redis.exists(lockKey(newId))).toBe(0);
			expect(await redis.hget(key(newId), 'data')).toBe(JSON.stringify(jobData('1')));
		});
	});

	test('JobOutcomeTracker: the rebound wait settles once from the fresh id', async () => {
		const activeExecutions = mock<ActiveExecutions>();
		const tracker = new JobOutcomeTracker(
			mockLogger(),
			activeExecutions,
			mock<ExecutionRepository>(),
			mock<EventService>(),
		);
		const job = await a.add(jobData('1'));
		const oldId = String(job.id);
		let settled = false;
		const wait = tracker.waitFor(job).then(() => {
			settled = true;
		});

		expect(await dequeueWithoutActivating()).toBe(oldId);
		const newId = await recover(oldId);
		tracker.rebind(QUEUE_NAME, (await a.getJob(newId))!);
		const picked = await b.getNextJob();
		expect(String(picked?.id)).toBe(newId);
		expect(settled).toBe(false);

		await picked!.moveToCompleted('ok', false, true);
		tracker.settleByJobKey(QUEUE_NAME, oldId);
		expect(settled).toBe(false);
		tracker.settleByJobKey(QUEUE_NAME, newId);

		await wait;
		expect(activeExecutions.resolveResponsePromise).toHaveBeenCalledTimes(1);
		tracker.clear();
	});
});
