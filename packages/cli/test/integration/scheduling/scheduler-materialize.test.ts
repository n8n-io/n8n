import { createWorkflowWithHistory, testDb } from '@n8n/backend-test-utils';
import {
	DataSource,
	type ScheduledJob,
	ScheduledJobRepository,
	ScheduledTaskRepository,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler, totalDiscarded } from '@n8n/scheduler';
import type { SchedulerDeps } from '@n8n/scheduler';
import { v4 as uuid } from 'uuid';

import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';

import { selfOwned, workflowOwned } from './shared/job-factory';

describe('scheduler materialization', () => {
	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
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

	const claimOpts = () => ({
		host: 'materialize-test',
		taskTypes: ['test'],
		lookaheadMs: 0,
		leaseMs: 60_000,
		batchSize: 10,
	});

	const createJob = async (overrides: Partial<ScheduledJob> = {}) => {
		const name = `job-${++seq}`;
		return await jobRepo.save(
			jobRepo.create({
				name,
				...selfOwned(name),
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
	};

	/** Compose a scheduler over the production storage bindings, with per-test tuning. */
	const composeScheduler = (materializer?: SchedulerDeps['materializer']) =>
		createScheduler({
			hostId: 'materialize-test',
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
			materializer,
		});

	const runMaterialization = async (windowSeconds: number) =>
		await composeScheduler({
			windowSeconds,
			batchSize: 100,
			maxPerJob: 100,
			planRetrySeconds: 3600,
			defaultTimezone: 'UTC',
		}).materialize();

	it('records a due occurrence and advances the job past it', async () => {
		const job = await createJob({ intervalSeconds: 3600, nextRunAt: secondsFromNow(-1) });

		const summary = await runMaterialization(0);

		expect(summary).toMatchObject({ claimedJobs: 1, occurrences: 1, deferredJobs: 0 });

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

	it('stops offering a coalesce occurrence once it is past its deadline', async () => {
		await createJob({ misfirePolicy: 'coalesce', misfireGraceSeconds: 60 });

		await runMaterialization(0);

		const [task] = await taskRepo.find();
		await taskRepo.update(
			{ id: task.id },
			{ runAt: secondsFromNow(-86_400), missedAfter: secondsFromNow(-86_340) },
		);

		expect(await taskRepo.claimDueTasks(claimOpts())).toHaveLength(0);
		expect(await taskRepo.retireMissedPending(10)).toBe(1);
		expect((await taskRepo.findOneByOrFail({ id: task.id })).status).toBe('missed');
	});

	it.each(['skip', 'coalesce'] as const)(
		'gives a %s occurrence a deadline the claim can refuse it by',
		async (misfirePolicy) => {
			await createJob({ misfirePolicy, misfireGraceSeconds: 60 });

			await runMaterialization(0);

			const [task] = await taskRepo.find();
			expect(task.missedAfter).not.toBeNull();
			expect(task.missedAfter!.getTime()).toBeGreaterThan(task.runAt.getTime());
		},
	);

	it('retires the queued occurrences a later catch-up run supersedes', async () => {
		const job = await createJob({ intervalSeconds: 10, misfireGraceSeconds: 30 });

		await runMaterialization(0);
		const [queued] = await taskRepo.find();
		expect(queued.status).toBe('pending');

		await jobRepo.update({ id: job.id }, { nextRunAt: secondsFromNow(-300) });
		const summary = await runMaterialization(0);

		expect(summary.retiredOccurrences).toBe(1);
		expect((await taskRepo.findOneByOrFail({ id: queued.id })).status).toBe('missed');
		expect(await taskRepo.countBy({ status: 'pending' })).toBe(1);
	});

	it('drops a capped backlog rather than firing a stale run per pass', async () => {
		// A job far behind (interval 10s, ~100s of backlog) so more than maxPerJob fires
		// are due, forcing the walk to stop at the cap.
		await createJob({ intervalSeconds: 10, nextRunAt: secondsFromNow(-100) });
		const drainScheduler = composeScheduler({
			windowSeconds: 0,
			batchSize: 100,
			maxPerJob: 5,
			planRetrySeconds: 3600,
			defaultTimezone: 'UTC',
		});

		// Records nothing: every fire in this backlog is already stale by the time it's discarded.
		const first = await drainScheduler.materialize();
		expect(first.occurrences).toBe(0);
		expect(totalDiscarded(first.misfires)).toBe(5);
		expect(await taskRepo.count()).toBe(0);

		// Draining stops being a misfire once the remaining instants are inside their
		// grace window, so a capped backlog costs at most a grace window of fires.
		let passes = 0;
		while (passes < 10) {
			const summary = await drainScheduler.materialize();
			passes += 1;
			if (summary.occurrences === 0 && totalDiscarded(summary.misfires) === 0) break;
		}

		const tasks = await taskRepo.find();
		const distinctInstants = new Set(tasks.map((t) => t.scheduledFor.getTime()));
		expect(distinctInstants.size).toBe(tasks.length);
		// The ~40s beyond the grace window are gone; only the recent tail was recorded.
		expect(tasks.length).toBeLessThan(10);
		for (const task of tasks) {
			expect(task.scheduledFor.getTime()).toBeGreaterThan(Date.now() - 70_000);
		}
	});

	it('records the upcoming occurrences within the window, ahead of time', async () => {
		await createJob({ intervalSeconds: 10, nextRunAt: secondsFromNow(-1) });

		const summary = await runMaterialization(60);

		// A sub-minute schedule fills the window in one pass instead of one fire at a time.
		expect(summary.occurrences).toBeGreaterThan(1);
		expect(await taskRepo.count()).toBe(summary.occurrences);
	});

	it('fires a backlog in full when every occurrence is still inside its grace window', async () => {
		// Known residual: the misfire policy only acts once an occurrence is past its
		// deadline. A backlog that fits entirely inside the grace window is not a
		// misfire at all, so it is recorded and later claimed in full rather than
		// coalesced/skipped down to one run: the burst this guards against is bounded by
		// grace/interval, not eliminated.
		await createJob({
			intervalSeconds: 10,
			misfireGraceSeconds: 60,
			nextRunAt: secondsFromNow(-45),
		});

		const summary = await runMaterialization(0);

		// -45s, -35s, -25s, -15s, -5s: five due instants, all newer than now-60s.
		expect(summary.occurrences).toBe(5);
		expect(totalDiscarded(summary.misfires)).toBe(0);
		const tasks = await taskRepo.find();
		expect(tasks).toHaveLength(5);

		// Not just recorded: every one of them is still claimable, so this really is a
		// five-execution burst on the next executor tick, not a discarded backlog.
		const claimed = await taskRepo.claimDueTasks(claimOpts());
		expect(claimed).toHaveLength(5);
	});

	it('records the same occurrence only once (idempotent)', async () => {
		const job = await createJob({ intervalSeconds: 3600, nextRunAt: secondsFromNow(-1) });

		const first = await runMaterialization(0);
		expect(first.occurrences).toBe(1);
		expect(await taskRepo.count()).toBe(1);

		// Rewind the clock to replay the same window, as a racing duplicate pass would.
		await jobRepo.update({ id: job.id }, { nextRunAt: job.nextRunAt, lastFiredAt: null });
		const replay = await runMaterialization(0);

		// The occurrence already exists, so the replay claims the job but records nothing new.
		expect(replay.claimedJobs).toBe(1);
		expect(replay.occurrences).toBe(0);
		expect(await taskRepo.count()).toBe(1);
	});

	it('claims neither future nor disabled jobs', async () => {
		await createJob({ nextRunAt: secondsFromNow(3600) });
		await createJob({ enabled: false, nextRunAt: secondsFromNow(-1) });

		const summary = await runMaterialization(0);

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

		const summary = await runMaterialization(60);

		expect(summary.occurrences).toBe(1);
		const advanced = await jobRepo.findOneByOrFail({ id: job.id });
		expect(advanced.nextRunAt).toBeNull();
	});

	it('defers a job whose schedule cannot be planned and keeps materializing the rest', async () => {
		const good = await createJob({ intervalSeconds: 3600, nextRunAt: secondsFromNow(-1) });
		const bad = await createJob({
			kind: 'cron',
			cronExpression: 'not a cron expression',
			intervalSeconds: null,
			nextRunAt: secondsFromNow(-1),
		});

		const summary = await runMaterialization(0);

		expect(summary).toMatchObject({ claimedJobs: 2, occurrences: 1, deferredJobs: 1 });

		// The good job materialized normally.
		const [task] = await taskRepo.find();
		expect(task.jobId).toBe(good.id);

		// The bad job recorded nothing and was pushed a retry backoff into the future,
		// not dropped: nextRunAt stays set (null is reserved for exhausted schedules).
		const deferred = await jobRepo.findOneByOrFail({ id: bad.id });
		expect(deferred.nextRunAt!.getTime()).toBeGreaterThan(Date.now());

		// Deferred means not due: the next pass does not re-claim it.
		const next = await runMaterialization(0);
		expect(next.claimedJobs).toBe(0);
	});

	it('resumes a deferred job once its schedule is fixed', async () => {
		const job = await createJob({
			kind: 'cron',
			cronExpression: 'not a cron expression',
			intervalSeconds: null,
			nextRunAt: secondsFromNow(-1),
		});
		await runMaterialization(0);

		// Repair the schedule and let the retry come due (rewound rather than waited out).
		await jobRepo.update(
			{ id: job.id },
			{ cronExpression: '0 0 9 * * *', nextRunAt: secondsFromNow(-1) },
		);

		const summary = await runMaterialization(0);

		// The repaired job materializes again with no other intervention.
		expect(summary).toMatchObject({ claimedJobs: 1, occurrences: 1, deferredJobs: 0 });
		const resumed = await jobRepo.findOneByOrFail({ id: job.id });
		expect(resumed.nextRunAt).not.toBeNull();
	});

	it('materializes a due job with the default window', async () => {
		const job = await createJob({ intervalSeconds: 3600, nextRunAt: secondsFromNow(-1) });

		const summary = await composeScheduler().materialize();

		expect(summary.claimedJobs).toBe(1);
		const [task] = await taskRepo.find();
		expect(task.jobId).toBe(job.id);
	});

	it('records each occurrence once and advances each job once under concurrent passes', async () => {
		// Many jobs due at once, then several passes racing for them, each with a batch
		// smaller than the backlog so no single pass can drain it.
		// On Postgres the passes run in parallel and SKIP LOCKED partitions the jobs between them.
		// On sqlite they contend for the single writer lease and serialize, each seeing the previous pass's commit.
		//
		// Either way every pass must claim exactly its batch:
		// a pass that re-claimed another's jobs would break the per-job uniqueness checks below.
		const jobCount = 6;
		const batchSize = 2;
		await Promise.all(
			Array.from(
				{ length: jobCount },
				async () => await createJob({ intervalSeconds: 3600, nextRunAt: secondsFromNow(-60) }),
			),
		);

		const pass = composeScheduler({
			windowSeconds: 0,
			batchSize,
			maxPerJob: 100,
			planRetrySeconds: 3600,
			defaultTimezone: 'UTC',
		});
		const summaries = await Promise.all([
			pass.materialize(),
			pass.materialize(),
			pass.materialize(),
		]);

		// Deterministic on both backends: in any interleaving each claim still sees at
		// least `batchSize` due unclaimed jobs, so each pass claims and records exactly
		// its batch (more would mean two passes grabbed the same job).
		expect(summaries.map((s) => s.claimedJobs)).toEqual([batchSize, batchSize, batchSize]);
		expect(summaries.map((s) => s.occurrences)).toEqual([batchSize, batchSize, batchSize]);

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

	describe('rules of one node under the owner-wide coalesce policy', () => {
		let workflowId: string;
		let nodeId: string;
		let owner: ReturnType<typeof workflowOwned>;

		const createRule = async () =>
			await createJob({
				...owner,
				intervalSeconds: 3600,
				misfirePolicy: 'coalesce_owner',
				misfireGraceSeconds: 3600,
				nextRunAt: secondsFromNow(3600),
			});

		beforeEach(async () => {
			const workflow = await createWorkflowWithHistory({ active: true });
			await Container.get(WorkflowPublishedVersionRepository).setPublishedVersion(
				workflow.id,
				workflow.versionId,
			);
			workflowId = workflow.id;
			nodeId = uuid();
			owner = workflowOwned(workflowId, nodeId);
		});

		it('leaves one catch-up run pending and retires the occurrences it supersedes', async () => {
			const rules = [await createRule(), await createRule(), await createRule()];
			await jobRepo.backdateNextRunAt(owner, 200);

			const firstPass = await runMaterialization(0);
			expect(firstPass).toMatchObject({ claimedJobs: 3, occurrences: 3 });
			const queued = await taskRepo.find();
			expect(queued).toHaveLength(3);
			expect(queued.every((task) => task.status === 'pending')).toBe(true);

			await jobRepo.update({ ...owner }, { misfireGraceSeconds: 30 });
			await jobRepo.backdateNextRunAt(owner, 100);

			const secondPass = await runMaterialization(0);

			expect(secondPass).toMatchObject({
				claimedJobs: 3,
				occurrences: 1,
				retiredOccurrences: 3,
			});

			const tasks = await taskRepo.find();
			const pending = tasks.filter((task) => task.status === 'pending');
			expect(pending).toHaveLength(1);
			expect(pending[0].jobId).toBe(Math.min(...rules.map((rule) => rule.id)));
			expect(pending[0].runAt.getTime()).toBeGreaterThan(pending[0].scheduledFor.getTime());

			const missedIds = tasks
				.filter((task) => task.status === 'missed')
				.map((task) => task.id)
				.sort();
			expect(missedIds).toEqual(queued.map((task) => task.id).sort());
		});

		it('never groups self-owned jobs together, whatever their policy', async () => {
			// A system task is its own owner, so unrelated system jobs cannot coalesce
			// into one another's catch-up run even under the owner-wide policy.
			const first = await createJob({
				intervalSeconds: 3600,
				misfirePolicy: 'coalesce_owner',
				misfireGraceSeconds: 30,
				nextRunAt: secondsFromNow(-100),
			});
			const second = await createJob({
				intervalSeconds: 3600,
				misfirePolicy: 'coalesce_owner',
				misfireGraceSeconds: 30,
				nextRunAt: secondsFromNow(-100),
			});

			const summary = await runMaterialization(0);

			expect(summary).toMatchObject({ claimedJobs: 2, occurrences: 2 });
			const pending = await taskRepo.find({ where: { status: 'pending' } });
			expect(pending.map((task) => task.jobId).sort()).toEqual([first.id, second.id].sort());
		});

		it('advances every rule clock even though only one catch-up run was recorded', async () => {
			const rules = [await createRule(), await createRule(), await createRule()];
			await jobRepo.update({ ...owner }, { misfireGraceSeconds: 30 });
			await jobRepo.backdateNextRunAt(owner, 100);

			await runMaterialization(0);

			for (const rule of rules) {
				const advanced = await jobRepo.findOneByOrFail({ id: rule.id });
				expect(advanced.nextRunAt!.getTime()).toBeGreaterThan(Date.now());
				expect(advanced.lastFiredAt).not.toBeNull();
			}
			expect(await taskRepo.count()).toBe(1);
		});
	});
});
