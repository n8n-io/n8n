import { Time } from '@n8n/constants';

import { DEFAULT_SWEEP_OPTIONS, type SweepOptions } from './options';
import { planOccurrences } from './plan';
import type { RunInTransaction } from './transaction';
import type { ScheduledJob } from '../types';

export type { SweepOptions } from './options';

export interface SweepSummary {
	/** How many due jobs this sweep claimed. */
	claimedJobs: number;
	/** How many occurrences were newly recorded (duplicates already present don't count). */
	occurrences: number;
	/** How many claimed jobs could not be planned and were deferred (see {@link OnJobPlanError}). */
	deferredJobs: number;
}

/** Notified when a claimed job's schedule cannot be planned, before it is deferred. */
export type OnJobPlanError = (job: ScheduledJob, error: unknown) => void;

/**
 * One pass of the scheduler:
 * 1) claim the jobs whose next run is due
 * 2) turn each into its upcoming occurrences (pure: {@link planOccurrences})
 * 3) record them all in one batch
 * 4) advance every job's clock in one batch
 *
 * All in a single transaction, judged against database time. The claim and the
 * per-batch advance are one query each; the insert is chunked by the repository
 * (bounded by its chunk size), so a large backlog is several inserts, not one.
 *
 * A job whose schedule cannot be planned is isolated, not fatal: it is deferred (its
 * `nextRunAt` pushed `planRetrySeconds` out, so it is retried later instead of being
 * re-claimed and re-failing every sweep) and reported via `onPlanError`, while the
 * rest of the batch still records and advances. Otherwise one corrupt or unresolvable
 * schedule would roll back the whole transaction on every sweep and wedge scheduling
 * for all jobs. Deferring rather than dropping means a transient cause (a fixed
 * instance timezone, updated tzdata) heals on a later sweep with no operator action.
 *
 * The sweep only materializes candidates. Every due occurrence is recorded, including
 * a backlog accumulated during downtime (drained `maxPerJob` per sweep, at their
 * original past instants); whether a stale candidate still runs or is marked missed
 * is the dispatcher's policy, not the sweep's.
 *
 * Persistence sits behind the {@link RunInTransaction} it is given, so this is only
 * the algorithm and a fake runner is enough to test it.
 */
export async function sweep(
	runInTransaction: RunInTransaction,
	options: SweepOptions = DEFAULT_SWEEP_OPTIONS,
	onPlanError?: OnJobPlanError,
): Promise<SweepSummary> {
	return await runInTransaction<SweepSummary>(async (tx) => {
		const claimed = await tx.claimDueJobs(options.batchSize);
		if (claimed === undefined) {
			return { claimedJobs: 0, occurrences: 0, deferredJobs: 0 };
		}
		const { now, jobs } = claimed;

		let deferredJobs = 0;
		const occurrencesPlanned = jobs.map((job) => {
			try {
				return { job, plan: planOccurrences(job, now, options) };
			} catch (error) {
				deferredJobs++;
				onPlanError?.(job, error);
				// Defer: record nothing and retry after a backoff. Keeping nextRunAt set (never
				// null) reserves null for its one meaning: the schedule is exhausted.
				// The row passed validation at write time but can't be planned at claim time, e.g.:
				// - the job's timezone isn't in this runtime's tzdata (written on a newer/other version);
				// - the instance-default timezone a null cron timezone resolves to is misconfigured;
				// - a rolled-back instance claims a schedule written in a shape this version can't evaluate.
				const retryAt = new Date(
					now.getTime() + options.planRetrySeconds * Time.seconds.toMilliseconds,
				);
				return {
					job,
					plan: { occurrences: [], nextRunAt: retryAt, lastFiredAt: job.lastFiredAt },
				};
			}
		});
		const occurrences = await tx.recordOccurrences(occurrencesPlanned);
		await tx.advanceJobs(occurrencesPlanned);

		return { claimedJobs: jobs.length, occurrences, deferredJobs };
	});
}
