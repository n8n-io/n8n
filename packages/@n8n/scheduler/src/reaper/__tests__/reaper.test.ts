import type { Logger } from '@n8n/backend-common';
import type { ScheduledTask as ScheduledTaskEntity } from '@n8n/db';
import { SpanStatus, type Span, type Tracing } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { backoff } from '../../executor/backoff';
import { SCHEDULER_ATTRIBUTES } from '../../observability/attributes';
import { reap, type ReaperTaskStore } from '../reaper';

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
	const store = mock<ReaperTaskStore>();
	const logger = mock<Logger>();
	const span = mock<Span>();
	const tracing = mock<Tracing>();
	tracing.startSpan.mockImplementation(async (_opts, spanCb) => await spanCb(span));
	// Guarded updates report one row changed unless a test overrides them.
	store.reclaimExpired.mockResolvedValue(1);
	store.deadLetterExpired.mockResolvedValue(1);
	const run = async () => await reap({ store, logger, batchSize: 100, tracing });
	return { store, logger, tracing, span, run };
};

describe('reap', () => {
	it('does nothing when no lease has expired', async () => {
		const { store, run } = setup();
		store.findExpiredLeases.mockResolvedValue([]);

		const result = await run();

		expect(result).toEqual({ reclaimed: 0, deadLettered: 0 });
		expect(store.reclaimExpired).not.toHaveBeenCalled();
		expect(store.deadLetterExpired).not.toHaveBeenCalled();
	});

	it('reclaims a task with attempts left: backoff on the next attempt, epoch passed through', async () => {
		const { store, run } = setup();
		const task = expiredTask({ attempts: 0, maxAttempts: 3, leaseEpoch: 4 });
		store.findExpiredLeases.mockResolvedValue([task]);

		const result = await run();

		// nextAttempt = 1 -> backoff(1); guarded on the epoch read during the sweep.
		expect(store.reclaimExpired).toHaveBeenCalledWith(
			{ id: task.id, claimedEpoch: 4 },
			backoff(1),
			expect.any(String),
		);
		expect(store.deadLetterExpired).not.toHaveBeenCalled();
		expect(result).toEqual({ reclaimed: 1, deadLettered: 0 });
	});

	it('uses the next attempt number for the backoff on a middle attempt', async () => {
		const { store, run } = setup();
		const task = expiredTask({ attempts: 1, maxAttempts: 5 });
		store.findExpiredLeases.mockResolvedValue([task]);

		await run();

		// nextAttempt = 2 -> backoff(2), proving it uses backoff(attempts+1) rather than backoff(attempts).
		expect(store.reclaimExpired).toHaveBeenCalledWith(
			{ id: task.id, claimedEpoch: task.leaseEpoch },
			backoff(2),
			expect.any(String),
		);
	});

	it('dead-letters a task on its single default attempt', async () => {
		const { store, run } = setup();
		const task = expiredTask({ attempts: 0, maxAttempts: 1 });
		store.findExpiredLeases.mockResolvedValue([task]);

		const result = await run();

		expect(store.deadLetterExpired).toHaveBeenCalledWith(
			{ id: task.id, claimedEpoch: task.leaseEpoch },
			expect.any(String),
		);
		expect(store.reclaimExpired).not.toHaveBeenCalled();
		expect(result).toEqual({ reclaimed: 0, deadLettered: 1 });
	});

	it('dead-letters when the next attempt reaches maxAttempts', async () => {
		const { store, run } = setup();
		// nextAttempt = 3 == maxAttempts -> terminal, not another reclaim.
		const task = expiredTask({ attempts: 2, maxAttempts: 3 });
		store.findExpiredLeases.mockResolvedValue([task]);

		await run();

		expect(store.deadLetterExpired).toHaveBeenCalledWith(
			{ id: task.id, claimedEpoch: task.leaseEpoch },
			expect.any(String),
		);
		expect(store.reclaimExpired).not.toHaveBeenCalled();
	});

	it('aggregates counts across a mixed batch', async () => {
		const { store, run } = setup();
		store.findExpiredLeases.mockResolvedValue([
			expiredTask({ id: 'a', attempts: 0, maxAttempts: 3 }), // reclaim
			expiredTask({ id: 'b', attempts: 0, maxAttempts: 1 }), // dead-letter
			expiredTask({ id: 'c', attempts: 1, maxAttempts: 3 }), // reclaim
		]);

		const result = await run();

		expect(result).toEqual({ reclaimed: 2, deadLettered: 1 });
	});

	it('skips a row that throws and still processes the rest of the batch', async () => {
		const { store, logger, run } = setup();
		// The oldest row throws; without per-row isolation it would abort the pass and
		// head-of-line block every younger expired row on every future sweep.
		store.reclaimExpired.mockRejectedValueOnce(new Error('db down'));
		store.findExpiredLeases.mockResolvedValue([
			expiredTask({ id: 'poison', attempts: 0, maxAttempts: 3 }),
			expiredTask({ id: 'ok', attempts: 0, maxAttempts: 3 }),
		]);

		const result = await run();

		expect(result).toEqual({ reclaimed: 1, deadLettered: 0 });
		expect(store.reclaimExpired).toHaveBeenCalledWith(
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
		const { store, run } = setup();
		// The owner finished (or another reaper won the row) between read and write.
		store.reclaimExpired.mockResolvedValue(0);
		store.findExpiredLeases.mockResolvedValue([expiredTask({ attempts: 0, maxAttempts: 3 })]);

		const result = await run();

		expect(result).toEqual({ reclaimed: 0, deadLettered: 0 });
	});

	it('opens a reap span and records the recovery counts', async () => {
		const { store, tracing, span, run } = setup();
		store.findExpiredLeases.mockResolvedValue([
			expiredTask({ id: 'a', attempts: 0, maxAttempts: 3 }), // reclaim
			expiredTask({ id: 'b', attempts: 0, maxAttempts: 1 }), // dead-letter
		]);

		await run();

		expect(tracing.startSpan).toHaveBeenCalledWith(
			expect.objectContaining({ op: 'scheduler.reap' }),
			expect.any(Function),
		);
		expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.reclaimed, 1);
		expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.deadLettered, 1);
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('propagates a sweep read failure without marking the span ok', async () => {
		const { store, span, run } = setup();
		store.findExpiredLeases.mockRejectedValue(new Error('db down'));

		await expect(run()).rejects.toThrow('db down');
		expect(span.setStatus).not.toHaveBeenCalledWith({ code: SpanStatus.ok });
	});
});
