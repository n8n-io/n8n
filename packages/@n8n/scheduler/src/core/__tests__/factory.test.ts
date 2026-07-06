import { ScheduledTaskStatus } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import { createScheduler } from '../factory';
import type { SchedulerDeps, SchedulerTaskStore } from '../factory';
import type { RunInTransaction } from '../materializer';
import { DEFAULT_RETENTION_OPTIONS } from '../retention';

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
});
