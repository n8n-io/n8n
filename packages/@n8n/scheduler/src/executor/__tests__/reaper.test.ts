import type { Logger } from '@n8n/backend-common';
import type { SchedulerConfig } from '@n8n/config';
import type { ScheduledTask as ScheduledTaskEntity, ScheduledTaskRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { backoff } from '../backoff';
import { Reaper } from '../reaper';

const expiredTask = (overrides: Partial<ScheduledTaskEntity> = {}): ScheduledTaskEntity =>
	({
		id: '1',
		jobId: 10,
		taskType: 'workflow:schedule-trigger',
		payload: {},
		scheduledFor: new Date('2026-07-01T00:00:00.000Z'),
		runAt: new Date('2026-07-01T00:00:00.000Z'),
		status: 'running',
		attempts: 0,
		maxAttempts: 3,
		claimedBy: 'dead-main',
		leaseExpiresAt: new Date('2026-07-01T00:01:00.000Z'),
		leaseEpoch: 1,
		startedAt: new Date('2026-07-01T00:00:00.000Z'),
		finishedAt: null,
		errorMessage: null,
		...overrides,
	}) as ScheduledTaskEntity;

const setup = () => {
	const taskRepository = mock<ScheduledTaskRepository>();
	const logger = mock<Logger>();
	const config = mock<SchedulerConfig>({ reaperBatchSize: 100 });
	const reaper = new Reaper(taskRepository, logger, config);
	// Guarded updates report one row changed unless a test overrides them.
	taskRepository.reclaimExpired.mockResolvedValue(1);
	taskRepository.deadLetterExpired.mockResolvedValue(1);
	return { taskRepository, logger, reaper };
};

describe('Reaper.reap', () => {
	it('does nothing when no lease has expired', async () => {
		const { taskRepository, reaper } = setup();
		taskRepository.findExpiredLeases.mockResolvedValue([]);

		const result = await reaper.reap();

		expect(result).toEqual({ reclaimed: 0, deadLettered: 0 });
		expect(taskRepository.reclaimExpired).not.toHaveBeenCalled();
		expect(taskRepository.deadLetterExpired).not.toHaveBeenCalled();
	});

	it('reclaims a task with attempts left: backoff on the next attempt, epoch passed through', async () => {
		const { taskRepository, reaper } = setup();
		const task = expiredTask({ attempts: 0, maxAttempts: 3, leaseEpoch: 4 });
		taskRepository.findExpiredLeases.mockResolvedValue([task]);

		const result = await reaper.reap();

		// nextAttempt = 1 -> backoff(1); guarded on the epoch read during the sweep.
		expect(taskRepository.reclaimExpired).toHaveBeenCalledWith(
			{ id: task.id, claimedEpoch: 4 },
			backoff(1),
			expect.any(String),
		);
		expect(taskRepository.deadLetterExpired).not.toHaveBeenCalled();
		expect(result).toEqual({ reclaimed: 1, deadLettered: 0 });
	});

	it('uses the next attempt number for the backoff on a middle attempt', async () => {
		const { taskRepository, reaper } = setup();
		const task = expiredTask({ attempts: 1, maxAttempts: 5 });
		taskRepository.findExpiredLeases.mockResolvedValue([task]);

		await reaper.reap();

		// nextAttempt = 2 -> backoff(2), proving it uses backoff(attempts+1) rather than backoff(attempts).
		expect(taskRepository.reclaimExpired).toHaveBeenCalledWith(
			{ id: task.id, claimedEpoch: task.leaseEpoch },
			backoff(2),
			expect.any(String),
		);
	});

	it('dead-letters a task on its single default attempt', async () => {
		const { taskRepository, reaper } = setup();
		const task = expiredTask({ attempts: 0, maxAttempts: 1 });
		taskRepository.findExpiredLeases.mockResolvedValue([task]);

		const result = await reaper.reap();

		expect(taskRepository.deadLetterExpired).toHaveBeenCalledWith(
			{ id: task.id, claimedEpoch: task.leaseEpoch },
			expect.any(String),
		);
		expect(taskRepository.reclaimExpired).not.toHaveBeenCalled();
		expect(result).toEqual({ reclaimed: 0, deadLettered: 1 });
	});

	it('dead-letters when the next attempt reaches maxAttempts', async () => {
		const { taskRepository, reaper } = setup();
		// nextAttempt = 3 == maxAttempts -> terminal, not another reclaim.
		const task = expiredTask({ attempts: 2, maxAttempts: 3 });
		taskRepository.findExpiredLeases.mockResolvedValue([task]);

		await reaper.reap();

		expect(taskRepository.deadLetterExpired).toHaveBeenCalledWith(
			{ id: task.id, claimedEpoch: task.leaseEpoch },
			expect.any(String),
		);
		expect(taskRepository.reclaimExpired).not.toHaveBeenCalled();
	});

	it('aggregates counts across a mixed batch', async () => {
		const { taskRepository, reaper } = setup();
		taskRepository.findExpiredLeases.mockResolvedValue([
			expiredTask({ id: 'a', attempts: 0, maxAttempts: 3 }), // reclaim
			expiredTask({ id: 'b', attempts: 0, maxAttempts: 1 }), // dead-letter
			expiredTask({ id: 'c', attempts: 1, maxAttempts: 3 }), // reclaim
		]);

		const result = await reaper.reap();

		expect(result).toEqual({ reclaimed: 2, deadLettered: 1 });
	});

	it('skips a row that throws and still processes the rest of the batch', async () => {
		const { taskRepository, logger, reaper } = setup();
		// The oldest row throws; without per-row isolation it would abort the pass and
		// head-of-line block every younger expired row on every future sweep.
		taskRepository.reclaimExpired.mockRejectedValueOnce(new Error('db down'));
		taskRepository.findExpiredLeases.mockResolvedValue([
			expiredTask({ id: 'poison', attempts: 0, maxAttempts: 3 }),
			expiredTask({ id: 'ok', attempts: 0, maxAttempts: 3 }),
		]);

		const result = await reaper.reap();

		expect(result).toEqual({ reclaimed: 1, deadLettered: 0 });
		expect(taskRepository.reclaimExpired).toHaveBeenCalledWith(
			{ id: 'ok', claimedEpoch: 1 },
			backoff(1),
			expect.any(String),
		);
		expect(logger.error).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ taskId: 'poison' }),
		);
	});

	it('counts only rows actually changed (a lost race is a benign no-op)', async () => {
		const { taskRepository, reaper } = setup();
		// The owner finished (or another reaper won the row) between read and write.
		taskRepository.reclaimExpired.mockResolvedValue(0);
		taskRepository.findExpiredLeases.mockResolvedValue([
			expiredTask({ attempts: 0, maxAttempts: 3 }),
		]);

		const result = await reaper.reap();

		expect(result).toEqual({ reclaimed: 0, deadLettered: 0 });
	});
});
