import { ScheduledTaskStatus } from '@n8n/constants';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { mock } from 'vitest-mock-extended';

import { SCHEDULER_ATTRIBUTES, SCHEDULER_FIRE_OUTCOME } from '../../observability/attributes';
import type { SchedulerMetrics } from '../../observability/metrics';
import { SpanStatus, type Span, type Tracer } from '../../observability/tracer';
import { InvalidLifecycleOptionsError } from '../errors';
import { createScheduler } from '../factory';
import type { SchedulerDeps, SchedulerTaskStore } from '../factory';
import { PASS_TIMED_OUT } from '../lifecycle';
import type { MaterializerTransaction, RunInTransaction } from '../materializer';
import { DEFAULT_RETENTION_OPTIONS } from '../retention';
import type { ClaimedTask, ScheduledJob } from '../types';

/**
 * A shared span (each tracing test drives a single pass, so one span suffices)
 * behind a tracer that honours the port's contract: a throw from `run` marks the
 * span errored and propagates, exactly as the concrete (Sentry) tracer does. This
 * matters for the materializer, whose abort path throws rather than returning.
 */
const makeTracer = () => {
	const span: Span = { setAttribute: vi.fn(), setStatus: vi.fn() };
	const tracer = mock<Tracer>();
	tracer.startSpan.mockImplementation(async (_options, run) => {
		try {
			return await run(span);
		} catch (error) {
			span.setStatus({ code: SpanStatus.error, message: ensureError(error).message });
			throw error;
		}
	});
	return { span, tracer };
};

/** Compose a scheduler over mocks, with non-default retention windows. */
function makeScheduler(deps: Partial<SchedulerDeps> = {}) {
	const taskStore = mock<SchedulerTaskStore>();
	const onEvent = vi.fn();
	const materializerTransaction: RunInTransaction = vi.fn();
	const scheduler = createScheduler({
		hostId: 'main-test',
		materializerTransaction,
		taskStore,
		retention: { retentionSeconds: 43_200, failedRetentionSeconds: 86_400 },
		onEvent,
		...deps,
	});
	return { scheduler, taskStore, onEvent };
}

describe('createScheduler prune', () => {
	it('maps the configured windows into the batches the store receives', async () => {
		const { scheduler, taskStore } = makeScheduler();
		taskStore.deleteFinishedOlderThan.mockResolvedValue(0);

		const summary = await scheduler.prune();

		expect(summary).toEqual({ deleted: 0, drained: true });
		expect(taskStore.deleteFinishedOlderThan).toHaveBeenNthCalledWith(1, {
			statuses: [ScheduledTaskStatus.Succeeded, ScheduledTaskStatus.Cancelled],
			olderThanMs: 43_200_000,
			limit: DEFAULT_RETENTION_OPTIONS.batchSize,
		});
		expect(taskStore.deleteFinishedOlderThan).toHaveBeenNthCalledWith(2, {
			statuses: [ScheduledTaskStatus.Failed, ScheduledTaskStatus.Missed],
			olderThanMs: 86_400_000,
			limit: DEFAULT_RETENTION_OPTIONS.batchSize,
		});
	});

	it('emits a warn event when a pass spends its batch budget with backlog remaining', async () => {
		const { scheduler, taskStore, onEvent } = makeScheduler();
		// Every batch full: the pass can never prove either window drained.
		taskStore.deleteFinishedOlderThan.mockResolvedValue(DEFAULT_RETENTION_OPTIONS.batchSize);

		const summary = await scheduler.prune();

		expect(summary.drained).toBe(false);
		expect(onEvent).toHaveBeenCalledWith({
			level: 'warn',
			message: 'Scheduler retention pass hit its batch budget; backlog remains',
			context: { ...summary },
		});
		expect(onEvent).not.toHaveBeenCalledWith(expect.objectContaining({ level: 'debug' }));
	});

	it('reports a drained pass that deleted rows at debug only', async () => {
		const { scheduler, taskStore, onEvent } = makeScheduler();
		taskStore.deleteFinishedOlderThan.mockResolvedValueOnce(5).mockResolvedValue(0);

		const summary = await scheduler.prune();

		expect(summary).toEqual({ deleted: 5, drained: true });
		expect(onEvent).toHaveBeenCalledWith({
			level: 'debug',
			message: 'Scheduler retention deleted finished tasks',
			context: { ...summary },
		});
		expect(onEvent).not.toHaveBeenCalledWith(expect.objectContaining({ level: 'warn' }));
	});

	it('emits nothing on a no-op pass', async () => {
		const { scheduler, taskStore, onEvent } = makeScheduler();
		taskStore.deleteFinishedOlderThan.mockResolvedValue(0);

		await scheduler.prune();

		expect(onEvent).not.toHaveBeenCalled();
	});
});

describe('createScheduler event sink', () => {
	it('completes a pass even when the onEvent sink throws', async () => {
		const { scheduler, taskStore } = makeScheduler({
			onEvent: () => {
				throw new Error('logger down');
			},
		});
		// Every batch full: the pass emits its backlog warning through the sink.
		taskStore.deleteFinishedOlderThan.mockResolvedValue(DEFAULT_RETENTION_OPTIONS.batchSize);

		const summary = await scheduler.prune();

		expect(summary.drained).toBe(false);
	});
});

describe('createScheduler tuning defaults', () => {
	it('treats an explicitly-undefined override as absent instead of clobbering the default', () => {
		// With a plain spread merge, `retentionSeconds: undefined` would erase the
		// default (1 day) and the misconfiguration comparison would go silent.
		const { onEvent } = makeScheduler({
			retention: { retentionSeconds: undefined, failedRetentionSeconds: 3600 },
		});

		expect(onEvent).toHaveBeenCalledWith({
			level: 'warn',
			message:
				'Scheduler retention keeps failed runs shorter than succeeded ones; failure evidence will be deleted first',
			context: { retentionSeconds: 86_400, failedRetentionSeconds: 3600 },
		});
	});
});

describe('createScheduler retention config', () => {
	it('emits a warn event at composition when failed runs are kept shorter than clean ones', () => {
		const { onEvent } = makeScheduler({
			retention: { retentionSeconds: 86_400, failedRetentionSeconds: 3600 },
		});

		expect(onEvent).toHaveBeenCalledWith({
			level: 'warn',
			message:
				'Scheduler retention keeps failed runs shorter than succeeded ones; failure evidence will be deleted first',
			context: { retentionSeconds: 86_400, failedRetentionSeconds: 3600 },
		});
	});

	it('stays silent when failed runs are kept at least as long', () => {
		const { onEvent } = makeScheduler();

		expect(onEvent).not.toHaveBeenCalled();
	});
});

describe('createScheduler executor config', () => {
	it('emits a warn event at composition when the lookahead reaches into the lease', () => {
		const { onEvent } = makeScheduler({
			executor: { leaseSeconds: 60, lookaheadSeconds: 60 },
		});

		expect(onEvent).toHaveBeenCalledWith({
			level: 'warn',
			message:
				'Scheduler executor lookahead reaches or exceeds the lease; claimed tasks may lose their lease before firing',
			context: { lookaheadMs: 60_000, leaseMs: 60_000 },
		});
	});
});

/** A task claimed for this host whose `runAt` has passed, so it fires on the next tick. */
const claimedTask = (overrides: Partial<ClaimedTask> = {}): ClaimedTask => ({
	id: '1',
	jobId: 10,
	taskType: 'test-task',
	payload: {},
	scheduledFor: new Date('2026-01-01T00:00:00.000Z'),
	runAt: new Date('2026-01-01T00:00:00.000Z'),
	status: ScheduledTaskStatus.Running,
	attempts: 0,
	maxAttempts: 3,
	leaseEpoch: 1,
	...overrides,
});

describe('createScheduler execute', () => {
	it('claims nothing while no handler is registered, then scopes the claim to registered types', async () => {
		const { scheduler, taskStore } = makeScheduler();
		taskStore.claimDueTasks.mockResolvedValue([]);

		expect(await scheduler.execute()).toEqual([]);
		expect(taskStore.claimDueTasks).not.toHaveBeenCalled();

		scheduler.registerTaskHandler('test-task', { execute: vi.fn() });
		await scheduler.execute();

		expect(taskStore.claimDueTasks).toHaveBeenCalledWith(
			expect.objectContaining({ host: 'main-test', taskTypes: ['test-task'] }),
		);
	});

	it('releases a claim whose handler is gone at fire time and reports it as a warn event', async () => {
		const { scheduler, taskStore, onEvent } = makeScheduler();
		scheduler.registerTaskHandler('test-task', { execute: vi.fn() });
		// Claimed under a type no longer registered (e.g. deregistered by a rolling restart).
		taskStore.claimDueTasks.mockResolvedValue([claimedTask({ taskType: 'gone-task' })]);
		taskStore.releaseClaim.mockResolvedValue(1);

		await scheduler.execute();

		// The fire is detached from the claim: wait for the timer to deliver it.
		await vi.waitFor(() => {
			expect(onEvent).toHaveBeenCalledWith({
				level: 'warn',
				message: 'Scheduler claimed a task with no registered handler; claim released',
				context: { taskId: '1', taskType: 'gone-task' },
			});
		});
		expect(taskStore.releaseClaim).toHaveBeenCalledWith({
			host: 'main-test',
			id: '1',
			claimedEpoch: 1,
		});
		expect(taskStore.markStarted).not.toHaveBeenCalled();
	});

	it('routes a mid-fire failure to an error event and leaves the row to the reaper', async () => {
		const { scheduler, taskStore, onEvent } = makeScheduler();
		scheduler.registerTaskHandler('test-task', { execute: vi.fn() });
		taskStore.claimDueTasks.mockResolvedValue([claimedTask()]);
		// The outcome write fails outside the handler-failure path.
		taskStore.markStarted.mockRejectedValue(new Error('db down'));

		await scheduler.execute();

		await vi.waitFor(() => {
			expect(onEvent).toHaveBeenCalledWith({
				level: 'error',
				message: 'Scheduler could not record a task outcome; left for the reaper',
				context: { taskId: '1', error: 'db down' },
			});
		});
	});

	it('routes a failed claim release to an error event', async () => {
		const { scheduler, taskStore, onEvent } = makeScheduler();
		scheduler.registerTaskHandler('test-task', { execute: vi.fn() });
		taskStore.claimDueTasks.mockResolvedValue([claimedTask({ taskType: 'gone-task' })]);
		taskStore.releaseClaim.mockRejectedValue(new Error('db down'));

		await scheduler.execute();

		await vi.waitFor(() => {
			expect(onEvent).toHaveBeenCalledWith({
				level: 'error',
				message: 'Scheduler failed to release a claimed task; left for the reaper',
				context: { taskId: '1', error: 'db down' },
			});
		});
	});
});

describe('createScheduler materialize', () => {
	it('routes a job that cannot be planned to an error event and defers it', async () => {
		// A cron job missing its expression (a corrupt row): planning throws for it.
		const corrupt: ScheduledJob = {
			id: 7,
			taskType: 'test-task',
			payload: {},
			kind: 'cron',
			cronExpression: null,
			timezone: null,
			intervalSeconds: null,
			fireAt: null,
			recurrenceUnit: null,
			recurrenceSize: null,
			nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
			lastFiredAt: null,
			maxAttempts: 3,
		};
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue({
			now: new Date('2026-01-01T00:00:00.000Z'),
			jobs: [corrupt],
		});
		tx.recordOccurrences.mockResolvedValue({ recorded: 0, created: [] });
		const materializerTransaction: RunInTransaction = async (work) => await work(tx);
		const { scheduler, onEvent } = makeScheduler({ materializerTransaction });

		const summary = await scheduler.materialize();

		expect(summary).toEqual({ claimedJobs: 1, occurrences: 0, created: [], deferredJobs: 1 });
		expect(onEvent).toHaveBeenCalledWith({
			level: 'error',
			message: 'Scheduler could not plan a job schedule; deferred for retry',
			context: { jobId: 7, error: "scheduled_job 7 of kind 'cron' is missing 'cronExpression'" },
		});
	});

	it('routes skipped duplicate occurrences to a debug event', async () => {
		const due: ScheduledJob = {
			id: 7,
			taskType: 'test-task',
			payload: {},
			kind: 'interval',
			cronExpression: null,
			timezone: null,
			intervalSeconds: 10,
			fireAt: null,
			recurrenceUnit: null,
			recurrenceSize: null,
			nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
			lastFiredAt: null,
			maxAttempts: 3,
		};
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue({
			now: new Date('2026-01-01T00:00:00.000Z'),
			jobs: [due],
		});
		// The one planned occurrence already exists (recorded by a concurrent pass).
		tx.recordOccurrences.mockResolvedValue({ recorded: 0, created: [] });
		const materializerTransaction: RunInTransaction = async (work) => await work(tx);
		// windowSeconds: 0 keeps the plan to the single due fire.
		const { scheduler, onEvent } = makeScheduler({
			materializerTransaction,
			materializer: { windowSeconds: 0 },
		});

		await scheduler.materialize();

		expect(onEvent).toHaveBeenCalledWith({
			level: 'debug',
			message: 'Scheduler materializer skipped occurrences that were already recorded',
			context: { planned: 1, recorded: 0 },
		});
	});
});

describe('createScheduler lifecycle', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// Midpoint random: first ticks at half the interval, no per-tick jitter.
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('start drives each pass on its cadence and a failing pass is reported and retried', async () => {
		const { scheduler, taskStore, onEvent } = makeScheduler();
		taskStore.findExpiredLeases.mockRejectedValue(new Error('db down'));

		scheduler.start();
		// Half the reaper's 30s default interval: its first, failing sweep.
		await vi.advanceTimersByTimeAsync(15_000);
		expect(taskStore.findExpiredLeases).toHaveBeenCalledTimes(1);
		expect(onEvent).toHaveBeenCalledWith({
			level: 'error',
			message: 'Scheduler pass failed; retrying on its next tick',
			context: { pass: 'reaper', error: 'db down' },
		});

		// One full interval later the loop survived the failure and swept again.
		await vi.advanceTimersByTimeAsync(30_000);
		expect(taskStore.findExpiredLeases).toHaveBeenCalledTimes(2);

		await scheduler.stop();
	});

	it('start runs the materializer sweep through the bound transaction', async () => {
		const materializerTransaction = vi.fn();
		const { scheduler } = makeScheduler({ materializerTransaction });

		scheduler.start();
		// Half the sweep's 10s default interval: its first pass.
		await vi.advanceTimersByTimeAsync(5000);

		expect(materializerTransaction).toHaveBeenCalledTimes(1);

		await scheduler.stop();
	});

	it('stop halts every loop', async () => {
		const materializerTransaction = vi.fn();
		const { scheduler, taskStore } = makeScheduler({ materializerTransaction });
		taskStore.findExpiredLeases.mockResolvedValue([]);
		taskStore.deleteFinishedOlderThan.mockResolvedValue(0);

		scheduler.start();
		await vi.advanceTimersByTimeAsync(15_000);
		const sweeps = materializerTransaction.mock.calls.length;
		expect(sweeps).toBeGreaterThan(0);
		expect(taskStore.findExpiredLeases).toHaveBeenCalledTimes(1);

		await scheduler.stop();
		await vi.advanceTimersByTimeAsync(60 * 60_000);

		expect(materializerTransaction).toHaveBeenCalledTimes(sweeps);
		expect(taskStore.findExpiredLeases).toHaveBeenCalledTimes(1);
		expect(taskStore.deleteFinishedOlderThan).not.toHaveBeenCalled();
	});

	it('honours the configured cadences', async () => {
		const { scheduler, taskStore } = makeScheduler({
			lifecycle: { reaperIntervalSeconds: 2 },
		});
		taskStore.findExpiredLeases.mockResolvedValue([]);

		scheduler.start();
		await vi.advanceTimersByTimeAsync(1000);
		expect(taskStore.findExpiredLeases).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(2000);
		expect(taskStore.findExpiredLeases).toHaveBeenCalledTimes(2);

		await scheduler.stop();
	});

	it('reports start as an info milestone and starts the loops only once', () => {
		const { scheduler, onEvent } = makeScheduler();

		scheduler.start();
		scheduler.start();

		// A second start is a no-op: the milestone fires once.
		expect(onEvent).toHaveBeenCalledWith({
			level: 'info',
			message: 'Scheduler started',
			context: { hostId: 'main-test' },
		});
		expect(onEvent).toHaveBeenCalledTimes(1);
	});

	it('reports stop as an info milestone', async () => {
		const { scheduler, onEvent } = makeScheduler();

		scheduler.start();
		await scheduler.stop();

		expect(onEvent).toHaveBeenCalledWith({
			level: 'info',
			message: 'Scheduler stopped',
			context: { hostId: 'main-test' },
		});
	});

	it('stop is safe without start and reports nothing', async () => {
		const { scheduler, onEvent } = makeScheduler();

		await expect(scheduler.stop()).resolves.toBeUndefined();
		expect(onEvent).not.toHaveBeenCalled();
	});

	it('stop releases claims and cancels fire timers even when start was never called', async () => {
		const { scheduler, taskStore } = makeScheduler();
		scheduler.registerTaskHandler('test-task', { execute: vi.fn() });
		// A single-pass driver claims a task due beyond stop: its fire timer is armed.
		taskStore.claimDueTasks.mockResolvedValue([
			claimedTask({ runAt: new Date(Date.now() + 60_000) }),
		]);
		taskStore.releaseClaim.mockResolvedValue(1);

		await scheduler.execute();
		await scheduler.stop();

		expect(taskStore.releaseClaim).toHaveBeenCalledWith({
			host: 'main-test',
			id: '1',
			claimedEpoch: 1,
		});
	});

	it('a stopped scheduler cannot be started again and reports no false milestone', async () => {
		const { scheduler, taskStore, onEvent } = makeScheduler();
		taskStore.findExpiredLeases.mockResolvedValue([]);
		taskStore.deleteFinishedOlderThan.mockResolvedValue(0);

		scheduler.start();
		await scheduler.stop();
		onEvent.mockClear();

		scheduler.start();

		// The loops are one-shot; a restart claim over dead loops would be a lie.
		expect(onEvent).not.toHaveBeenCalled();
	});
});

describe('createScheduler lifecycle config', () => {
	it('rejects a jitter ratio that would allow a zero or negative delay', () => {
		expect(() => makeScheduler({ lifecycle: { jitterRatio: 1 } })).toThrow(
			InvalidLifecycleOptionsError,
		);
		expect(() => makeScheduler({ lifecycle: { jitterRatio: -0.1 } })).toThrow(
			InvalidLifecycleOptionsError,
		);
		expect(() => makeScheduler({ lifecycle: { jitterRatio: NaN } })).toThrow(
			InvalidLifecycleOptionsError,
		);
	});

	it('rejects a pass interval that would collapse the loop into a hot retry', () => {
		expect(() => makeScheduler({ lifecycle: { materializerIntervalSeconds: 0 } })).toThrow(
			InvalidLifecycleOptionsError,
		);
		expect(() => makeScheduler({ lifecycle: { executorIntervalSeconds: -5 } })).toThrow(
			InvalidLifecycleOptionsError,
		);
		expect(() => makeScheduler({ lifecycle: { reaperIntervalSeconds: NaN } })).toThrow(
			InvalidLifecycleOptionsError,
		);
		expect(() => makeScheduler({ lifecycle: { retentionIntervalSeconds: Infinity } })).toThrow(
			InvalidLifecycleOptionsError,
		);
	});

	it('rejects a pass timeout that would abandon every pass as it starts', () => {
		expect(() => makeScheduler({ lifecycle: { materializerTimeoutSeconds: 0 } })).toThrow(
			InvalidLifecycleOptionsError,
		);
		expect(() => makeScheduler({ lifecycle: { executorTimeoutSeconds: -5 } })).toThrow(
			InvalidLifecycleOptionsError,
		);
		expect(() => makeScheduler({ lifecycle: { reaperTimeoutSeconds: NaN } })).toThrow(
			InvalidLifecycleOptionsError,
		);
		expect(() => makeScheduler({ lifecycle: { retentionTimeoutSeconds: Infinity } })).toThrow(
			InvalidLifecycleOptionsError,
		);
	});

	it('rejects an unknown concurrency mode', () => {
		expect(() =>
			makeScheduler({ lifecycle: { concurrencyMode: 'parallel' as 'concurrent' } }),
		).toThrow(InvalidLifecycleOptionsError);
	});

	it('rejects a concurrency ceiling below one pass', () => {
		expect(() => makeScheduler({ lifecycle: { maxConcurrentPasses: 0 } })).toThrow(
			InvalidLifecycleOptionsError,
		);
		expect(() => makeScheduler({ lifecycle: { maxConcurrentPasses: 2.5 } })).toThrow(
			InvalidLifecycleOptionsError,
		);
	});
});

describe('createScheduler pass timeout and overlap', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// Midpoint random: first ticks at half the interval, no per-tick jitter.
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('abandons a pass at its configured timeout and reports it as an error event', async () => {
		const { scheduler, taskStore, onEvent } = makeScheduler({
			lifecycle: { reaperIntervalSeconds: 10, reaperTimeoutSeconds: 2 },
		});
		// The sweep hangs on its first storage read.
		taskStore.findExpiredLeases.mockImplementation(async () => await new Promise(() => {}));

		scheduler.start();
		await vi.advanceTimersByTimeAsync(5000);
		expect(taskStore.findExpiredLeases).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(2000);
		expect(onEvent).toHaveBeenCalledWith({
			level: 'error',
			message: 'Scheduler pass timed out and was abandoned; retrying on its next tick',
			context: { pass: 'reaper', timeoutMs: 2000 },
		});

		// The abandoned pass freed its slot: the next tick sweeps again.
		await vi.advanceTimersByTimeAsync(8000);
		expect(taskStore.findExpiredLeases).toHaveBeenCalledTimes(2);

		const stopping = scheduler.stop();
		await vi.advanceTimersByTimeAsync(2000);
		await stopping;
	});

	it('stop aborts an in-flight pass at its next checkpoint, without reporting a failure', async () => {
		// The materializer's claim hangs across the shutdown.
		let resolveClaim!: (claimed: { now: Date; jobs: ScheduledJob[] }) => void;
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockImplementation(
			async () =>
				await new Promise((resolve) => {
					resolveClaim = resolve;
				}),
		);
		const materializerTransaction: RunInTransaction = async (work) => await work(tx);
		const { scheduler, onEvent } = makeScheduler({ materializerTransaction });

		scheduler.start();
		await vi.advanceTimersByTimeAsync(5000);
		expect(tx.claimDueJobs).toHaveBeenCalledTimes(1);

		// stop aborts the pass; when its claim resolves, the abort checkpoint
		// throws inside the transaction (rolling it back) and stop completes.
		const stopping = scheduler.stop();
		resolveClaim({ now: new Date('2026-01-01T00:00:00.000Z'), jobs: [] });
		await stopping;

		expect(tx.recordOccurrences).not.toHaveBeenCalled();
		expect(onEvent).not.toHaveBeenCalledWith(expect.objectContaining({ level: 'error' }));
	});

	it('hands back an executor claim that resolves after its pass was abandoned', async () => {
		const { scheduler, taskStore, onEvent } = makeScheduler({
			lifecycle: { executorIntervalSeconds: 10, executorTimeoutSeconds: 2 },
		});
		scheduler.registerTaskHandler('test-task', { execute: vi.fn() });
		// The claim hangs (slow storage) past the pass timeout.
		let resolveClaim!: (tasks: ClaimedTask[]) => void;
		taskStore.claimDueTasks.mockImplementation(
			async () =>
				await new Promise<ClaimedTask[]>((resolve) => {
					resolveClaim = resolve;
				}),
		);
		taskStore.releaseClaim.mockResolvedValue(1);

		scheduler.start();
		await vi.advanceTimersByTimeAsync(5000);
		expect(taskStore.claimDueTasks).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(2000);
		expect(onEvent).toHaveBeenCalledWith({
			level: 'error',
			message: 'Scheduler pass timed out and was abandoned; retrying on its next tick',
			context: { pass: 'executor', timeoutMs: 2000 },
		});

		// The abandoned tick's claim finally resolves, with a task due a minute out.
		// Scheduling it would arm a fire timer no teardown tracks; it must be
		// handed back instead.
		resolveClaim([claimedTask({ runAt: new Date(Date.now() + 60_000) })]);
		await vi.advanceTimersByTimeAsync(0);

		expect(taskStore.releaseClaim).toHaveBeenCalledWith({
			host: 'main-test',
			id: '1',
			claimedEpoch: 1,
		});
		expect(taskStore.markStarted).not.toHaveBeenCalled();

		await scheduler.stop();
	});

	it('gives each pass type its own timeout', async () => {
		// Both passes hang on storage; only their timeouts differ.
		const materializerTransaction: RunInTransaction = vi.fn(
			async () => await new Promise<never>(() => {}),
		);
		const { scheduler, taskStore, onEvent } = makeScheduler({
			materializerTransaction,
			lifecycle: {
				materializerIntervalSeconds: 10,
				materializerTimeoutSeconds: 2,
				reaperIntervalSeconds: 10,
				reaperTimeoutSeconds: 60,
			},
		});
		taskStore.findExpiredLeases.mockImplementation(async () => await new Promise(() => {}));

		scheduler.start();
		// Both first ticks fire at 5000; only the materializer's 2s budget elapses.
		await vi.advanceTimersByTimeAsync(5000 + 2000);
		expect(onEvent).toHaveBeenCalledWith({
			level: 'error',
			message: 'Scheduler pass timed out and was abandoned; retrying on its next tick',
			context: { pass: 'materializer', timeoutMs: 2000 },
		});
		expect(onEvent).not.toHaveBeenCalledWith({
			level: 'error',
			message: 'Scheduler pass timed out and was abandoned; retrying on its next tick',
			context: { pass: 'reaper', timeoutMs: 60_000 },
		});

		// The reaper's own budget only elapses at 65000, during the stop drain.
		const stopping = scheduler.stop();
		await vi.advanceTimersByTimeAsync(60_000);
		await stopping;
		expect(onEvent).toHaveBeenCalledWith({
			level: 'error',
			message: 'Scheduler pass timed out and was abandoned; retrying on its next tick',
			context: { pass: 'reaper', timeoutMs: 60_000 },
		});
	});

	it('drops an overlapping tick in sequential mode and reports it as a warn event', async () => {
		const { scheduler, taskStore, onEvent } = makeScheduler({
			lifecycle: { reaperIntervalSeconds: 10, reaperTimeoutSeconds: 60 },
		});
		taskStore.findExpiredLeases.mockImplementation(async () => await new Promise(() => {}));

		scheduler.start();
		// First sweep at 5000 hangs; the 15000 tick finds it still in flight.
		await vi.advanceTimersByTimeAsync(15_000);
		expect(taskStore.findExpiredLeases).toHaveBeenCalledTimes(1);
		expect(onEvent).toHaveBeenCalledWith({
			level: 'warn',
			message: 'Scheduler pass tick dropped; in-flight passes at the concurrency limit',
			context: { pass: 'reaper', inFlight: 1, limit: 1 },
		});

		const stopping = scheduler.stop();
		await vi.advanceTimersByTimeAsync(60_000);
		await stopping;
	});

	it('lets passes overlap up to the ceiling in concurrent mode', async () => {
		const { scheduler, taskStore, onEvent } = makeScheduler({
			lifecycle: {
				reaperIntervalSeconds: 10,
				reaperTimeoutSeconds: 60,
				concurrencyMode: 'concurrent',
				maxConcurrentPasses: 2,
			},
		});
		taskStore.findExpiredLeases.mockImplementation(async () => await new Promise(() => {}));

		scheduler.start();
		// Sweeps at 5000 and 15000 overlap; the 25000 tick exceeds the ceiling.
		await vi.advanceTimersByTimeAsync(25_000);
		expect(taskStore.findExpiredLeases).toHaveBeenCalledTimes(2);
		expect(onEvent).toHaveBeenCalledWith({
			level: 'warn',
			message: 'Scheduler pass tick dropped; in-flight passes at the concurrency limit',
			context: { pass: 'reaper', inFlight: 2, limit: 2 },
		});

		const stopping = scheduler.stop();
		await vi.advanceTimersByTimeAsync(60_000);
		await stopping;
	});
});

describe('createScheduler reap', () => {
	it('routes a row recovery failure to an error event and finishes the sweep', async () => {
		const { scheduler, taskStore, onEvent } = makeScheduler();
		taskStore.findExpiredLeases.mockResolvedValue([
			{ id: '7', attempts: 0, maxAttempts: 3, leaseEpoch: 1 },
		]);
		taskStore.reclaimExpired.mockRejectedValue(new Error('deadlock'));

		const result = await scheduler.reap();

		expect(result).toEqual({ reclaimed: 0, deadLettered: 0 });
		expect(onEvent).toHaveBeenCalledWith({
			level: 'error',
			message: 'Scheduler could not recover an expired task; skipped until the next sweep',
			context: { taskId: '7', error: 'deadlock' },
		});
	});

	it('routes a dead-lettered task to a warn event carrying the task identity', async () => {
		const { scheduler, taskStore, onEvent } = makeScheduler();
		taskStore.findExpiredLeases.mockResolvedValue([
			{ id: '7', attempts: 2, maxAttempts: 3, leaseEpoch: 1 },
		]);
		taskStore.deadLetterExpired.mockResolvedValue(1);

		const result = await scheduler.reap();

		expect(result).toEqual({ reclaimed: 0, deadLettered: 1 });
		expect(onEvent).toHaveBeenCalledWith({
			level: 'warn',
			message: 'Scheduler dead-lettered a task; its last attempt lost its lease',
			context: { taskId: '7', attempts: 3, maxAttempts: 3 },
		});
	});
});

describe('createScheduler tracing', () => {
	it('opens a materialize span carrying the summary counts, with ok status', async () => {
		const due: ScheduledJob = {
			id: 7,
			taskType: 'test-task',
			payload: {},
			kind: 'interval',
			cronExpression: null,
			timezone: null,
			intervalSeconds: 10,
			fireAt: null,
			recurrenceUnit: null,
			recurrenceSize: null,
			nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
			lastFiredAt: null,
			maxAttempts: 3,
		};
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue({ now: new Date('2026-01-01T00:00:00.000Z'), jobs: [due] });
		// Distinct counts (claimed 1, occurrences 2, deferred 0) so that recording a
		// count under the wrong attribute key cannot slip past these assertions.
		tx.recordOccurrences.mockResolvedValue({ recorded: 2, created: [] });
		const materializerTransaction: RunInTransaction = async (work) => await work(tx);
		const { span, tracer } = makeTracer();
		const { scheduler } = makeScheduler({
			materializerTransaction,
			materializer: { windowSeconds: 0 },
			tracer,
		});

		const summary = await scheduler.materialize();

		expect(summary).toEqual({ claimedJobs: 1, occurrences: 2, created: [], deferredJobs: 0 });
		expect(tracer.startSpan).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Scheduler materialize', op: 'scheduler.materialize' }),
			expect.any(Function),
		);
		expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.claimedJobs, 1);
		expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.occurrences, 2);
		expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.deferredJobs, 0);
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('emits one creation span per newly recorded row', async () => {
		const due: ScheduledJob = {
			id: 7,
			taskType: 'test-task',
			payload: {},
			kind: 'interval',
			cronExpression: null,
			timezone: null,
			intervalSeconds: 10,
			fireAt: null,
			recurrenceUnit: null,
			recurrenceSize: null,
			nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
			lastFiredAt: null,
			maxAttempts: 3,
		};
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue({ now: new Date('2026-01-01T00:00:00.000Z'), jobs: [due] });
		tx.recordOccurrences.mockResolvedValue({
			recorded: 1,
			created: [{ id: '99', jobId: 7, taskType: 'test-task' }],
		});
		const materializerTransaction: RunInTransaction = async (work) => await work(tx);
		const { tracer } = makeTracer();
		const { scheduler } = makeScheduler({
			materializerTransaction,
			materializer: { windowSeconds: 0 },
			tracer,
		});

		await scheduler.materialize();

		expect(tracer.startSpan).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Scheduler task created',
				op: 'scheduler.task.create',
				attributes: {
					[SCHEDULER_ATTRIBUTES.taskId]: '99',
					[SCHEDULER_ATTRIBUTES.jobId]: 7,
					[SCHEDULER_ATTRIBUTES.taskType]: 'test-task',
				},
			}),
			expect.any(Function),
		);
	});

	it('opens a claim span carrying the claimed count and host, with ok status', async () => {
		const { span, tracer } = makeTracer();
		const { scheduler, taskStore } = makeScheduler({ tracer });
		scheduler.registerTaskHandler('test-task', { execute: vi.fn() });
		taskStore.claimDueTasks.mockResolvedValue([claimedTask()]);

		const tasks = await scheduler.execute();

		expect(tracer.startSpan).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Scheduler claim',
				op: 'scheduler.claim',
				attributes: { [SCHEDULER_ATTRIBUTES.host]: 'main-test' },
			}),
			expect.any(Function),
		);
		expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.claimedCount, tasks.length);
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('wraps a detached fire in a fire span with a nested handoff span around the handler', async () => {
		// A span per `op`, so the claim, fire and handoff spans record to separate
		// spies and their statuses can be told apart.
		const spans = new Map<string, Span>();
		const spanFor = (op: string): Span => {
			let span = spans.get(op);
			if (span === undefined) {
				span = { setAttribute: vi.fn(), setStatus: vi.fn() };
				spans.set(op, span);
			}
			return span;
		};
		const tracer = mock<Tracer>();
		tracer.startSpan.mockImplementation(async (options, run) => {
			const span = spanFor(options.op ?? options.name);
			try {
				return await run(span);
			} catch (error) {
				span.setStatus({ code: SpanStatus.error, message: ensureError(error).message });
				throw error;
			}
		});
		const { scheduler, taskStore } = makeScheduler({ tracer });
		scheduler.registerTaskHandler('test-task', { execute: vi.fn().mockResolvedValue(undefined) });
		taskStore.claimDueTasks.mockResolvedValue([claimedTask()]);
		taskStore.markStarted.mockResolvedValue(1);
		taskStore.completeTask.mockResolvedValue(1);

		await scheduler.execute();

		// The fire is detached from the claim: wait for the timer to deliver it.
		await vi.waitFor(() => {
			expect(spanFor('scheduler.fire').setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
		});
		expect(tracer.startSpan).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Scheduler fire', op: 'scheduler.fire' }),
			expect.any(Function),
		);
		expect(spanFor('scheduler.fire').setAttribute).toHaveBeenCalledWith(
			SCHEDULER_ATTRIBUTES.outcome,
			SCHEDULER_FIRE_OUTCOME.completed,
		);
		expect(tracer.startSpan).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Scheduler handoff', op: 'scheduler.handoff' }),
			expect.any(Function),
		);
		expect(spanFor('scheduler.handoff').setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('opens a reap span carrying the reclaimed and dead-lettered counts, with ok status', async () => {
		const { span, tracer } = makeTracer();
		const { scheduler, taskStore } = makeScheduler({ tracer });
		// Distinct counts (reclaimed 2, dead-lettered 1) so recording a count under
		// the wrong attribute key cannot slip past these assertions: two leases with
		// attempts left are reclaimed, one out of attempts is dead-lettered.
		taskStore.findExpiredLeases.mockResolvedValue([
			{ id: '7', attempts: 0, maxAttempts: 3, leaseEpoch: 1 },
			{ id: '8', attempts: 0, maxAttempts: 3, leaseEpoch: 1 },
			{ id: '9', attempts: 2, maxAttempts: 3, leaseEpoch: 1 },
		]);
		taskStore.reclaimExpired.mockResolvedValue(1);
		taskStore.deadLetterExpired.mockResolvedValue(1);

		const result = await scheduler.reap();

		expect(result).toEqual({ reclaimed: 2, deadLettered: 1 });
		expect(tracer.startSpan).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Scheduler reap', op: 'scheduler.reap' }),
			expect.any(Function),
		);
		expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.reclaimed, 2);
		expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.deadLettered, 1);
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('opens a retention span carrying the deleted count and drained flag, with ok status', async () => {
		const { span, tracer } = makeTracer();
		const { scheduler, taskStore } = makeScheduler({ tracer });
		taskStore.deleteFinishedOlderThan.mockResolvedValueOnce(5).mockResolvedValue(0);

		const summary = await scheduler.prune();

		expect(tracer.startSpan).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Scheduler retention', op: 'scheduler.retention' }),
			expect.any(Function),
		);
		expect(span.setAttribute).toHaveBeenCalledWith(
			SCHEDULER_ATTRIBUTES.retentionDeleted,
			summary.deleted,
		);
		expect(span.setAttribute).toHaveBeenCalledWith(
			SCHEDULER_ATTRIBUTES.retentionDrained,
			summary.drained,
		);
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('records error on the claim span when the executor pass is abandoned by its loop timeout', async () => {
		const { span, tracer } = makeTracer();
		const { scheduler, taskStore } = makeScheduler({ tracer });
		taskStore.claimDueTasks.mockResolvedValue([]);
		const controller = new AbortController();
		controller.abort(PASS_TIMED_OUT);

		await scheduler.execute(controller.signal);

		expect(span.setStatus).toHaveBeenCalledWith({
			code: SpanStatus.error,
			message: 'Scheduler pass timed out',
		});
		expect(span.setStatus).not.toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('records error on the reap span when the reaper pass is abandoned by its loop timeout', async () => {
		const { span, tracer } = makeTracer();
		const { scheduler, taskStore } = makeScheduler({ tracer });
		taskStore.findExpiredLeases.mockResolvedValue([]);
		const controller = new AbortController();
		controller.abort(PASS_TIMED_OUT);

		await scheduler.reap(controller.signal);

		expect(span.setStatus).toHaveBeenCalledWith({
			code: SpanStatus.error,
			message: 'Scheduler pass timed out',
		});
		expect(span.setStatus).not.toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('records error on the retention span when the retention pass is abandoned by its loop timeout', async () => {
		const { span, tracer } = makeTracer();
		const { scheduler } = makeScheduler({ tracer });
		const controller = new AbortController();
		controller.abort(PASS_TIMED_OUT);

		await scheduler.prune(controller.signal);

		expect(span.setStatus).toHaveBeenCalledWith({
			code: SpanStatus.error,
			message: 'Scheduler pass timed out',
		});
		expect(span.setStatus).not.toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('records error on the materialize span when the materializer pass is abandoned by its loop timeout', async () => {
		const { span, tracer } = makeTracer();
		const { scheduler } = makeScheduler({ tracer });
		const controller = new AbortController();
		controller.abort(PASS_TIMED_OUT);

		// The materializer aborts by throwing (throwIfAborted); a timeout is a real
		// fault, so the pass boundary lets it propagate and the tracer errors the
		// span, rather than settlePassSpan closing it.
		await expect(scheduler.materialize(controller.signal)).rejects.toBeDefined();

		expect(span.setStatus).toHaveBeenCalledWith(
			expect.objectContaining({ code: SpanStatus.error }),
		);
		expect(span.setStatus).not.toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('records ok on the materialize span when aborted by a graceful stop, not a timeout', async () => {
		const { span, tracer } = makeTracer();
		const { scheduler } = makeScheduler({ tracer });
		// A graceful stop aborts with the default reason, not PASS_TIMED_OUT.
		const controller = new AbortController();
		controller.abort();

		// Unlike the timeout case, the materializer's throw-to-roll-back is caught
		// at the pass boundary and reported as a no-op summary, not rethrown.
		const summary = await scheduler.materialize(controller.signal);

		expect(summary).toEqual({ claimedJobs: 0, occurrences: 0, created: [], deferredJobs: 0 });
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
		expect(span.setStatus).not.toHaveBeenCalledWith(
			expect.objectContaining({ code: SpanStatus.error }),
		);
	});

	it('still errors the materialize span when a real failure races a graceful stop', async () => {
		const { span, tracer } = makeTracer();
		const controller = new AbortController();
		const dbError = new Error('connection reset');
		// Simulates a shutdown (aborts the signal) landing at the same instant as
		// an unrelated transaction failure — the signal is aborted, but this
		// error is not `signal.reason`, so it must not be read as the abort.
		const materializerTransaction: RunInTransaction = () => {
			controller.abort();
			throw dbError;
		};
		const { scheduler } = makeScheduler({ tracer, materializerTransaction });

		await expect(scheduler.materialize(controller.signal)).rejects.toBe(dbError);

		expect(span.setStatus).toHaveBeenCalledWith(
			expect.objectContaining({ code: SpanStatus.error }),
		);
		expect(span.setStatus).not.toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('records ok on a pass drained by a graceful stop, not a timeout', async () => {
		const { span, tracer } = makeTracer();
		const { scheduler, taskStore } = makeScheduler({ tracer });
		taskStore.claimDueTasks.mockResolvedValue([]);
		// A graceful stop aborts with the default reason, not PASS_TIMED_OUT.
		const controller = new AbortController();
		controller.abort();

		await scheduler.execute(controller.signal);

		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
		expect(span.setStatus).not.toHaveBeenCalledWith(
			expect.objectContaining({ code: SpanStatus.error }),
		);
	});
});

describe('createScheduler metrics', () => {
	it('records the materialization outcome from the pass summary', async () => {
		const metrics = mock<SchedulerMetrics>();
		const corrupt: ScheduledJob = {
			id: 7,
			taskType: 'test-task',
			payload: {},
			kind: 'cron',
			cronExpression: null,
			timezone: null,
			intervalSeconds: null,
			fireAt: null,
			recurrenceUnit: null,
			recurrenceSize: null,
			nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
			lastFiredAt: null,
			maxAttempts: 3,
		};
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue({
			now: new Date('2026-01-01T00:00:00.000Z'),
			jobs: [corrupt],
		});
		tx.recordOccurrences.mockResolvedValue({ recorded: 0, created: [] });
		const materializerTransaction: RunInTransaction = async (work) => await work(tx);
		const { scheduler } = makeScheduler({ materializerTransaction, metrics });

		await scheduler.materialize();

		// One corrupt job deferred, no occurrences recorded.
		expect(metrics.recordMaterialized).toHaveBeenCalledWith(0, 1);
	});

	it('records the reaper outcome from the sweep result', async () => {
		const metrics = mock<SchedulerMetrics>();
		const { scheduler, taskStore } = makeScheduler({ metrics });
		taskStore.findExpiredLeases.mockResolvedValue([
			{ id: '7', attempts: 2, maxAttempts: 3, leaseEpoch: 1 },
		]);
		taskStore.deadLetterExpired.mockResolvedValue(1);

		await scheduler.reap();

		expect(metrics.recordReaped).toHaveBeenCalledWith(0, 1);
	});

	it('records the retention outcome from the pass summary', async () => {
		const metrics = mock<SchedulerMetrics>();
		const { scheduler, taskStore } = makeScheduler({ metrics });
		taskStore.deleteFinishedOlderThan.mockResolvedValueOnce(5).mockResolvedValue(0);

		await scheduler.prune();

		expect(metrics.recordPruned).toHaveBeenCalledWith(5);
	});

	it('defaults to a safe no-op when no metrics port is supplied', async () => {
		const { scheduler, taskStore } = makeScheduler();
		taskStore.deleteFinishedOlderThan.mockResolvedValue(0);

		// No metrics dep: the defaulted no-op must not throw.
		await expect(scheduler.prune()).resolves.toEqual({ deleted: 0, drained: true });
	});

	it('maps a successful fire onto dispatch and success metrics', async () => {
		const metrics = mock<SchedulerMetrics>();
		const { scheduler, taskStore } = makeScheduler({ metrics });
		scheduler.registerTaskHandler('test-task', { execute: vi.fn().mockResolvedValue(undefined) });
		// A task due in the past fires on the next timer tick.
		taskStore.claimDueTasks.mockResolvedValue([claimedTask()]);
		taskStore.markStarted.mockResolvedValue(1);
		taskStore.completeTask.mockResolvedValue(1);

		await scheduler.execute();

		// The fire is detached from the claim: wait for the timer to deliver it.
		await vi.waitFor(() => {
			expect(metrics.recordFireOutcome).toHaveBeenCalledWith('test-task', 'success');
		});
		expect(metrics.recordDispatch).toHaveBeenCalledWith('test-task');
		expect(metrics.observeDispatchLagSeconds).toHaveBeenCalledWith('test-task', expect.any(Number));
		expect(metrics.recordDeadLettered).not.toHaveBeenCalled();
	});

	it('maps a terminal failure onto a failure outcome and a dead-letter', async () => {
		const metrics = mock<SchedulerMetrics>();
		const { scheduler, taskStore } = makeScheduler({ metrics });
		scheduler.registerTaskHandler('test-task', {
			execute: vi.fn().mockRejectedValue(new Error('boom')),
		});
		// Single attempt: the first failure exhausts it.
		taskStore.claimDueTasks.mockResolvedValue([claimedTask({ attempts: 0, maxAttempts: 1 })]);
		taskStore.markStarted.mockResolvedValue(1);
		taskStore.failTaskTerminal.mockResolvedValue(1);

		await scheduler.execute();

		await vi.waitFor(() => {
			expect(metrics.recordFireOutcome).toHaveBeenCalledWith('test-task', 'failure');
		});
		expect(metrics.recordDeadLettered).toHaveBeenCalledTimes(1);
		expect(metrics.recordRetry).not.toHaveBeenCalled();
	});

	it('maps a failure with attempts remaining onto a retry', async () => {
		const metrics = mock<SchedulerMetrics>();
		const { scheduler, taskStore } = makeScheduler({ metrics });
		scheduler.registerTaskHandler('test-task', {
			execute: vi.fn().mockRejectedValue(new Error('boom')),
		});
		// Attempts remain, so the failure reschedules rather than fails terminally.
		taskStore.claimDueTasks.mockResolvedValue([claimedTask({ attempts: 0, maxAttempts: 3 })]);
		taskStore.markStarted.mockResolvedValue(1);
		taskStore.rescheduleTask.mockResolvedValue(1);

		await scheduler.execute();

		await vi.waitFor(() => {
			expect(metrics.recordRetry).toHaveBeenCalledWith('test-task');
		});
		expect(metrics.recordFireOutcome).not.toHaveBeenCalled();
		expect(metrics.recordDeadLettered).not.toHaveBeenCalled();
	});

	it('does not let a throwing metrics sink break a pass', async () => {
		const metrics = mock<SchedulerMetrics>();
		metrics.recordPruned.mockImplementation(() => {
			throw new Error('exporter down');
		});
		const { scheduler, taskStore } = makeScheduler({ metrics });
		taskStore.deleteFinishedOlderThan.mockResolvedValueOnce(5).mockResolvedValue(0);

		// The pass completes normally even though recording its outcome threw.
		await expect(scheduler.prune()).resolves.toEqual({ deleted: 5, drained: true });
	});

	it('does not let a throwing metrics sink break a fire', async () => {
		const metrics = mock<SchedulerMetrics>();
		metrics.recordDispatch.mockImplementation(() => {
			throw new Error('exporter down');
		});
		const { scheduler, taskStore } = makeScheduler({ metrics });
		const execute = vi.fn().mockResolvedValue(undefined);
		scheduler.registerTaskHandler('test-task', { execute });
		taskStore.claimDueTasks.mockResolvedValue([claimedTask()]);
		taskStore.markStarted.mockResolvedValue(1);
		taskStore.completeTask.mockResolvedValue(1);

		await scheduler.execute();

		// The handler still runs and the task still completes despite the sink throwing.
		await vi.waitFor(() => {
			expect(taskStore.completeTask).toHaveBeenCalledTimes(1);
		});
		expect(execute).toHaveBeenCalledTimes(1);
	});
});
