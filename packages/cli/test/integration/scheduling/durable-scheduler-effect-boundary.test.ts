import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { ScheduledJob, WorkflowEntity } from '@n8n/db';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { ClaimedTask, Scheduler, SchedulerPasses, TaskHandler } from '@n8n/scheduler';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';
import {
	SCHEDULE_TRIGGER_TASK_TYPE,
	scheduleTriggerDeduplicationKey,
} from '@/scheduling/schedule-trigger-node/schedule-trigger-task';

/**
 * Red tests for the durable-scheduler effect-boundary defects reported in
 * `features/durable-scheduler/REPORT.md` (findings 1-4), following Action #5's
 * test list. They fail against current master because the defects are unfixed.
 *
 * The one structural defect: the deduplication key is claimed when the
 * *execution row is inserted* (execution-persistence.ts:111), not when the
 * workflow is *dispatched* (the detached run at workflow-runner.ts:461-470).
 * Those are two transactions, so anything that lands between them leaves a row
 * that permanently asserts an effect which never happened.
 *
 * A handler models that boundary faithfully: it inserts a real execution row
 * under the occurrence-derived dedup key (hitting the real partial unique index,
 * same path `ScheduleTriggerTaskHandler` drives via `runWorkflow`), then calls a
 * dispatch spy that stands in for the workflow actually being run. Per Action #5
 * the assertions are on that dispatch spy, never on the presence of an
 * `execution_entity` row (which would reproduce the bug inside the test).
 */
describe('durable scheduler effect boundary (red: findings 1-4)', () => {
	const HOST = 'main-effect-boundary';

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let executionPersistence: ExecutionPersistence;
	let workflow: WorkflowEntity;
	let job: ScheduledJob;

	// Schedulers created per test, stopped in afterEach so their timers/loops drain.
	const schedulers: Array<Scheduler & SchedulerPasses> = [];
	// Deferreds any hanging handler awaits, always resolved on teardown.
	let releases: Array<() => void> = [];

	const dispatchSpy = vi.fn();

	const past = () => new Date(Date.now() - 60_000);

	const deferred = () => {
		let resolve!: () => void;
		const promise = new Promise<void>((r) => {
			resolve = r;
		});
		return { promise, resolve };
	};

	const delay = async (ms: number) => await new Promise((resolve) => setTimeout(resolve, ms));

	const waitFor = async (predicate: () => Promise<boolean> | boolean, timeoutMs = 10_000) => {
		const deadline = Date.now() + timeoutMs;
		while (Date.now() < deadline) {
			if (await predicate()) return;
			await delay(25);
		}
		throw new Error('condition not met in time');
	};

	const makeScheduler = (
		handler: TaskHandler,
		hostId = HOST,
		executor: { leaseSeconds?: number; lookaheadSeconds?: number; batchSize?: number } = {},
	) => {
		const scheduler = createScheduler({
			hostId,
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
			executor: { leaseSeconds: 60, lookaheadSeconds: 5, batchSize: 100, ...executor },
		});
		scheduler.registerTaskHandler(SCHEDULE_TRIGGER_TASK_TYPE, handler);
		schedulers.push(scheduler);
		return scheduler;
	};

	/**
	 * Mirrors `ScheduleTriggerTaskHandler.execute`: insert the execution row under
	 * the occurrence's dedup key (real unique index), then dispatch. A pre-existing
	 * row makes the insert collide, and `DuplicateExecutionError` is swallowed like
	 * `recordExistingHandoff` does, so the dispatch never runs.
	 */
	const effectBoundaryHandler = (opts: { hangAfterDispatch?: boolean } = {}): TaskHandler => ({
		execute: async (task: ClaimedTask) => {
			const deduplicationKey = scheduleTriggerDeduplicationKey(task);
			try {
				// The insert transaction (execution-persistence.ts:111): claims the key.
				await executionPersistence.create({
					workflowId: workflow.id,
					data: createEmptyRunExecutionData(),
					workflowData: workflow,
					mode: 'trigger',
					status: 'new',
					finished: false,
					deduplicationKey,
				});
			} catch (error) {
				if (!(error instanceof DuplicateExecutionError)) throw error;
				// A row already holds the key: swallow and complete, as the handler does.
				return;
			}
			// The insert committed; the workflow is now dispatched (the detached run
			// at workflow-runner.ts:461-470), a separate transaction from the insert.
			dispatchSpy(task);
			if (opts.hangAfterDispatch) {
				const gate = deferred();
				releases.push(gate.resolve);
				await gate.promise;
			}
		},
	});

	const createTask = async (overrides: Record<string, unknown> = {}) =>
		await taskRepo.save(
			taskRepo.create({
				jobId: job.id,
				taskType: SCHEDULE_TRIGGER_TASK_TYPE,
				payload: { workflowId: 'wf-1', nodeId: 'node-1' },
				scheduledFor: new Date('2026-07-06T07:30:00.000Z'),
				runAt: past(),
				status: 'pending',
				attempts: 0,
				maxAttempts: 1,
				...overrides,
			}),
		);

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		executionPersistence = Container.get(ExecutionPersistence);
		workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });
	});

	beforeEach(async () => {
		dispatchSpy.mockClear();
		releases = [];
		await testDb.truncate(['ScheduledTask', 'ScheduledJob', 'ExecutionEntity']);
		job = await jobRepo.save(
			jobRepo.create({
				name: `job-${Math.random().toString(36).slice(2)}`,
				workflowId: null,
				nodeId: null,
				taskType: SCHEDULE_TRIGGER_TASK_TYPE,
				payload: {},
				kind: 'interval',
				intervalSeconds: 3600,
				enabled: true,
				nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
				maxAttempts: 1,
			}),
		);
	});

	afterEach(async () => {
		for (const release of releases) release();
		releases = [];
		await Promise.all(schedulers.map(async (s) => await s.stop()));
		schedulers.length = 0;
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	// (a) A tombstone row (a prior attempt inserted the execution as `new`, then died
	// before dispatching) holds the dedup key. The redelivery must still dispatch the
	// workflow. On master it does not: the insert collides and the dispatch is skipped,
	// yet the task is recorded `succeeded` (findings 1 and 2).
	it('dispatches the workflow even when a tombstone execution row already holds the key', async () => {
		const taskRow = await createTask();
		const key = scheduleTriggerDeduplicationKey({
			jobId: taskRow.jobId,
			scheduledFor: taskRow.scheduledFor,
		});

		// The stuck row from a crashed earlier attempt: inserted `new`, never dispatched.
		await executionPersistence.create({
			workflowId: workflow.id,
			data: createEmptyRunExecutionData(),
			workflowData: workflow,
			mode: 'trigger',
			status: 'new',
			finished: false,
			deduplicationKey: key,
		});

		const scheduler = makeScheduler(effectBoundaryHandler());
		const claimed = await scheduler.execute();
		expect(claimed).toHaveLength(1);

		await waitFor(
			async () => (await taskRepo.findOneByOrFail({ id: taskRow.id })).status === 'succeeded',
		);

		// The occurrence's workflow must have been dispatched; on master it never is.
		expect(dispatchSpy).toHaveBeenCalledTimes(1);
	}, 15_000);

	// (b) On the shipped default (maxAttempts = 1), a task claimed but not yet dispatched
	// (its owner died before the fire timer ran) is dead-lettered on the first lease lapse.
	// The workflow must still be dispatched; on master it is dropped and recorded `failed`
	// (finding 3).
	it('dispatches the workflow rather than dropping it when the lease lapses before dispatch (maxAttempts=1)', async () => {
		makeScheduler(effectBoundaryHandler());

		// Claimed and running, lease already lapsed, never started: the pre-dispatch state.
		const taskRow = await createTask({
			status: 'running',
			claimedBy: 'main-dead',
			leaseExpiresAt: past(),
			leaseEpoch: 1,
			startedAt: null,
			attempts: 0,
			maxAttempts: 1,
		});

		const result = await schedulers[0].reap();
		expect(result).toEqual({ reclaimed: 0, deadLettered: 1 });

		const reaped = await taskRepo.findOneByOrFail({ id: taskRow.id });
		expect(reaped.status).toBe('failed'); // documents the drop; the dispatch below is the real proof

		// The occurrence's workflow must have been dispatched before being given up on.
		expect(dispatchSpy).toHaveBeenCalledTimes(1);
	});

	// (c) The workflow is dispatched, then the lease lapses between the dispatch
	// (executor.ts:221) and the outcome write (executor.ts:237). The reaper dead-letters
	// the still-`running` row, so the task is recorded `failed` for work that was done
	// (finding 4).
	it('does not record a task failed after its workflow was dispatched', async () => {
		const scheduler = makeScheduler(effectBoundaryHandler({ hangAfterDispatch: true }));

		const taskRow = await createTask({ maxAttempts: 1 });

		// Fire it: the handler dispatches, then stalls (the instance hangs before the
		// outcome write), leaving the row `running` with the workflow already started.
		await scheduler.execute();
		await waitFor(() => dispatchSpy.mock.calls.length === 1);

		// The stalled owner's lease lapses; the reaper reclaims the row.
		await taskRepo.update({ id: taskRow.id }, { leaseExpiresAt: past() });
		const result = await scheduler.reap();
		expect(result.deadLettered).toBe(1);

		expect(dispatchSpy).toHaveBeenCalledTimes(1); // the workflow was dispatched

		// So the task must not be recorded `failed`; on master it is.
		const final = await taskRepo.findOneByOrFail({ id: taskRow.id });
		expect(final.status).not.toBe('failed');
	}, 15_000);

	// (d) Two instances run the same task's handler concurrently. `markStarted` never
	// checks lease expiry, so a stalled owner's handler is still in-flight when the reaper
	// reclaims the row and a second instance claims and dispatches it (finding 5). Reachable
	// with maxAttempts >= 2, where the reaper reclaims rather than dead-letters.
	it('runs one handler at a time for a single occurrence', async () => {
		let concurrent = 0;
		let maxObserved = 0;
		const firstIn = deferred();
		const bothIn = deferred();

		const concurrencyHandler: TaskHandler = {
			execute: async () => {
				concurrent += 1;
				maxObserved = Math.max(maxObserved, concurrent);
				if (concurrent === 1) firstIn.resolve();
				if (concurrent >= 2) bothIn.resolve();
				// Stay inside until the second handler enters (or a safety timeout), so a
				// genuine overlap is observed rather than raced past.
				await Promise.race([bothIn.promise, delay(2_000)]);
				concurrent -= 1;
			},
		};

		const s1 = makeScheduler(concurrencyHandler, 'main-d1', { leaseSeconds: 60 });
		const s2 = makeScheduler(concurrencyHandler, 'main-d2', { leaseSeconds: 60 });

		const taskRow = await createTask({ maxAttempts: 2 });

		// i1 claims and fires; its handler enters and waits.
		await s1.execute();
		await firstIn.promise;

		// i1's lease lapses while its handler is still in-flight; the reaper reclaims the
		// row (attempts 1 < maxAttempts 2), returning it to pending under a bumped epoch.
		await taskRepo.update({ id: taskRow.id }, { leaseExpiresAt: past() });
		const reap = await s2.reap();
		expect(reap.reclaimed).toBe(1);

		// The reclaim pushed runAt out by backoff; bring it back so i2 fires now (timing is
		// not what's under test).
		await taskRepo.update({ id: taskRow.id }, { runAt: past() });

		// i2 claims and fires; markStarted lands despite i1's handler still running.
		await s2.execute();

		// Both handlers release once the second is inside (or after the safety timeout).
		await Promise.race([bothIn.promise, delay(2_500)]);

		// Only one instance may be inside the handler for a single occurrence.
		expect(maxObserved).toBeLessThanOrEqual(1);
	}, 15_000);
});
