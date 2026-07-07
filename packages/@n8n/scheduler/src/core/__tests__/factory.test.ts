import { ScheduledTaskStatus } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import { SCHEDULER_ATTRIBUTES } from '../../observability/attributes';
import { SpanStatus, type Span, type Tracer } from '../../observability/tracer';
import { createScheduler } from '../factory';
import type { SchedulerDeps, SchedulerTaskStore } from '../factory';
import type { MaterializerTransaction, RunInTransaction } from '../materializer';
import { DEFAULT_RETENTION_OPTIONS } from '../retention';
import type { ClaimedTask, ScheduledJob } from '../types';

/** A shared span so every pass records its attributes/status to the same spy. */
const makeTracer = () => {
	const span: Span = { setAttribute: vi.fn(), setStatus: vi.fn() };
	const tracer = mock<Tracer>();
	tracer.startSpan.mockImplementation(async (_options, run) => await run(span));
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
			nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
			lastFiredAt: null,
			maxAttempts: 3,
		};
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue({
			now: new Date('2026-01-01T00:00:00.000Z'),
			jobs: [corrupt],
		});
		tx.recordOccurrences.mockResolvedValue(0);
		const materializerTransaction: RunInTransaction = async (work) => await work(tx);
		const { scheduler, onEvent } = makeScheduler({ materializerTransaction });

		const summary = await scheduler.materialize();

		expect(summary).toEqual({ claimedJobs: 1, occurrences: 0, deferredJobs: 1 });
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
		tx.recordOccurrences.mockResolvedValue(0);
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
			nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
			lastFiredAt: null,
			maxAttempts: 3,
		};
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue({ now: new Date('2026-01-01T00:00:00.000Z'), jobs: [due] });
		tx.recordOccurrences.mockResolvedValue(1);
		const materializerTransaction: RunInTransaction = async (work) => await work(tx);
		const { span, tracer } = makeTracer();
		const { scheduler } = makeScheduler({
			materializerTransaction,
			materializer: { windowSeconds: 0 },
			tracer,
		});

		const summary = await scheduler.materialize();

		expect(tracer.startSpan).toHaveBeenCalledWith(
			expect.objectContaining({ op: 'scheduler.materialize' }),
			expect.any(Function),
		);
		expect(span.setAttribute).toHaveBeenCalledWith(
			SCHEDULER_ATTRIBUTES.claimedJobs,
			summary.claimedJobs,
		);
		expect(span.setAttribute).toHaveBeenCalledWith(
			SCHEDULER_ATTRIBUTES.occurrences,
			summary.occurrences,
		);
		expect(span.setAttribute).toHaveBeenCalledWith(
			SCHEDULER_ATTRIBUTES.deferredJobs,
			summary.deferredJobs,
		);
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('opens a claim span carrying the claimed count and host, with ok status', async () => {
		const { span, tracer } = makeTracer();
		const { scheduler, taskStore } = makeScheduler({ tracer });
		scheduler.registerTaskHandler('test-task', { execute: vi.fn() });
		taskStore.claimDueTasks.mockResolvedValue([claimedTask()]);

		const tasks = await scheduler.execute();

		expect(tracer.startSpan).toHaveBeenCalledWith(
			expect.objectContaining({
				op: 'scheduler.claim',
				attributes: { [SCHEDULER_ATTRIBUTES.host]: 'main-test' },
			}),
			expect.any(Function),
		);
		expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.claimedCount, tasks.length);
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('opens a reap span carrying the reclaimed and dead-lettered counts, with ok status', async () => {
		const { span, tracer } = makeTracer();
		const { scheduler, taskStore } = makeScheduler({ tracer });
		taskStore.findExpiredLeases.mockResolvedValue([
			{ id: '7', attempts: 2, maxAttempts: 3, leaseEpoch: 1 },
		]);
		taskStore.deadLetterExpired.mockResolvedValue(1);

		const result = await scheduler.reap();

		expect(tracer.startSpan).toHaveBeenCalledWith(
			expect.objectContaining({ op: 'scheduler.reap' }),
			expect.any(Function),
		);
		expect(span.setAttribute).toHaveBeenCalledWith(
			SCHEDULER_ATTRIBUTES.reclaimed,
			result.reclaimed,
		);
		expect(span.setAttribute).toHaveBeenCalledWith(
			SCHEDULER_ATTRIBUTES.deadLettered,
			result.deadLettered,
		);
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
	});
});
