import type { CronExpression } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { Schedule, ScheduledJob } from '../../types';
import { sweep, type SweepOptions } from '../sweep';
import type { RunInTransaction, SweepTransaction } from '../transaction';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const every10s: Schedule = { kind: 'interval', intervalSeconds: 10 };

const makeJob = (id: string): ScheduledJob => ({
	id,
	taskType: 'test',
	payload: {},
	schedule: every10s,
	enabled: true,
	nextRunAt: NOW,
	lastFiredAt: null,
	maxAttempts: 1,
});

/** A transaction runner that hands `work` the given operations, without a real transaction. */
const runnerWith =
	(tx: SweepTransaction): RunInTransaction =>
	async (work) =>
		await work(tx);

const options: SweepOptions = { windowSeconds: 0, batchSize: 25, maxPerJob: 100 };

describe('sweep', () => {
	it('does nothing when no jobs are due', async () => {
		const tx = mock<SweepTransaction>();
		tx.claimDueJobs.mockResolvedValue(undefined);

		const summary = await sweep(runnerWith(tx), options);

		expect(summary).toEqual({ claimedJobs: 0, occurrences: 0, parkedJobs: 0 });
		expect(tx.recordOccurrences).not.toHaveBeenCalled();
		expect(tx.advanceJobs).not.toHaveBeenCalled();
	});

	it('records occurrences and advances each claimed job', async () => {
		const tx = mock<SweepTransaction>();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [makeJob('a'), makeJob('b')] });
		// windowSeconds: 0 means one occurrence per job: the due fire, both newly recorded.
		tx.recordOccurrences.mockResolvedValue(2);

		const summary = await sweep(runnerWith(tx), options);

		// The summary reports the count `recordOccurrences` returned, not the plan's size.
		expect(summary).toEqual({ claimedJobs: 2, occurrences: 2, parkedJobs: 0 });

		// One insert and one update for the whole batch, not a pair per job.
		expect(tx.recordOccurrences).toHaveBeenCalledTimes(1);
		expect(tx.advanceJobs).toHaveBeenCalledTimes(1);

		const plan = {
			occurrences: [NOW],
			nextRunAt: new Date('2026-01-01T00:00:10.000Z'),
			lastFiredAt: NOW,
		};
		const planned = [
			{ job: makeJob('a'), plan },
			{ job: makeJob('b'), plan },
		];
		expect(tx.recordOccurrences).toHaveBeenCalledWith(planned);
		expect(tx.advanceJobs).toHaveBeenCalledWith(planned);
	});

	it('claims at most batchSize jobs', async () => {
		const tx = mock<SweepTransaction>();
		tx.claimDueJobs.mockResolvedValue(undefined);

		await sweep(runnerWith(tx), { ...options, batchSize: 25 });

		expect(tx.claimDueJobs).toHaveBeenCalledWith(25);
	});

	it('parks an un-plannable job instead of failing the whole batch', async () => {
		const good = makeJob('good');
		// A cron job with an unresolved (null) timezone: planning throws for this one.
		const bad: ScheduledJob = {
			...makeJob('bad'),
			schedule: { kind: 'cron', cronExpression: '0 0 9 * * *' as CronExpression, timezone: null },
		};
		const tx = mock<SweepTransaction>();
		tx.claimDueJobs.mockResolvedValue({ now: NOW, jobs: [good, bad] });
		tx.recordOccurrences.mockResolvedValue(1);
		const onPlanError = vi.fn();

		const summary = await sweep(runnerWith(tx), options, onPlanError);

		expect(summary).toEqual({ claimedJobs: 2, occurrences: 1, parkedJobs: 1 });
		expect(onPlanError).toHaveBeenCalledTimes(1);
		expect(onPlanError).toHaveBeenCalledWith(bad, expect.anything());

		// The good job plans normally; the bad one is parked (nextRunAt cleared, nothing recorded).
		const planned = tx.advanceJobs.mock.calls[0][0];
		const goodPlan = planned.find((p) => p.job.id === 'good')!.plan;
		const badPlan = planned.find((p) => p.job.id === 'bad')!.plan;
		expect(goodPlan.occurrences).toEqual([NOW]);
		expect(badPlan.occurrences).toEqual([]);
		expect(badPlan.nextRunAt).toBeNull();
	});
});
