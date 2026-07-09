import { mock } from 'vitest-mock-extended';

import { backoff } from '../../executor/backoff';
import { reap, type ExpiredLeaseRow, type ReaperTaskStore } from '../reap';

const expiredTask = (overrides: Partial<ExpiredLeaseRow> = {}): ExpiredLeaseRow => ({
	id: '1',
	attempts: 0,
	maxAttempts: 3,
	leaseEpoch: 1,
	...overrides,
});

const setup = () => {
	const store = mock<ReaperTaskStore>();
	const onRowError = vi.fn();
	const onDeadLetter = vi.fn();
	// Guarded updates report one row changed unless a test overrides them.
	store.reclaimExpired.mockResolvedValue(1);
	store.deadLetterExpired.mockResolvedValue(1);
	const run = async () => await reap(store, { batchSize: 100 }, { onRowError, onDeadLetter });
	return { store, onRowError, onDeadLetter, run };
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
		const { store, onDeadLetter, run } = setup();
		const task = expiredTask({ attempts: 0, maxAttempts: 1 });
		store.findExpiredLeases.mockResolvedValue([task]);

		const result = await run();

		expect(store.deadLetterExpired).toHaveBeenCalledWith(
			{ id: task.id, claimedEpoch: task.leaseEpoch },
			expect.any(String),
		);
		expect(store.reclaimExpired).not.toHaveBeenCalled();
		expect(result).toEqual({ reclaimed: 0, deadLettered: 1 });
		// The terminal failure is reported with the lost attempt already counted.
		expect(onDeadLetter).toHaveBeenCalledWith({ taskId: task.id, attempts: 1, maxAttempts: 1 });
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
		const { store, onRowError, run } = setup();
		// The oldest row throws; without per-row isolation it would abort the pass and
		// head-of-line block every younger expired row on every future sweep.
		const failure = new Error('db down');
		store.reclaimExpired.mockRejectedValueOnce(failure);
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
		expect(onRowError).toHaveBeenCalledWith('poison', failure);
	});

	it('keeps sweeping when the row-error reporter itself throws', async () => {
		const { store, onRowError, run } = setup();
		const failure = new Error('db down');
		store.reclaimExpired.mockRejectedValueOnce(failure);
		// The reporter is host-supplied; a broken one must not re-break the isolation
		// it reports on, or the poison row would also abort every younger row.
		onRowError.mockImplementation(() => {
			throw new Error('logger down');
		});
		store.findExpiredLeases.mockResolvedValue([
			expiredTask({ id: 'poison', attempts: 0, maxAttempts: 3 }),
			expiredTask({ id: 'ok', attempts: 0, maxAttempts: 3 }),
		]);

		const result = await run();

		expect(result).toEqual({ reclaimed: 1, deadLettered: 0 });
		expect(onRowError).toHaveBeenCalledWith('poison', failure);
	});

	it('counts only rows actually changed (a lost race is a benign no-op)', async () => {
		const { store, run } = setup();
		// The owner finished (or another reaper won the row) between read and write.
		store.reclaimExpired.mockResolvedValue(0);
		store.findExpiredLeases.mockResolvedValue([expiredTask({ attempts: 0, maxAttempts: 3 })]);

		const result = await run();

		expect(result).toEqual({ reclaimed: 0, deadLettered: 0 });
	});

	it('does not report a dead-letter for a reclaim or a lost dead-letter race', async () => {
		const { store, onDeadLetter, run } = setup();
		// 'raced' loses its guarded update: another actor decided the row first.
		store.deadLetterExpired.mockResolvedValue(0);
		store.findExpiredLeases.mockResolvedValue([
			expiredTask({ id: 'retried', attempts: 0, maxAttempts: 3 }),
			expiredTask({ id: 'raced', attempts: 0, maxAttempts: 1 }),
		]);

		const result = await run();

		expect(result).toEqual({ reclaimed: 1, deadLettered: 0 });
		expect(onDeadLetter).not.toHaveBeenCalled();
	});

	it('keeps sweeping when the dead-letter reporter itself throws', async () => {
		const { store, onDeadLetter, run } = setup();
		onDeadLetter.mockImplementation(() => {
			throw new Error('logger down');
		});
		store.findExpiredLeases.mockResolvedValue([
			expiredTask({ id: 'dead', attempts: 0, maxAttempts: 1 }),
			expiredTask({ id: 'ok', attempts: 0, maxAttempts: 3 }),
		]);

		const result = await run();

		// The row was decided before the reporter ran: counted, and the sweep goes on.
		expect(result).toEqual({ reclaimed: 1, deadLettered: 1 });
	});

	it('cancelled mid-sweep, it keeps what it recovered and leaves the rest to the next sweep', async () => {
		const { store } = setup();
		const controller = new AbortController();
		store.findExpiredLeases.mockResolvedValue([
			expiredTask({ id: 'recovered' }),
			expiredTask({ id: 'left-for-next-sweep' }),
		]);
		// The cancellation lands while the first row's write is in flight.
		store.reclaimExpired.mockImplementation(async () => {
			controller.abort();
			return await Promise.resolve(1);
		});

		const result = await reap(store, { batchSize: 100 }, {}, controller.signal);

		expect(result).toEqual({ reclaimed: 1, deadLettered: 0 });
		expect(store.reclaimExpired).toHaveBeenCalledTimes(1);
	});

	it('cancelled before the sweep starts, it touches no row', async () => {
		const { store } = setup();
		const controller = new AbortController();
		controller.abort();
		store.findExpiredLeases.mockResolvedValue([expiredTask()]);

		const result = await reap(store, { batchSize: 100 }, {}, controller.signal);

		expect(result).toEqual({ reclaimed: 0, deadLettered: 0 });
		expect(store.reclaimExpired).not.toHaveBeenCalled();
		expect(store.deadLetterExpired).not.toHaveBeenCalled();
	});
});
