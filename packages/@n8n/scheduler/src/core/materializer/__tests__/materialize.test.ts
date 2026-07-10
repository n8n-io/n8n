import { mock } from 'vitest-mock-extended';

import type { ScheduledJob } from '../../types';
import { materialize, type MaterializerOptions } from '../materialize';
import type { RunInTransaction, MaterializerTransaction } from '../transaction';

const NOW = new Date('2026-01-01T00:00:00.000Z');

/** An every-10s interval job due at NOW. */
const makeJob = (id: number): ScheduledJob => ({
	id,
	taskType: 'test',
	payload: {},
	kind: 'interval',
	cronExpression: null,
	timezone: null,
	intervalSeconds: 10,
	fireAt: null,
	recurrenceUnit: null,
	recurrenceSize: null,
	nextRunAt: NOW,
	lastFiredAt: null,
	maxAttempts: 1,
});

/** A transaction runner that hands `work` the given operations, without a real transaction. */
const runnerWith =
	(tx: MaterializerTransaction): RunInTransaction =>
	async (work) =>
		await work(tx);

const options: MaterializerOptions = {
	windowSeconds: 0,
	batchSize: 25,
	maxPerJob: 100,
	planRetrySeconds: 3600,
	defaultTimezone: 'UTC',
};

describe('materialize', () => {
	it('does nothing when no jobs are due', async () => {
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue(undefined);

		const summary = await materialize(runnerWith(tx), options);

		expect(summary).toEqual({ claimedJobs: 0, occurrences: 0, created: [], deferredJobs: 0 });
		expect(tx.recordOccurrences).not.toHaveBeenCalled();
		expect(tx.advanceJobs).not.toHaveBeenCalled();
	});

	it('records occurrences and advances each claimed job', async () => {
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [makeJob(1), makeJob(2)] });
		// windowSeconds: 0 means one occurrence per job: the due fire, both newly recorded.
		tx.recordOccurrences.mockResolvedValue({ recorded: 2, created: [] });

		const summary = await materialize(runnerWith(tx), options);

		// The summary reports the count `recordOccurrences` returned, not the plan's size.
		expect(summary).toEqual({ claimedJobs: 2, occurrences: 2, created: [], deferredJobs: 0 });

		// One insert and one update for the whole batch, not a pair per job.
		expect(tx.recordOccurrences).toHaveBeenCalledTimes(1);
		expect(tx.advanceJobs).toHaveBeenCalledTimes(1);

		// The recorded rows are the flattened occurrences, ready for the store to insert.
		const occurrence = (jobId: number) => ({
			jobId,
			taskType: 'test',
			payload: {},
			scheduledFor: NOW,
			runAt: NOW,
			maxAttempts: 1,
		});
		expect(tx.recordOccurrences).toHaveBeenCalledWith([occurrence(1), occurrence(2)]);

		const plan = {
			occurrences: [NOW],
			nextRunAt: new Date('2026-01-01T00:00:10.000Z'),
			lastFiredAt: NOW,
		};
		expect(tx.advanceJobs).toHaveBeenCalledWith([
			{ job: makeJob(1), plan },
			{ job: makeJob(2), plan },
		]);
	});

	it('claims at most batchSize jobs', async () => {
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue(undefined);

		await materialize(runnerWith(tx), { ...options, batchSize: 25 });

		expect(tx.claimDueJobs).toHaveBeenCalledWith(25);
	});

	it('reports skipped duplicates, and a throwing reporter does not fail the pass', async () => {
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [makeJob(1), makeJob(2)] });
		// Two planned, one already recorded (e.g. by a concurrent pass).
		tx.recordOccurrences.mockResolvedValue({ recorded: 1, created: [] });
		const onSkippedDuplicates = vi.fn(() => {
			throw new Error('logger down');
		});

		const summary = await materialize(runnerWith(tx), options, { onSkippedDuplicates });

		expect(onSkippedDuplicates).toHaveBeenCalledWith({ planned: 2, recorded: 1 });
		expect(summary).toEqual({ claimedJobs: 2, occurrences: 1, created: [], deferredJobs: 0 });
		expect(tx.advanceJobs).toHaveBeenCalledTimes(1);
	});

	it('stays silent when every planned occurrence is newly recorded', async () => {
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [makeJob(1)] });
		tx.recordOccurrences.mockResolvedValue({ recorded: 1, created: [] });
		const onSkippedDuplicates = vi.fn();

		await materialize(runnerWith(tx), options, { onSkippedDuplicates });

		expect(onSkippedDuplicates).not.toHaveBeenCalled();
	});

	it('defers an un-plannable job instead of failing the whole batch', async () => {
		const good = makeJob(1);
		// A cron job missing its expression (a corrupt row): planning throws for this one.
		const bad: ScheduledJob = {
			...makeJob(2),
			kind: 'cron',
			cronExpression: null,
			intervalSeconds: null,
		};
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [good, bad] });
		tx.recordOccurrences.mockResolvedValue({ recorded: 1, created: [] });
		const onPlanError = vi.fn();

		const summary = await materialize(runnerWith(tx), options, { onPlanError });

		expect(summary).toEqual({ claimedJobs: 2, occurrences: 1, created: [], deferredJobs: 1 });
		expect(onPlanError).toHaveBeenCalledTimes(1);
		expect(onPlanError).toHaveBeenCalledWith(bad, expect.anything());

		// The good job plans normally; the bad one records nothing and is retried a
		// planRetrySeconds backoff later (nextRunAt stays set: null means exhausted).
		const planned = tx.advanceJobs.mock.calls[0][0];
		const goodEntry = planned.find((p) => p.job.id === good.id)!;
		const badEntry = planned.find((p) => p.job.id === bad.id)!;
		expect(goodEntry.plan.occurrences).toEqual([NOW]);
		expect(badEntry.plan.occurrences).toEqual([]);
		expect(badEntry.plan.nextRunAt).toEqual(new Date('2026-01-01T01:00:00.000Z'));
		expect(badEntry.plan.lastFiredAt).toBeNull();
	});

	it('cancelled before any work, it opens no transaction at all', async () => {
		const tx = mock<MaterializerTransaction>();
		let transactionsOpened = 0;
		const runInTransaction: RunInTransaction = async (work) => {
			transactionsOpened += 1;
			return await work(tx);
		};
		const controller = new AbortController();
		controller.abort();

		await expect(materialize(runInTransaction, options, {}, controller.signal)).rejects.toThrow();
		expect(transactionsOpened).toBe(0);
	});

	it('cancelled during the claim, it throws inside the transaction so the claim rolls back', async () => {
		const tx = mock<MaterializerTransaction>();
		const controller = new AbortController();
		// The cancellation lands while the claim query is in flight.
		tx.claimDueJobs.mockImplementation(async () => {
			controller.abort();
			return await Promise.resolve({ now: NOW, jobs: [makeJob(1)] });
		});
		// A real runner rolls back when the work throws; asserting the throw
		// asserts the rollback.
		await expect(materialize(runnerWith(tx), options, {}, controller.signal)).rejects.toThrow();
		expect(tx.recordOccurrences).not.toHaveBeenCalled();
		expect(tx.advanceJobs).not.toHaveBeenCalled();
	});

	it('cancelled during the insert, it throws before advancing the jobs', async () => {
		const tx = mock<MaterializerTransaction>();
		const controller = new AbortController();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [makeJob(1)] });
		tx.recordOccurrences.mockImplementation(async () => {
			controller.abort();
			return await Promise.resolve({ recorded: 1, created: [] });
		});
		const onSkippedDuplicates = vi.fn();

		await expect(
			materialize(runnerWith(tx), options, { onSkippedDuplicates }, controller.signal),
		).rejects.toThrow();
		expect(tx.advanceJobs).not.toHaveBeenCalled();
		// No reporting about rows the rollback is about to undo.
		expect(onSkippedDuplicates).not.toHaveBeenCalled();
	});

	it('still defers and completes the pass when the plan-error reporter itself throws', async () => {
		const good = makeJob(1);
		const bad: ScheduledJob = {
			...makeJob(2),
			kind: 'cron',
			cronExpression: null,
			intervalSeconds: null,
		};
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [good, bad] });
		tx.recordOccurrences.mockResolvedValue({ recorded: 1, created: [] });
		// The reporter is host-supplied; a broken one must not turn a deferred job
		// into a rolled-back pass.
		const onPlanError = vi.fn(() => {
			throw new Error('logger down');
		});

		const summary = await materialize(runnerWith(tx), options, { onPlanError });

		expect(summary).toEqual({ claimedJobs: 2, occurrences: 1, created: [], deferredJobs: 1 });
		expect(tx.recordOccurrences).toHaveBeenCalledTimes(1);
		expect(tx.advanceJobs).toHaveBeenCalledTimes(1);
	});
});
