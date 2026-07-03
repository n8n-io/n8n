import { testDb } from '@n8n/backend-test-utils';
import { type ScheduledJob, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { sweep } from '@n8n/scheduler';
import { SchedulerService, SweepStore } from '@n8n/scheduler/storage';

describe('scheduler sweep', () => {
	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let store: SweepStore;

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		store = Container.get(SweepStore);
	});

	afterEach(async () => {
		await taskRepo.delete({});
		await jobRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	let seq = 0;
	const secondsFromNow = (seconds: number) => new Date(Date.now() + seconds * 1000);

	const createJob = async (overrides: Partial<ScheduledJob> = {}) =>
		await jobRepo.save(
			jobRepo.create({
				name: `job-${++seq}`,
				taskType: 'test',
				payload: {},
				kind: 'interval',
				intervalSeconds: 3600,
				enabled: true,
				nextRunAt: secondsFromNow(-1),
				maxAttempts: 3,
				...overrides,
			}),
		);

	const runSweep = async (windowSeconds: number) =>
		await sweep(store.runInTransaction, {
			windowSeconds,
			batchSize: 100,
			maxPerJob: 100,
			planRetrySeconds: 3600,
		});

	it('records a due occurrence and advances the job past it', async () => {
		const job = await createJob({ intervalSeconds: 3600, nextRunAt: secondsFromNow(-1) });

		const summary = await runSweep(0);

		expect(summary).toEqual({ claimedJobs: 1, occurrences: 1, deferredJobs: 0 });

		const [task] = await taskRepo.find();
		expect(task.jobId).toBe(job.id);
		expect(task.taskType).toBe('test');
		expect(task.maxAttempts).toBe(3);
		expect(task.status).toBe('pending');
		// A fresh occurrence is visible immediately: runAt starts at the fire time.
		expect(task.runAt.getTime()).toBe(task.scheduledFor.getTime());

		const advanced = await jobRepo.findOneByOrFail({ id: job.id });
		// The job fired the recorded occurrence and advanced exactly one interval past it.
		expect(advanced.lastFiredAt!.getTime()).toBe(task.scheduledFor.getTime());
		expect(advanced.nextRunAt!.getTime() - advanced.lastFiredAt!.getTime()).toBe(3600 * 1000);
	});

	it('drains a backlog in maxPerJob-sized batches across successive sweeps', async () => {
		// A job far behind (interval 10s, ~100s of backlog) so more than maxPerJob fires are due.
		await createJob({ intervalSeconds: 10, nextRunAt: secondsFromNow(-100) });
		const drainOptions = { windowSeconds: 0, batchSize: 100, maxPerJob: 5, planRetrySeconds: 3600 };

		// The first sweep records exactly maxPerJob, capping the batch rather than draining it all.
		const first = await sweep(store.runInTransaction, drainOptions);
		expect(first.occurrences).toBe(5);
		expect(await taskRepo.count()).toBe(5);

		// Successive sweeps continue draining, each recording at most maxPerJob, until nothing is due.
		for (let i = 0; i < 10; i++) {
			const summary = await sweep(store.runInTransaction, drainOptions);
			expect(summary.occurrences).toBeLessThanOrEqual(5);
			if (summary.claimedJobs === 0) break;
		}

		// Drained: the backlog is fully recorded, every occurrence distinct (no duplicate from batching).
		const drained = await sweep(store.runInTransaction, drainOptions);
		expect(drained.claimedJobs).toBe(0);
		const tasks = await taskRepo.find();
		const distinctInstants = new Set(tasks.map((t) => t.scheduledFor.getTime()));
		expect(distinctInstants.size).toBe(tasks.length);
		expect(tasks.length).toBeGreaterThanOrEqual(10);
	});

	it('records the upcoming occurrences within the window, ahead of time', async () => {
		await createJob({ intervalSeconds: 10, nextRunAt: secondsFromNow(-1) });

		const summary = await runSweep(60);

		// A sub-minute schedule fills the window in one sweep instead of one fire at a time.
		expect(summary.occurrences).toBeGreaterThan(1);
		expect(await taskRepo.count()).toBe(summary.occurrences);
	});

	it('records the same occurrence only once (idempotent)', async () => {
		const job = await createJob({ intervalSeconds: 3600, nextRunAt: secondsFromNow(-1) });

		const first = await runSweep(0);
		expect(first.occurrences).toBe(1);
		expect(await taskRepo.count()).toBe(1);

		// Rewind the clock to replay the same window, as a racing duplicate sweep would.
		await jobRepo.update({ id: job.id }, { nextRunAt: job.nextRunAt, lastFiredAt: null });
		const replay = await runSweep(0);

		// The occurrence already exists, so the replay claims the job but records nothing new.
		expect(replay.claimedJobs).toBe(1);
		expect(replay.occurrences).toBe(0);
		expect(await taskRepo.count()).toBe(1);
	});

	it('claims neither future nor disabled jobs', async () => {
		await createJob({ nextRunAt: secondsFromNow(3600) });
		await createJob({ enabled: false, nextRunAt: secondsFromNow(-1) });

		const summary = await runSweep(0);

		expect(summary.claimedJobs).toBe(0);
		expect(await taskRepo.count()).toBe(0);
	});

	it('records a one-off once, then clears its next run', async () => {
		const job = await createJob({
			kind: 'one_off',
			intervalSeconds: null,
			fireAt: secondsFromNow(-1),
			nextRunAt: secondsFromNow(-1),
		});

		const summary = await runSweep(60);

		expect(summary.occurrences).toBe(1);
		const advanced = await jobRepo.findOneByOrFail({ id: job.id });
		expect(advanced.nextRunAt).toBeNull();
	});

	it('defers a job whose schedule cannot be planned and keeps sweeping the rest', async () => {
		const good = await createJob({ intervalSeconds: 3600, nextRunAt: secondsFromNow(-1) });
		const bad = await createJob({
			kind: 'cron',
			cronExpression: 'not a cron expression',
			intervalSeconds: null,
			nextRunAt: secondsFromNow(-1),
		});

		const summary = await runSweep(0);

		expect(summary).toEqual({ claimedJobs: 2, occurrences: 1, deferredJobs: 1 });

		// The good job materialized normally.
		const [task] = await taskRepo.find();
		expect(task.jobId).toBe(good.id);

		// The bad job recorded nothing and was pushed a retry backoff into the future,
		// not dropped: nextRunAt stays set (null is reserved for exhausted schedules).
		const deferred = await jobRepo.findOneByOrFail({ id: bad.id });
		expect(deferred.nextRunAt!.getTime()).toBeGreaterThan(Date.now());

		// Deferred means not due: the next sweep does not re-claim it.
		const next = await runSweep(0);
		expect(next.claimedJobs).toBe(0);
	});

	it('resumes a deferred job once its schedule is fixed', async () => {
		const job = await createJob({
			kind: 'cron',
			cronExpression: 'not a cron expression',
			intervalSeconds: null,
			nextRunAt: secondsFromNow(-1),
		});
		await runSweep(0);

		// Repair the schedule and let the retry come due (rewound rather than waited out).
		await jobRepo.update(
			{ id: job.id },
			{ cronExpression: '0 0 9 * * *', nextRunAt: secondsFromNow(-1) },
		);

		const summary = await runSweep(0);

		// The repaired job materializes again with no other intervention.
		expect(summary).toEqual({ claimedJobs: 1, occurrences: 1, deferredJobs: 0 });
		const resumed = await jobRepo.findOneByOrFail({ id: job.id });
		expect(resumed.nextRunAt).not.toBeNull();
	});

	it('runs through SchedulerService with its configured window', async () => {
		const job = await createJob({ intervalSeconds: 3600, nextRunAt: secondsFromNow(-1) });

		const summary = await Container.get(SchedulerService).runSweep();

		expect(summary.claimedJobs).toBe(1);
		const [task] = await taskRepo.find();
		expect(task.jobId).toBe(job.id);
	});

	it('records each occurrence once and advances each job once under concurrent sweeps', async () => {
		// Many jobs due at once, then several sweeps racing for them. On Postgres the sweeps
		// run in parallel and SKIP LOCKED partitions the jobs between them; on sqlite the
		// single-writer lock serializes them. The invariant holds either way.
		const jobCount = 6;
		await Promise.all(
			Array.from(
				{ length: jobCount },
				async () => await createJob({ intervalSeconds: 3600, nextRunAt: secondsFromNow(-60) }),
			),
		);

		const summaries = await Promise.all([runSweep(0), runSweep(0), runSweep(0)]);

		// Each job is claimed by exactly one sweep: the claim counts sum to the job count,
		// never more (more would mean two sweeps grabbed the same job).
		const claimedTotal = summaries.reduce((sum, s) => sum + s.claimedJobs, 0);
		expect(claimedTotal).toBe(jobCount);

		// Each due fire is recorded exactly once; no duplicate occurrences survive.
		const recordedTotal = summaries.reduce((sum, s) => sum + s.occurrences, 0);
		expect(recordedTotal).toBe(jobCount);

		const allTasks = await taskRepo.find();
		const allJobs = await jobRepo.find();
		expect(allTasks).toHaveLength(jobCount);
		// One occurrence per job (map keyed by jobId collapses any duplicate to one entry,
		// so a matching size alongside the length check means exactly one each).
		const taskByJob = new Map(allTasks.map((t) => [t.jobId, t]));
		expect(taskByJob.size).toBe(jobCount);

		// Every job advanced exactly one interval past its recorded fire.
		for (const job of allJobs) {
			const task = taskByJob.get(job.id);
			expect(task).toBeDefined();
			expect(job.lastFiredAt!.getTime()).toBe(task!.scheduledFor.getTime());
			expect(job.nextRunAt!.getTime() - job.lastFiredAt!.getTime()).toBe(3600 * 1000);
		}
	});
});
