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

		expect(summary).toEqual({ claimedJobs: 0, occurrences: 0, deferredJobs: 0 });
		expect(tx.recordOccurrences).not.toHaveBeenCalled();
		expect(tx.advanceJobs).not.toHaveBeenCalled();
	});

	it('records occurrences and advances each claimed job', async () => {
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [makeJob(1), makeJob(2)] });
		// windowSeconds: 0 means one occurrence per job: the due fire, both newly recorded.
		tx.recordOccurrences.mockResolvedValue(2);

		const summary = await materialize(runnerWith(tx), options);

		// The summary reports the count `recordOccurrences` returned, not the plan's size.
		expect(summary).toEqual({ claimedJobs: 2, occurrences: 2, deferredJobs: 0 });

		// One insert and one update for the whole batch, not a pair per job.
		expect(tx.recordOccurrences).toHaveBeenCalledTimes(1);
		expect(tx.advanceJobs).toHaveBeenCalledTimes(1);

		const plan = {
			occurrences: [NOW],
			nextRunAt: new Date('2026-01-01T00:00:10.000Z'),
			lastFiredAt: NOW,
		};
		const planned = [
			{ job: makeJob(1), plan },
			{ job: makeJob(2), plan },
		];
		expect(tx.recordOccurrences).toHaveBeenCalledWith(planned);
		expect(tx.advanceJobs).toHaveBeenCalledWith(planned);
	});

	it('claims at most batchSize jobs', async () => {
		const tx = mock<MaterializerTransaction>();
		tx.claimDueJobs.mockResolvedValue(undefined);

		await materialize(runnerWith(tx), { ...options, batchSize: 25 });

		expect(tx.claimDueJobs).toHaveBeenCalledWith(25);
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
		tx.recordOccurrences.mockResolvedValue(1);
		const onPlanError = vi.fn();

		const summary = await materialize(runnerWith(tx), options, onPlanError);

		expect(summary).toEqual({ claimedJobs: 2, occurrences: 1, deferredJobs: 1 });
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
});
