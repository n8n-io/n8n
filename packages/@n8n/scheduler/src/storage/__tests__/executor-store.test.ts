import type { Logger } from '@n8n/backend-common';
import type { ScheduledTask as ScheduledTaskEntity, ScheduledTaskRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ClaimDueTasksBatch } from '../../core';
import { ExecutorStore } from '../executor-store';

const HOST = 'main-abc';

const batch: ClaimDueTasksBatch = {
	host: HOST,
	taskTypes: ['workflow:schedule-trigger'],
	lookaheadMs: 5_000,
	leaseMs: 60_000,
	batchSize: 100,
};

const claimedRow = (overrides: Partial<ScheduledTaskEntity> = {}): ScheduledTaskEntity =>
	({
		id: '1',
		jobId: 10,
		taskType: 'workflow:schedule-trigger',
		payload: {},
		scheduledFor: new Date('2026-07-01T00:00:00.000Z'),
		runAt: new Date('2026-07-01T00:00:00.000Z'),
		status: 'running',
		attempts: 0,
		maxAttempts: 1,
		claimedBy: HOST,
		leaseExpiresAt: new Date('2026-07-01T00:01:00.000Z'),
		leaseEpoch: 1,
		startedAt: null,
		finishedAt: null,
		errorMessage: null,
		...overrides,
	}) as ScheduledTaskEntity;

const setup = () => {
	const tasks = mock<ScheduledTaskRepository>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger); // the store scopes its logger on construction
	const store = new ExecutorStore(tasks, logger);
	return { tasks, logger, store };
};

describe('ExecutorStore.claimDueTasks', () => {
	it('claims with the batch it is given and maps rows to domain tasks', async () => {
		const { tasks, store } = setup();
		tasks.claimDueTasks.mockResolvedValue([claimedRow()]);

		const claimed = await store.claimDueTasks(batch);

		expect(tasks.claimDueTasks).toHaveBeenCalledWith(batch);
		expect(claimed).toEqual([
			expect.objectContaining({ id: '1', jobId: '10', claimedBy: HOST, leaseEpoch: 1 }),
		]);
	});

	it('maps each claimed row independently: an unmappable row is released and the rest survive', async () => {
		const { tasks, logger, store } = setup();
		// A row entityToClaimedTask rejects (claimedBy on a claimed row is non-null by
		// contract), fed alongside a valid one.
		const bad = claimedRow({ id: 'bad', claimedBy: null });
		const good = claimedRow({ id: 'good' });
		tasks.claimDueTasks.mockResolvedValue([bad, good]);

		const claimed = await store.claimDueTasks(batch);

		expect(claimed).toEqual([expect.objectContaining({ id: 'good' })]);
		expect(logger.error).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ taskId: 'bad' }),
		);
		expect(tasks.releaseClaim).toHaveBeenCalledWith({
			host: HOST,
			id: 'bad',
			claimedEpoch: bad.leaseEpoch,
		});
	});

	it('swallows a failed release of an unmappable row: the reaper still recovers it', async () => {
		const { tasks, logger, store } = setup();
		const bad = claimedRow({ id: 'bad', claimedBy: null });
		tasks.claimDueTasks.mockResolvedValue([bad]);
		tasks.releaseClaim.mockRejectedValue(new Error('db down'));

		await expect(store.claimDueTasks(batch)).resolves.toEqual([]);

		// Logged twice: once for the unmappable row, once for the failed release.
		expect(logger.error).toHaveBeenCalledTimes(2);
		expect(logger.error).toHaveBeenLastCalledWith(
			'Scheduler executor store failed to release claim',
			expect.objectContaining({ taskId: 'bad' }),
		);
	});
});

describe('ExecutorStore terminal transitions', () => {
	it('delegates each guarded write to the repository unchanged', async () => {
		const { tasks, store } = setup();
		const claim = { host: HOST, id: '1', claimedEpoch: 7 };
		tasks.markStarted.mockResolvedValue(1);
		tasks.completeTask.mockResolvedValue(1);
		tasks.failTaskTerminal.mockResolvedValue(1);
		tasks.rescheduleTask.mockResolvedValue(1);
		tasks.releaseClaim.mockResolvedValue(1);

		await expect(store.markStarted(claim)).resolves.toBe(1);
		await expect(store.completeTask(claim)).resolves.toBe(1);
		await expect(store.failTaskTerminal(claim, 'boom')).resolves.toBe(1);
		await expect(store.rescheduleTask(claim, 5_000, 'boom')).resolves.toBe(1);
		await expect(store.releaseClaim(claim)).resolves.toBe(1);

		expect(tasks.markStarted).toHaveBeenCalledWith(claim);
		expect(tasks.completeTask).toHaveBeenCalledWith(claim);
		expect(tasks.failTaskTerminal).toHaveBeenCalledWith(claim, 'boom');
		expect(tasks.rescheduleTask).toHaveBeenCalledWith(claim, 5_000, 'boom');
		expect(tasks.releaseClaim).toHaveBeenCalledWith(claim);
	});
});
