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
	/** How many claimed jobs could not be planned and were parked (see {@link OnJobPlanError}). */
	parkedJobs: number;
}

/** Notified when a claimed job's schedule cannot be planned, before it is parked. */
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
 * A job whose schedule cannot be planned is isolated, not fatal: it is parked (its
 * `nextRunAt` cleared so it drops out of the claim window instead of being re-claimed
 * and re-failing every sweep) and reported via `onPlanError`, while the rest of the
 * batch still records and advances. Otherwise one corrupt or unresolvable schedule
 * would roll back the whole transaction on every sweep and wedge scheduling for all jobs.
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
			return { claimedJobs: 0, occurrences: 0, parkedJobs: 0 };
		}
		const { now, jobs } = claimed;

		let parkedJobs = 0;
		const occurrencesPlanned = jobs.map((job) => {
			try {
				return { job, plan: planOccurrences(job, now, options) };
			} catch (error) {
				parkedJobs++;
				onPlanError?.(job, error);
				// Park: clear nextRunAt so this job stops being claimed, record nothing for it.
				return { job, plan: { occurrences: [], nextRunAt: null, lastFiredAt: job.lastFiredAt } };
			}
		});
		const occurrences = await tx.recordOccurrences(occurrencesPlanned);
		await tx.advanceJobs(occurrencesPlanned);

		return { claimedJobs: jobs.length, occurrences, parkedJobs };
	});
}
