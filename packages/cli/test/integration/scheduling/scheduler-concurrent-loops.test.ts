import { testDb } from '@n8n/backend-test-utils';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { ClaimedTask, Scheduler, SchedulerPasses } from '@n8n/scheduler';

import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';

import { retryUntil } from '../shared/retry-until';
import { createDueJobFactory } from './shared/job-factory';

/**
 * Two mains driving materialize+execute+reap concurrently, round after round,
 * against a shared backlog undersized enough to force both to participate.
 * The single-pass and multi-main suites prove each pass, and the claim/execute
 * race, in isolation; this repeats the claim race over several rounds: every
 * occurrence still fires exactly once, on the main that persisted as its
 * owner, with no task ever claimed by both.
 *
 * Leases are short-lived relative to the run, so reap stays a no-op here;
 * lease reclaim under contention is covered by the multi-main suite.
 */
describe('scheduler loops racing across two mains', () => {
	const TASK_TYPE = 'integration-concurrent-loops-test';

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let createDueJob: ReturnType<typeof createDueJobFactory>;

	let mainA: Scheduler & SchedulerPasses;
	let mainB: Scheduler & SchedulerPasses;
	const executedA: ClaimedTask[] = [];
	const executedB: ClaimedTask[] = [];

	const buildMain = (hostId: string, executed: ClaimedTask[], batchSize: number) => {
		const scheduler = createScheduler({
			hostId,
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
			executor: { leaseSeconds: 30, lookaheadSeconds: 5, batchSize },
		});
		scheduler.registerTaskHandler(TASK_TYPE, {
			execute: async (task) => {
				executed.push(task);
			},
		});
		return scheduler;
	};

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		createDueJob = createDueJobFactory(jobRepo, TASK_TYPE, 'job-loop');
		// A batch smaller than the backlog, same as the multi-main suite: a single
		// claim can't sweep it all, so both mains must participate across rounds
		// rather than one incidentally draining it alone.
		mainA = buildMain('main-loop-a', executedA, 2);
		mainB = buildMain('main-loop-b', executedB, 2);
	});

	beforeEach(async () => {
		executedA.length = 0;
		executedB.length = 0;
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterAll(async () => {
		await mainA.stop();
		await mainB.stop();
		await testDb.terminate();
	});

	it('drains a backlog of due jobs with every occurrence firing exactly once', async () => {
		const total = 5;
		for (let i = 0; i < total; i++) {
			await createDueJob();
		}

		// A handful of rounds of every pass (materialize, execute, reap), both
		// mains racing on each. The batch size (2) is smaller than the backlog (5),
		// so draining it takes more than one round; the later, now-empty rounds
		// prove they are harmless no-ops rather than double-firing anything.
		for (let round = 0; round < 3; round++) {
			await Promise.all([mainA.materialize(), mainB.materialize()]);
			await Promise.all([mainA.execute(), mainB.execute()]);
			await Promise.all([mainA.reap(), mainB.reap()]);
		}

		await retryUntil(
			async () => expect(await taskRepo.countBy({ status: 'succeeded' })).toBe(total),
			{ timeoutMs: 10_000 },
		);

		const rows = await taskRepo.find();
		expect(rows).toHaveLength(total);
		expect(rows.every((r) => r.status === 'succeeded')).toBe(true);

		// Exactly-once at execution: the union of what each main actually fired has
		// no overlap and covers every occurrence, matching the persisted rows.
		const idsA = executedA.map((t) => t.id);
		const idsB = executedB.map((t) => t.id);
		expect(idsA.filter((id) => idsB.includes(id))).toHaveLength(0);
		const executedIds = new Set([...idsA, ...idsB]);
		expect(executedIds).toEqual(new Set(rows.map((r) => r.id)));
		expect(executedA.length + executedB.length).toBe(total);
		// The undersized batch forced the backlog to split across both mains rather
		// than one incidentally draining it alone.
		expect(idsA.length).toBeGreaterThan(0);
		expect(idsB.length).toBeGreaterThan(0);

		// Each occurrence's persisted owner is the main that actually fired it, not
		// just some valid host.
		expect(
			rows.filter((r) => idsA.includes(r.id)).every((r) => r.claimedBy === 'main-loop-a'),
		).toBe(true);
		expect(
			rows.filter((r) => idsB.includes(r.id)).every((r) => r.claimedBy === 'main-loop-b'),
		).toBe(true);
	}, 20_000);
});
