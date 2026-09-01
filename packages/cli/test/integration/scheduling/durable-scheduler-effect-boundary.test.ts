import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { ScheduledJob, WorkflowEntity } from '@n8n/db';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type {
	ClaimedTask,
	DispatchReporter,
	Scheduler,
	SchedulerPasses,
	TaskHandler,
} from '@n8n/scheduler';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';
import {
	SCHEDULE_TRIGGER_TASK_TYPE,
	scheduleTriggerDeduplicationKey,
} from '@/scheduling/schedule-trigger-node/schedule-trigger-task';

/**
 * The durable-scheduler effect boundary under the at-least-once contract.
 *
 * A handler models `ScheduleTriggerTaskHandler` faithfully: it inserts a real
 * execution row under the occurrence-derived dedup key (hitting the real partial
 * unique index), then reports the dispatch via `report.dispatched()` (as the real handler
 * does right after `runWorkflow`), standing in for the running workflow with a
 * dispatch spy. Assertions are on that spy, never on the presence of an
 * `execution_entity` row.
 *
 * The cases: a redelivery still dispatches past an orphaned `new` tombstone
 * (`reclaimTombstone`); and a post-dispatch lease lapse is not recorded failed
 * (the dispatch marker lets the reaper complete it). Concurrent-handler
 * behaviour is deliberately not asserted here: at-least-once permits overlap,
 * and tightening it is deferred to the misfire-policy work.
 */
describe('durable scheduler effect boundary', () => {
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
	 * Mirrors `ScheduleTriggerTaskHandler.execute`: insert the execution row under the
	 * occurrence's dedup key (real unique index), then report the dispatch. A
	 * pre-existing row makes the insert collide, and `DuplicateExecutionError` is
	 * swallowed like `recordExistingHandoff` does: report `notDispatched()`, so no
	 * marker is stamped (the effect already exists and isn't ours).
	 */
	const effectBoundaryHandler = (opts: { hangAfterDispatch?: boolean } = {}): TaskHandler => ({
		execute: async (task: ClaimedTask, report: DispatchReporter) => {
			const deduplicationKey = scheduleTriggerDeduplicationKey(task);
			try {
				// The insert transaction: claims the key (execution-persistence.create).
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
				return report.notDispatched();
			}
			// The insert committed and the run was initiated: the effect is real. Stand in
			// for the running workflow with the spy, then report the dispatch so the task
			// carries its marker (as the real handler does after runWorkflow).
			dispatchSpy(task);
			const decision = report.dispatched();
			if (opts.hangAfterDispatch) {
				const gate = deferred();
				releases.push(gate.resolve);
				await gate.promise;
			}
			return decision;
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
	// yet the task is recorded `succeeded`.
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

	// (b) The workflow is dispatched (the marker is stamped), then the lease lapses
	// before the outcome write. The reaper sees the marker and completes the row rather
	// than recording `failed` for work that was done.
	it('does not record a task failed after its workflow was dispatched', async () => {
		const scheduler = makeScheduler(effectBoundaryHandler({ hangAfterDispatch: true }));

		const taskRow = await createTask({ maxAttempts: 1 });

		// Fire it: the handler dispatches and reports it, then stalls (the instance hangs
		// before the outcome write). Wait for the dispatch marker to be persisted so the
		// reaper below reads it: this is the deterministic post-dispatch state.
		await scheduler.execute();
		await waitFor(
			async () => (await taskRepo.findOneByOrFail({ id: taskRow.id })).dispatchedAt !== null,
		);
		expect(dispatchSpy).toHaveBeenCalledTimes(1);

		// The stalled owner's lease lapses; the reaper resolves the row.
		await taskRepo.update({ id: taskRow.id }, { leaseExpiresAt: past() });
		const result = await scheduler.reap();
		// A completion is a success, not a dead-letter, so it is not counted as one.
		expect(result.deadLettered).toBe(0);

		// The marker proves the effect happened, so the row is completed, not failed.
		const final = await taskRepo.findOneByOrFail({ id: taskRow.id });
		expect(final.status).toBe('succeeded');
	}, 15_000);
});
