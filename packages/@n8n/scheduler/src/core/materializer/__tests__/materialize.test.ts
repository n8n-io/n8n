import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import { mock, type MockProxy } from 'vitest-mock-extended';

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
	misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
	misfireGraceSeconds: 60,
});

const makeSkipJob = (id: number): ScheduledJob => ({
	...makeJob(id),
	misfirePolicy: ScheduledJobMisfirePolicy.Skip,
});

/** A mock transaction whose `retireSuperseded` resolves to 0 rather than `undefined`. */
function makeTx(): MockProxy<MaterializerTransaction> {
	const tx = mock<MaterializerTransaction>();
	tx.retireSuperseded.mockResolvedValue(0);
	return tx;
}

/** A transaction runner that hands `work` the given operations, without a real transaction. */
const runnerWith =
	(tx: MaterializerTransaction): RunInTransaction =>
	async (work) =>
		await work(tx);

const options: MaterializerOptions = {
	windowSeconds: 0,
	lookaheadSeconds: 0,
	batchSize: 25,
	maxPerJob: 100,
	planRetrySeconds: 3600,
	defaultTimezone: 'UTC',
};

describe('materialize', () => {
	it('does nothing when no jobs are due', async () => {
		const tx = makeTx();
		tx.claimDueJobs.mockResolvedValue(undefined);

		const summary = await materialize(runnerWith(tx), options);

		expect(summary).toEqual({
			claimedJobs: 0,
			occurrences: 0,
			created: [],
			deferredJobs: 0,
			misfires: [],
			retiredOccurrences: 0,
		});
		expect(tx.recordOccurrences).not.toHaveBeenCalled();
		expect(tx.advanceJobs).not.toHaveBeenCalled();
	});

	it('records occurrences and advances each claimed job', async () => {
		const tx = makeTx();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [makeJob(1), makeJob(2)] });
		// windowSeconds: 0 means one occurrence per job: the due fire, both newly recorded.
		tx.recordOccurrences.mockResolvedValue({ recorded: 2, created: [] });

		const summary = await materialize(runnerWith(tx), options);

		// The summary reports the count `recordOccurrences` returned, not the plan's size.
		expect(summary).toEqual({
			claimedJobs: 2,
			occurrences: 2,
			created: [],
			deferredJobs: 0,
			misfires: [],
			retiredOccurrences: 0,
		});

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
			missedAfter: new Date('2026-01-01T00:01:00.000Z'),
		});
		expect(tx.recordOccurrences).toHaveBeenCalledWith([occurrence(1), occurrence(2)]);

		const plan = {
			occurrences: [NOW],
			skippedOccurrences: 0,
			catchUpAt: null,
			nextRunAt: new Date('2026-01-01T00:00:10.000Z'),
			lastFiredAt: NOW,
		};
		expect(tx.advanceJobs).toHaveBeenCalledWith([
			{ job: makeJob(1), plan },
			{ job: makeJob(2), plan },
		]);
	});

	it('groups the discarded backlog by task type and policy', async () => {
		const tx = makeTx();
		// Two jobs two minutes behind: 13 due instants each, of which coalesce records
		// one and discards twelve.
		const backlogged = (id: number): ScheduledJob => ({
			...makeJob(id),
			nextRunAt: new Date('2025-12-31T23:58:00.000Z'),
		});
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [backlogged(1), backlogged(2)] });
		tx.recordOccurrences.mockResolvedValue({ recorded: 2, created: [] });

		const summary = await materialize(runnerWith(tx), options);

		expect(summary.occurrences).toBe(2);
		expect(summary.misfires).toEqual([
			{ taskType: 'test', policy: ScheduledJobMisfirePolicy.Coalesce, discarded: 24 },
		]);
	});

	it('keeps a separate count per task type and per policy', async () => {
		const tx = makeTx();
		const backlogged = (id: number, overrides: Partial<ScheduledJob>): ScheduledJob => ({
			...makeJob(id),
			nextRunAt: new Date('2025-12-31T23:58:00.000Z'),
			...overrides,
		});
		tx.claimDueJobs.mockResolvedValue({
			now: NOW,
			jobs: [
				backlogged(1, {}),
				backlogged(2, { taskType: 'poll' }),
				backlogged(3, { misfirePolicy: ScheduledJobMisfirePolicy.Skip }),
			],
		});
		tx.recordOccurrences.mockResolvedValue({ recorded: 2, created: [] });

		const summary = await materialize(runnerWith(tx), options);

		expect(summary.misfires).toEqual([
			{ taskType: 'test', policy: ScheduledJobMisfirePolicy.Coalesce, discarded: 12 },
			{ taskType: 'poll', policy: ScheduledJobMisfirePolicy.Coalesce, discarded: 12 },
			{ taskType: 'test', policy: ScheduledJobMisfirePolicy.Skip, discarded: 13 },
		]);
	});

	it('makes a catch-up run visible now, keeping the instant it was due for', async () => {
		const tx = makeTx();
		const dueAt = new Date('2025-12-31T23:58:00.000Z');
		tx.claimDueJobs.mockResolvedValue({
			now: NOW,
			jobs: [{ ...makeJob(1), nextRunAt: dueAt }],
		});
		tx.recordOccurrences.mockResolvedValue({ recorded: 1, created: [] });

		await materialize(runnerWith(tx), options);

		expect(tx.recordOccurrences).toHaveBeenCalledWith([
			expect.objectContaining({
				scheduledFor: NOW,
				runAt: NOW,
				// Visible now, so its grace starts now rather than at the instant it stands in for.
				missedAfter: new Date('2026-01-01T00:01:00.000Z'),
			}),
		]);
	});

	it('retires the occurrences a catch-up run supersedes', async () => {
		const tx = makeTx();
		const dueAt = new Date('2025-12-31T23:58:00.000Z');
		tx.claimDueJobs.mockResolvedValue({
			now: NOW,
			jobs: [{ ...makeJob(1), nextRunAt: dueAt }],
		});
		tx.recordOccurrences.mockResolvedValue({ recorded: 1, created: [] });
		tx.retireSuperseded.mockResolvedValue(3);

		const summary = await materialize(runnerWith(tx), options);

		expect(tx.retireSuperseded).toHaveBeenCalledWith([{ jobId: 1, before: NOW }]);
		expect(summary.retiredOccurrences).toBe(3);
	});

	it('retires nothing when no policy applied', async () => {
		const tx = makeTx();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [makeJob(1)] });
		tx.recordOccurrences.mockResolvedValue({ recorded: 1, created: [] });

		await materialize(runnerWith(tx), options);

		expect(tx.retireSuperseded).toHaveBeenCalledWith([]);
	});

	it('retires nothing under skip, which never plans a catch-up run', async () => {
		const tx = makeTx();
		tx.claimDueJobs.mockResolvedValue({
			now: NOW,
			jobs: [{ ...makeSkipJob(1), nextRunAt: new Date('2025-12-31T23:58:00.000Z') }],
		});
		tx.recordOccurrences.mockResolvedValue({ recorded: 0, created: [] });

		await materialize(runnerWith(tx), options);

		expect(tx.retireSuperseded).toHaveBeenCalledWith([]);
	});

	it('gives an occurrence a deadline measured from its own instant', async () => {
		const tx = makeTx();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [makeSkipJob(1)] });
		tx.recordOccurrences.mockResolvedValue({ recorded: 1, created: [] });

		await materialize(runnerWith(tx), options);

		expect(tx.recordOccurrences).toHaveBeenCalledWith([
			expect.objectContaining({
				runAt: NOW,
				missedAfter: new Date('2026-01-01T00:01:00.000Z'),
			}),
		]);
	});

	it('measures a late-recorded occurrence deadline from now, not from when it came due', async () => {
		const tx = makeTx();
		// Due 59s ago, inside its 60s grace: measuring from that instant would leave the
		// row one second of life.
		const dueAt = new Date('2025-12-31T23:59:01.000Z');
		tx.claimDueJobs.mockResolvedValue({
			now: NOW,
			jobs: [{ ...makeSkipJob(1), nextRunAt: dueAt, intervalSeconds: 3600 }],
		});
		tx.recordOccurrences.mockResolvedValue({ recorded: 1, created: [] });

		await materialize(runnerWith(tx), options);

		expect(tx.recordOccurrences).toHaveBeenCalledWith([
			expect.objectContaining({
				scheduledFor: dueAt,
				runAt: dueAt,
				missedAfter: new Date('2026-01-01T00:01:00.000Z'),
			}),
		]);
	});

	it('gives a coalesce occurrence a deadline too, so a stale one stops being claimable', async () => {
		const tx = makeTx();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [makeJob(1)] });
		tx.recordOccurrences.mockResolvedValue({ recorded: 1, created: [] });

		await materialize(runnerWith(tx), options);

		expect(tx.recordOccurrences).toHaveBeenCalledWith([
			expect.objectContaining({ missedAfter: new Date('2026-01-01T00:01:00.000Z') }),
		]);
	});

	it('claims at most batchSize jobs', async () => {
		const tx = makeTx();
		tx.claimDueJobs.mockResolvedValue(undefined);

		await materialize(runnerWith(tx), { ...options, batchSize: 25 });

		expect(tx.claimDueJobs).toHaveBeenCalledWith(25, 0);
	});

	it('claims ahead by lookaheadSeconds, passing it to the claim in milliseconds', async () => {
		const tx = makeTx();
		tx.claimDueJobs.mockResolvedValue(undefined);

		await materialize(runnerWith(tx), { ...options, batchSize: 25, lookaheadSeconds: 12 });

		// 12s of lookahead reaches the claim as 12_000ms, so a job due within the next
		// poll interval is claimed now instead of a whole tick after it comes due.
		expect(tx.claimDueJobs).toHaveBeenCalledWith(25, 12_000);
	});

	it('reports skipped duplicates, and a throwing reporter does not fail the pass', async () => {
		const tx = makeTx();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [makeJob(1), makeJob(2)] });
		// Two planned, one already recorded (e.g. by a concurrent pass).
		tx.recordOccurrences.mockResolvedValue({ recorded: 1, created: [] });
		const onSkippedDuplicates = vi.fn(() => {
			throw new Error('logger down');
		});

		const summary = await materialize(runnerWith(tx), options, { onSkippedDuplicates });

		expect(onSkippedDuplicates).toHaveBeenCalledWith({ planned: 2, recorded: 1 });
		expect(summary).toEqual({
			claimedJobs: 2,
			occurrences: 1,
			created: [],
			deferredJobs: 0,
			misfires: [],
			retiredOccurrences: 0,
		});
		expect(tx.advanceJobs).toHaveBeenCalledTimes(1);
	});

	it('stays silent when every planned occurrence is newly recorded', async () => {
		const tx = makeTx();
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
		const tx = makeTx();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [good, bad] });
		tx.recordOccurrences.mockResolvedValue({ recorded: 1, created: [] });
		const onPlanError = vi.fn();

		const summary = await materialize(runnerWith(tx), options, { onPlanError });

		expect(summary).toEqual({
			claimedJobs: 2,
			occurrences: 1,
			created: [],
			deferredJobs: 1,
			misfires: [],
			retiredOccurrences: 0,
		});
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
		const tx = makeTx();
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
		const tx = makeTx();
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
		const tx = makeTx();
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
		const tx = makeTx();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [good, bad] });
		tx.recordOccurrences.mockResolvedValue({ recorded: 1, created: [] });
		// The reporter is host-supplied; a broken one must not turn a deferred job
		// into a rolled-back pass.
		const onPlanError = vi.fn(() => {
			throw new Error('logger down');
		});

		const summary = await materialize(runnerWith(tx), options, { onPlanError });

		expect(summary).toEqual({
			claimedJobs: 2,
			occurrences: 1,
			created: [],
			deferredJobs: 1,
			misfires: [],
			retiredOccurrences: 0,
		});
		expect(tx.recordOccurrences).toHaveBeenCalledTimes(1);
		expect(tx.advanceJobs).toHaveBeenCalledTimes(1);
	});
});
