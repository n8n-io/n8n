import { mock } from 'vitest-mock-extended';

import type { ClaimedTask } from '../../types';
import { backoff } from '../backoff';
import { Executor } from '../executor';
import type { ExecutorHooks } from '../executor';
import type { ExecutorOptions } from '../options';
import type { PrecisionTimer } from '../precision-timer';
import type { ExecutorTaskStore } from '../store';
import type { TaskHandler, TaskHandlerRegistry } from '../task-handler';
import type { ExecutorTracing, FireResult } from '../tracing';

const HOST = 'main-abc';

const claimedTask = (overrides: Partial<ClaimedTask> = {}): ClaimedTask => ({
	id: '1',
	jobId: 10,
	taskType: 'workflow:schedule-trigger',
	payload: {},
	scheduledFor: new Date('2026-07-01T00:00:00.000Z'),
	runAt: new Date('2026-07-01T00:00:00.000Z'),
	status: 'running',
	attempts: 0,
	maxAttempts: 1,
	leaseEpoch: 1,
	...overrides,
});

const setup = (options?: Partial<ExecutorOptions>) => {
	const store = mock<ExecutorTaskStore>();
	const registry = mock<TaskHandlerRegistry>();
	const timer = mock<PrecisionTimer>();
	const hooks = {
		onLeaseShorterThanLookahead: vi.fn(),
		onMissingHandler: vi.fn(),
		onFireError: vi.fn(),
		onReleaseError: vi.fn(),
		onDispatch: vi.fn(),
		onFire: vi.fn(),
		onRetry: vi.fn(),
	} satisfies ExecutorHooks;
	// A see-through tracing hook that records its calls and just runs the fire.
	// The executor's only obligation is to route every fire through this hook;
	// how spans are built from the result is tested in
	// observability/__tests__/executor-tracing.test.ts.
	const tracing = {
		fire: vi.fn(
			async (_host: string, _task: ClaimedTask, run: () => Promise<FireResult>) => await run(),
		),
	} satisfies ExecutorTracing;
	const executor = new Executor(
		store,
		registry,
		timer,
		{ leaseSeconds: 60, lookaheadSeconds: 5, batchSize: 100, ...options },
		hooks,
		tracing,
	);
	return { store, registry, timer, hooks, tracing, executor };
};

describe('Executor construction', () => {
	it('flags a lookahead that reaches the lease, once, at construction', () => {
		const { hooks } = setup({ leaseSeconds: 5, lookaheadSeconds: 5 });

		expect(hooks.onLeaseShorterThanLookahead).toHaveBeenCalledWith({
			lookaheadMs: 5_000,
			leaseMs: 5_000,
		});
	});

	it('stays silent when the lease comfortably exceeds the lookahead', () => {
		const { hooks } = setup();

		expect(hooks.onLeaseShorterThanLookahead).not.toHaveBeenCalled();
	});
});

describe('Executor.claimAndSchedule', () => {
	it('claims nothing when no handlers are registered', async () => {
		const { store, registry, executor } = setup();
		registry.registeredTypes.mockReturnValue([]);

		const claimed = await executor.claimAndSchedule(HOST);

		expect(claimed).toEqual([]);
		expect(store.claimDueTasks).not.toHaveBeenCalled();
	});

	it('claims with the registered types, lease and lookahead, and schedules each task', async () => {
		const { store, registry, timer, executor } = setup();
		const task = claimedTask();
		registry.registeredTypes.mockReturnValue(['workflow:schedule-trigger']);
		store.claimDueTasks.mockResolvedValue([task]);

		const claimed = await executor.claimAndSchedule(HOST);

		expect(store.claimDueTasks).toHaveBeenCalledWith({
			host: HOST,
			taskTypes: ['workflow:schedule-trigger'],
			leaseMs: 60_000,
			lookaheadMs: 5_000,
			batchSize: 100,
		});
		expect(timer.schedule).toHaveBeenCalledWith(task.runAt, expect.any(Function));
		expect(claimed).toEqual([task]);
	});

	it('hands back a claim that resolves after stop instead of arming post-stop timers', async () => {
		const { store, registry, timer, executor } = setup();
		const task = claimedTask();
		registry.registeredTypes.mockReturnValue(['workflow:schedule-trigger']);
		// The claim hangs (slow storage) across the shutdown.
		let resolveClaim!: (tasks: ClaimedTask[]) => void;
		store.claimDueTasks.mockImplementation(
			async () =>
				await new Promise<ClaimedTask[]>((resolve) => {
					resolveClaim = resolve;
				}),
		);
		store.releaseClaim.mockResolvedValue(1);

		const pending = executor.claimAndSchedule(HOST);
		await executor.stop();
		resolveClaim([task]);

		expect(await pending).toEqual([]);
		expect(timer.schedule).not.toHaveBeenCalled();
		expect(store.releaseClaim).toHaveBeenCalledWith({
			host: HOST,
			id: task.id,
			claimedEpoch: task.leaseEpoch,
		});
	});

	it('hands back the claim of an abandoned tick (aborted signal) instead of scheduling it', async () => {
		const { store, registry, timer, executor } = setup();
		const task = claimedTask();
		registry.registeredTypes.mockReturnValue(['workflow:schedule-trigger']);
		store.claimDueTasks.mockResolvedValue([task]);
		store.releaseClaim.mockResolvedValue(1);
		// The driver abandoned this tick at its timeout before the claim resolved.
		const controller = new AbortController();
		controller.abort();

		const claimed = await executor.claimAndSchedule(HOST, controller.signal);

		expect(claimed).toEqual([]);
		expect(timer.schedule).not.toHaveBeenCalled();
		expect(store.releaseClaim).toHaveBeenCalledWith({
			host: HOST,
			id: task.id,
			claimedEpoch: task.leaseEpoch,
		});
	});

	it('a failed hand-back is reported and left to the reaper, like any release failure', async () => {
		const { store, registry, hooks, executor } = setup();
		const task = claimedTask();
		registry.registeredTypes.mockReturnValue(['workflow:schedule-trigger']);
		store.claimDueTasks.mockResolvedValue([task]);
		const failure = new Error('db down');
		store.releaseClaim.mockRejectedValue(failure);
		const controller = new AbortController();
		controller.abort();

		await expect(executor.claimAndSchedule(HOST, controller.signal)).resolves.toEqual([]);
		expect(hooks.onReleaseError).toHaveBeenCalledWith(task.id, failure);
	});

	it('scheduled callback dispatches the task, and a mid-fire rejection is reported not thrown', async () => {
		const { store, registry, timer, hooks, executor } = setup();
		const task = claimedTask();
		registry.registeredTypes.mockReturnValue(['workflow:schedule-trigger']);
		registry.resolve.mockReturnValue({ execute: vi.fn() });
		store.claimDueTasks.mockResolvedValue([task]);
		// Make fire reject at its markStarted call to exercise the detached-error path.
		const failure = new Error('db down');
		store.markStarted.mockRejectedValue(failure);

		await executor.claimAndSchedule(HOST);
		const scheduledCallback = timer.schedule.mock.calls[0][1];

		// The callback detaches fire(); invoking it must not throw despite the rejection.
		expect(() => scheduledCallback()).not.toThrow();
		await new Promise((resolve) => setImmediate(resolve)); // let the detached catch run
		expect(hooks.onFireError).toHaveBeenCalledWith(task, failure);
	});
});

describe('Executor.fire', () => {
	it('does not dispatch when the row is gone or reclaimed', async () => {
		const { store, registry, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn() };
		registry.resolve.mockReturnValue(handler);
		store.markStarted.mockResolvedValue(0);

		const result = await executor.fire(HOST, claimedTask());

		expect(result).toEqual({ outcome: 'skipped-not-owned' });
		expect(handler.execute).not.toHaveBeenCalled();
		expect(store.completeTask).not.toHaveBeenCalled();
		expect(store.failTaskTerminal).not.toHaveBeenCalled();
	});

	it('dispatches and completes on handler success', async () => {
		const { store, registry, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockResolvedValue(undefined) };
		store.markStarted.mockResolvedValue(1);
		store.completeTask.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		const task = claimedTask();

		const result = await executor.fire(HOST, task);

		expect(result).toEqual({ outcome: 'completed' });
		expect(handler.execute).toHaveBeenCalledWith(task);
		expect(store.completeTask).toHaveBeenCalledWith({
			host: HOST,
			id: task.id,
			claimedEpoch: task.leaseEpoch,
		});
		expect(store.failTaskTerminal).not.toHaveBeenCalled();
		expect(store.rescheduleTask).not.toHaveBeenCalled();
	});

	it('threads the claimed lease epoch through the terminal calls for fencing', async () => {
		const { store, registry, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockResolvedValue(undefined) };
		store.markStarted.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		const task = claimedTask({ leaseEpoch: 7 });

		await executor.fire(HOST, task);

		expect(store.markStarted).toHaveBeenCalledWith({
			host: HOST,
			id: task.id,
			claimedEpoch: 7,
		});
		expect(store.completeTask).toHaveBeenCalledWith({
			host: HOST,
			id: task.id,
			claimedEpoch: 7,
		});
	});

	it('propagates when recording success fails, without treating it as a handler failure', async () => {
		const { store, registry, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockResolvedValue(undefined) };
		store.markStarted.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		store.completeTask.mockRejectedValue(new Error('db down'));
		const task = claimedTask({ attempts: 0, maxAttempts: 3 });

		await expect(executor.fire(HOST, task)).rejects.toThrow('db down');

		// A completeTask failure must not be recorded as a task failure/retry.
		expect(store.failTaskTerminal).not.toHaveBeenCalled();
		expect(store.rescheduleTask).not.toHaveBeenCalled();
	});

	it('retries with backoff for the next attempt when the handler fails and attempts remain', async () => {
		const { store, registry, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockRejectedValue(new Error('boom')) };
		store.markStarted.mockResolvedValue(1);
		store.rescheduleTask.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		const task = claimedTask({ attempts: 0, maxAttempts: 3, leaseEpoch: 7 });

		const result = await executor.fire(HOST, task);

		expect(result).toEqual({ outcome: 'rescheduled', errorMessage: 'boom' });
		// nextAttempt = 1 -> backoff(1) = 5000ms (asserted as a literal to decouple the oracle).
		expect(store.rescheduleTask).toHaveBeenCalledWith(
			{ host: HOST, id: task.id, claimedEpoch: 7 },
			5_000,
			'boom',
		);
		expect(store.failTaskTerminal).not.toHaveBeenCalled();
		expect(store.completeTask).not.toHaveBeenCalled();
	});

	it('uses the next attempt number for backoff on a middle attempt', async () => {
		const { store, registry, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockRejectedValue(new Error('boom')) };
		store.markStarted.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		const task = claimedTask({ attempts: 1, maxAttempts: 3, leaseEpoch: 7 });

		await executor.fire(HOST, task);

		// nextAttempt = 2 -> backoff(2) = 10000ms; proves it's backoff(attempts+1), not backoff(attempts).
		expect(store.rescheduleTask).toHaveBeenCalledWith(
			{ host: HOST, id: task.id, claimedEpoch: 7 },
			backoff(2),
			'boom',
		);
	});

	it('fails terminally when the handler fails on the single default attempt', async () => {
		const { store, registry, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockRejectedValue(new Error('boom')) };
		store.markStarted.mockResolvedValue(1);
		store.failTaskTerminal.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		const task = claimedTask({ attempts: 0, maxAttempts: 1, leaseEpoch: 7 });

		const result = await executor.fire(HOST, task);

		expect(result).toEqual({ outcome: 'dead-lettered', errorMessage: 'boom' });
		expect(store.failTaskTerminal).toHaveBeenCalledWith(
			{ host: HOST, id: task.id, claimedEpoch: 7 },
			'boom',
		);
		expect(store.rescheduleTask).not.toHaveBeenCalled();
		expect(store.completeTask).not.toHaveBeenCalled();
	});

	it('fails terminally on the final attempt of a multi-attempt task', async () => {
		const { store, registry, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockRejectedValue(new Error('boom')) };
		store.markStarted.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		// nextAttempt = 3 == maxAttempts -> terminal, not another retry.
		const task = claimedTask({ attempts: 2, maxAttempts: 3, leaseEpoch: 7 });

		await executor.fire(HOST, task);

		expect(store.failTaskTerminal).toHaveBeenCalledWith(
			{ host: HOST, id: task.id, claimedEpoch: 7 },
			'boom',
		);
		expect(store.rescheduleTask).not.toHaveBeenCalled();
	});

	it('releases the claim without counting an attempt when no handler resolves at fire time', async () => {
		const { store, registry, hooks, executor } = setup();
		registry.resolve.mockReturnValue(undefined);
		const task = claimedTask({ taskType: 'gone', leaseEpoch: 7 });

		const result = await executor.fire(HOST, task);

		expect(result).toEqual({ outcome: 'skipped-no-handler' });
		// Resolved before markStarted, so a task with no handler is never marked started.
		expect(store.markStarted).not.toHaveBeenCalled();
		expect(store.releaseClaim).toHaveBeenCalledWith({
			host: HOST,
			id: task.id,
			claimedEpoch: 7,
		});
		expect(store.failTaskTerminal).not.toHaveBeenCalled();
		expect(hooks.onMissingHandler).toHaveBeenCalledWith(task);
	});

	it('reports but swallows a failed release on the missing-handler path', async () => {
		const { store, registry, hooks, executor } = setup();
		registry.resolve.mockReturnValue(undefined);
		const failure = new Error('db down');
		store.releaseClaim.mockRejectedValue(failure);
		const task = claimedTask({ taskType: 'gone' });

		await expect(executor.fire(HOST, task)).resolves.toEqual({ outcome: 'skipped-no-handler' });

		expect(hooks.onReleaseError).toHaveBeenCalledWith(task.id, failure);
	});

	it('routes the fire through the tracing hook with the host and task, resolving with its result', async () => {
		const { store, registry, tracing, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockResolvedValue(undefined) };
		store.markStarted.mockResolvedValue(1);
		store.completeTask.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		const task = claimedTask();

		const result = await executor.fire(HOST, task);

		expect(tracing.fire).toHaveBeenCalledTimes(1);
		expect(tracing.fire).toHaveBeenCalledWith(HOST, task, expect.any(Function));
		expect(result).toEqual({ outcome: 'completed' });
	});

	it('lets a throw from the fire reach the tracing hook instead of turning it into an outcome', async () => {
		const { store, registry, tracing, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockResolvedValue(undefined) };
		store.markStarted.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		// Recording the outcome fails after the handler already succeeded, so there
		// is no result to return; the error must propagate as-is.
		store.completeTask.mockRejectedValue(new Error('db down'));

		await expect(executor.fire(HOST, claimedTask())).rejects.toThrow('db down');

		await expect(tracing.fire.mock.results[0].value).rejects.toThrow('db down');
	});
});

describe('Executor.fire metrics hooks', () => {
	it('calls onDispatch with the lag against the timer clock when a task fires', async () => {
		const { store, registry, timer, hooks, executor } = setup();
		store.markStarted.mockResolvedValue(1);
		store.completeTask.mockResolvedValue(1);
		registry.resolve.mockReturnValue({ execute: vi.fn().mockResolvedValue(undefined) });
		const task = claimedTask({ runAt: new Date('2026-07-01T00:00:00.000Z') });
		// Fired 3s after runAt.
		timer.now.mockReturnValue(new Date('2026-07-01T00:00:03.000Z').getTime());

		await executor.fire(HOST, task);

		expect(hooks.onDispatch).toHaveBeenCalledWith(task.taskType, 3);
		expect(hooks.onDispatch).toHaveBeenCalledTimes(1);
	});

	it('measures dispatch lag from runAt, not the fixed scheduledFor slot', async () => {
		const { store, registry, timer, hooks, executor } = setup();
		store.markStarted.mockResolvedValue(1);
		store.completeTask.mockResolvedValue(1);
		registry.resolve.mockReturnValue({ execute: vi.fn().mockResolvedValue(undefined) });
		// A retried task: runAt was pushed 60s past the original slot by backoff.
		const task = claimedTask({
			scheduledFor: new Date('2026-07-01T00:00:00.000Z'),
			runAt: new Date('2026-07-01T00:01:00.000Z'),
		});
		// Fired 2s after runAt (62s after scheduledFor); lag is measured from runAt.
		timer.now.mockReturnValue(new Date('2026-07-01T00:01:02.000Z').getTime());

		await executor.fire(HOST, task);

		expect(hooks.onDispatch).toHaveBeenCalledWith(task.taskType, 2);
	});

	it('clamps dispatch lag to zero when the timer fires before runAt', async () => {
		const { store, registry, timer, hooks, executor } = setup();
		store.markStarted.mockResolvedValue(1);
		store.completeTask.mockResolvedValue(1);
		registry.resolve.mockReturnValue({ execute: vi.fn().mockResolvedValue(undefined) });
		const task = claimedTask({ runAt: new Date('2026-07-01T00:00:05.000Z') });
		// Timer fires 1s before runAt; a negative sample must be clamped to 0.
		timer.now.mockReturnValue(new Date('2026-07-01T00:00:04.000Z').getTime());

		await executor.fire(HOST, task);

		expect(hooks.onDispatch).toHaveBeenCalledWith(task.taskType, 0);
	});

	it('calls no hooks when the row is gone or reclaimed', async () => {
		const { store, registry, hooks, executor } = setup();
		registry.resolve.mockReturnValue({ execute: vi.fn() });
		store.markStarted.mockResolvedValue(0);

		await executor.fire(HOST, claimedTask());

		expect(hooks.onDispatch).not.toHaveBeenCalled();
		expect(hooks.onFire).not.toHaveBeenCalled();
	});

	it('calls onFire with success when the handler completes', async () => {
		const { store, registry, hooks, executor } = setup();
		store.markStarted.mockResolvedValue(1);
		store.completeTask.mockResolvedValue(1);
		registry.resolve.mockReturnValue({ execute: vi.fn().mockResolvedValue(undefined) });
		const task = claimedTask();

		await executor.fire(HOST, task);

		expect(hooks.onFire).toHaveBeenCalledWith(task.taskType, 'success');
		expect(hooks.onFire).toHaveBeenCalledTimes(1);
		expect(hooks.onRetry).not.toHaveBeenCalled();
	});

	it('calls onRetry when the handler fails and attempts remain', async () => {
		const { store, registry, hooks, executor } = setup();
		store.markStarted.mockResolvedValue(1);
		store.rescheduleTask.mockResolvedValue(1);
		registry.resolve.mockReturnValue({ execute: vi.fn().mockRejectedValue(new Error('boom')) });
		const task = claimedTask({ attempts: 0, maxAttempts: 3 });

		await executor.fire(HOST, task);

		expect(hooks.onRetry).toHaveBeenCalledWith(task.taskType);
		expect(hooks.onRetry).toHaveBeenCalledTimes(1);
		expect(hooks.onFire).not.toHaveBeenCalled();
	});

	it('calls onFire with failure when the handler fails terminally', async () => {
		const { store, registry, hooks, executor } = setup();
		store.markStarted.mockResolvedValue(1);
		store.failTaskTerminal.mockResolvedValue(1);
		registry.resolve.mockReturnValue({ execute: vi.fn().mockRejectedValue(new Error('boom')) });
		const task = claimedTask({ attempts: 0, maxAttempts: 1 });

		await executor.fire(HOST, task);

		expect(hooks.onFire).toHaveBeenCalledWith(task.taskType, 'failure');
		expect(hooks.onFire).toHaveBeenCalledTimes(1);
		expect(hooks.onRetry).not.toHaveBeenCalled();
	});

	it('calls no outcome hook and reports the fire as skipped when a terminal write affects no row (reclaimed on lease overrun)', async () => {
		const { store, registry, hooks, executor } = setup();
		store.markStarted.mockResolvedValue(1);
		registry.resolve.mockReturnValue({ execute: vi.fn().mockResolvedValue(undefined) });
		// Every terminal write resolves 0: the row was reclaimed, so nothing is ours to count.
		store.completeTask.mockResolvedValue(0);
		store.failTaskTerminal.mockResolvedValue(0);
		store.rescheduleTask.mockResolvedValue(0);

		// Success path with a 0-row complete.
		const completedResult = await executor.fire(HOST, claimedTask());
		expect(completedResult).toEqual({ outcome: 'skipped-not-owned' });
		expect(hooks.onFire).not.toHaveBeenCalled();

		// Retry path with a 0-row reschedule. The handler did fail, so the result
		// keeps its error message even though the failure was not recorded.
		registry.resolve.mockReturnValue({ execute: vi.fn().mockRejectedValue(new Error('boom')) });
		const retryResult = await executor.fire(HOST, claimedTask({ attempts: 0, maxAttempts: 3 }));
		expect(retryResult).toEqual({ outcome: 'skipped-not-owned', errorMessage: 'boom' });
		expect(hooks.onRetry).not.toHaveBeenCalled();

		// Terminal-failure path with a 0-row failTaskTerminal.
		const terminalResult = await executor.fire(HOST, claimedTask({ attempts: 0, maxAttempts: 1 }));
		expect(terminalResult).toEqual({ outcome: 'skipped-not-owned', errorMessage: 'boom' });
		expect(hooks.onFire).not.toHaveBeenCalled();
	});

	it('defaults to no-op hooks and pass-through tracing when neither is supplied', async () => {
		const store = mock<ExecutorTaskStore>();
		const registry = mock<TaskHandlerRegistry>();
		const timer = mock<PrecisionTimer>();
		store.markStarted.mockResolvedValue(1);
		store.completeTask.mockResolvedValue(1);
		registry.resolve.mockReturnValue({ execute: vi.fn().mockResolvedValue(undefined) });
		// No hooks: the optional calls must not throw.
		const executor = new Executor(store, registry, timer, {
			leaseSeconds: 60,
			lookaheadSeconds: 5,
			batchSize: 100,
		});

		await expect(executor.fire(HOST, claimedTask())).resolves.toEqual({ outcome: 'completed' });
	});
});

describe('Executor.stop', () => {
	it('cancels all pending timers', async () => {
		const { timer, executor } = setup();
		await executor.stop();
		expect(timer.cancelAll).toHaveBeenCalled();
	});

	it('releases the claim for each claimed-but-unfired task', async () => {
		const { store, registry, executor } = setup();
		const a = claimedTask({ id: 'a' });
		const b = claimedTask({ id: 'b' });
		registry.registeredTypes.mockReturnValue(['workflow:schedule-trigger']);
		store.claimDueTasks.mockResolvedValue([a, b]);

		await executor.claimAndSchedule(HOST); // timer is mocked, callbacks do not auto-fire
		await executor.stop();

		expect(store.releaseClaim).toHaveBeenCalledWith({
			host: HOST,
			id: 'a',
			claimedEpoch: a.leaseEpoch,
		});
		expect(store.releaseClaim).toHaveBeenCalledWith({
			host: HOST,
			id: 'b',
			claimedEpoch: b.leaseEpoch,
		});
	});

	it('reports a claim release that fails on shutdown', async () => {
		const { store, registry, hooks, executor } = setup();
		const task = claimedTask({ id: 'a' });
		registry.registeredTypes.mockReturnValue(['workflow:schedule-trigger']);
		store.claimDueTasks.mockResolvedValue([task]);
		const failure = new Error('db down');
		store.releaseClaim.mockRejectedValue(failure);

		await executor.claimAndSchedule(HOST);
		await executor.stop();

		expect(hooks.onReleaseError).toHaveBeenCalledWith('a', failure);
	});

	it('does not release a task whose timer callback has already begun firing', async () => {
		const { store, registry, timer, executor } = setup();
		const task = claimedTask({ id: 'a' });
		registry.registeredTypes.mockReturnValue(['workflow:schedule-trigger']);
		registry.resolve.mockReturnValue({ execute: vi.fn().mockResolvedValue(undefined) });
		store.claimDueTasks.mockResolvedValue([task]);
		store.markStarted.mockResolvedValue(1); // fire proceeds and completes

		await executor.claimAndSchedule(HOST);
		// Simulate the timer firing the task before shutdown.
		const scheduledCallback = timer.schedule.mock.calls[0][1];
		scheduledCallback();
		await new Promise((resolve) => setImmediate(resolve)); // let the detached fire settle

		await executor.stop();

		// The task left the tracking map when it began firing, so stop() must not release
		// it, and a successful fire completes without releasing either.
		expect(store.releaseClaim).not.toHaveBeenCalled();
	});
});
