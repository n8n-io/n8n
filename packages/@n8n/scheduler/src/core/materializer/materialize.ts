import { Time } from '@n8n/constants';

import type { ScheduledJob } from '../types';
import { DEFAULT_MATERIALIZER_OPTIONS, type MaterializerOptions } from './options';
import { planOccurrences } from './plan';
import type {
	DueJobs,
	NewOccurrence,
	PlannedJob,
	RecordedOccurrence,
	RunInTransaction,
	SupersededOccurrences,
} from './transaction';

export type { MaterializerOptions } from './options';

export interface MaterializerSummary {
	/** How many due jobs this materialization claimed. */
	claimedJobs: number;
	/** How many occurrences were newly recorded (duplicates already present don't count). */
	occurrences: number;
	/**
	 * The newly recorded rows' identity, for per-row tracing at the callsite.
	 * Only as complete as the storage layer's `recordOccurrences` allows (e.g.
	 * empty on SQLite); `occurrences` is the accurate count regardless.
	 */
	created: RecordedOccurrence[];
	/** How many claimed jobs could not be planned and were deferred (see {@link OnJobPlanError}). */
	deferredJobs: number;
	/**
	 * How many due occurrences a misfire policy discarded rather than record: the
	 * size of the backlog that will never run.
	 */
	skippedOccurrences: number;
	/**
	 * How many occurrences already recorded were retired as superseded by a catch-up
	 * run: the part of the backlog that survived as rows across an outage.
	 */
	retiredOccurrences: number;
}

/** Notified when a claimed job's schedule cannot be planned, before it is deferred. */
export type OnJobPlanError = (job: ScheduledJob, error: unknown) => void;

/**
 * Observability callbacks for a materialization pass's non-fatal incidents,
 * already handled when they fire; the callsite only decides how to report them.
 */
export interface MaterializerHooks {
	onPlanError?: OnJobPlanError;

	/**
	 * Some planned occurrences already existed and were skipped: the idempotent
	 * step at work (e.g. a concurrent pass recorded them first), not a fault.
	 */
	onSkippedDuplicates?: (context: { planned: number; recorded: number }) => void;
}

/**
 * One materialization pass of the scheduler:
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
 * re-claimed and re-failing every pass) and reported via `onPlanError`, while the
 * rest of the batch still records and advances. Otherwise one corrupt or unresolvable
 * schedule would roll back the whole transaction on every pass and wedge scheduling
 * for all jobs. Deferring rather than dropping means a transient cause (a fixed
 * instance timezone, updated tzdata) heals on a later pass with no operator action.
 *
 * A backlog accumulated during downtime is drained `maxPerJob` per pass, at the
 * occurrences' original past instants, minus whatever `planOccurrences` discards. The
 * discarding commits with the job's clock advance, so no two instances disagree about
 * what the backlog produced.
 *
 * Recording up to `windowSeconds` ahead means a frequent schedule doesn't need a
 * materialization per fire. The flip side: occurrences already materialized are not
 * retracted, so a disable or edit can lag up to the window unless the job-write path
 * cancels pending tasks.
 *
 * Persistence sits behind the {@link RunInTransaction} it is given, so this is only
 * the algorithm and a fake runner is enough to test it.
 *
 * Cancellation (`signal`, aborted when the driving loop times the pass out or
 * shuts down) is all-or-nothing, because the pass is one transaction: at each
 * checkpoint after an await, an observed abort throws, the transaction rolls
 * back, and the pass leaves no trace — the claim is undone and the same jobs
 * are simply due again for the next (or another instance's) pass.
 */
export async function materialize(
	runInTransaction: RunInTransaction,
	options: MaterializerOptions = DEFAULT_MATERIALIZER_OPTIONS,
	hooks: MaterializerHooks = {},
	signal?: AbortSignal,
): Promise<MaterializerSummary> {
	signal?.throwIfAborted();
	return await runInTransaction<MaterializerSummary>(async (tx) => {
		const lookaheadMs = options.lookaheadSeconds * Time.seconds.toMilliseconds;
		const claimed = await tx.claimDueJobs(options.batchSize, lookaheadMs);
		signal?.throwIfAborted();
		if (claimed === undefined) {
			return {
				claimedJobs: 0,
				occurrences: 0,
				created: [],
				deferredJobs: 0,
				skippedOccurrences: 0,
				retiredOccurrences: 0,
			};
		}
		const { occurrencesPlanned, numberOfJobsDeferred } = planOrDeferJobs(
			claimed,
			options,
			hooks.onPlanError,
		);
		const rows = toNewOccurrences(occurrencesPlanned, claimed.now);
		const { recorded, created } = await tx.recordOccurrences(rows);
		signal?.throwIfAborted();
		const retiredOccurrences = await tx.retireSuperseded(toSuperseded(occurrencesPlanned));
		signal?.throwIfAborted();
		if (recorded < rows.length) {
			try {
				hooks.onSkippedDuplicates?.({ planned: rows.length, recorded });
			} catch {
				// A broken reporter must not roll back the pass.
			}
		}
		await tx.advanceJobs(occurrencesPlanned);

		return {
			claimedJobs: claimed.jobs.length,
			occurrences: recorded,
			created,
			deferredJobs: numberOfJobsDeferred,
			skippedOccurrences: occurrencesPlanned.reduce(
				(total, { plan }) => total + plan.skippedOccurrences,
				0,
			),
			retiredOccurrences,
		};
	});
}

/** Flattens every planned occurrence into the row the storage layer inserts. */
function toNewOccurrences(planned: PlannedJob[], now: Date): NewOccurrence[] {
	return planned.flatMap(({ job, plan }) =>
		plan.occurrences.map((when) => {
			const runAt = when.getTime() === plan.catchUpAt?.getTime() ? now : when;
			// When the row actually becomes claimable, which is never before `now`.
			const visibleAt = Math.max(runAt.getTime(), now.getTime());
			return {
				jobId: job.id,
				taskType: job.taskType,
				payload: job.payload,
				scheduledFor: when,
				runAt,
				maxAttempts: job.maxAttempts,
				missedAfter: new Date(visibleAt + job.misfireGraceSeconds * Time.seconds.toMilliseconds),
			};
		}),
	);
}

/** The jobs whose plan recorded a catch-up run, paired with that instant. */
function toSuperseded(planned: PlannedJob[]): SupersededOccurrences[] {
	return planned.flatMap(({ job, plan }) =>
		plan.catchUpAt === null ? [] : [{ jobId: job.id, before: plan.catchUpAt }],
	);
}

function planOrDeferJobs(
	dueJobs: DueJobs,
	options: MaterializerOptions,
	onPlanError?: OnJobPlanError,
): {
	occurrencesPlanned: PlannedJob[];
	numberOfJobsDeferred: number;
} {
	const plans = dueJobs.jobs.map((job) => planOrDeferJob(job, dueJobs.now, options, onPlanError));
	return {
		occurrencesPlanned: plans.map(({ plannedJob }) => plannedJob),
		numberOfJobsDeferred: plans.filter(({ deferred }) => deferred).length,
	};
}

function planOrDeferJob(
	job: ScheduledJob,
	now: Date,
	options: MaterializerOptions,
	onPlanError?: OnJobPlanError,
): {
	plannedJob: PlannedJob;
	deferred: boolean;
} {
	try {
		return {
			plannedJob: { job, plan: planOccurrences(job, now, options) },
			deferred: false,
		};
	} catch (error) {
		try {
			onPlanError?.(job, error);
		} catch {
			// The pass still owns the other jobs.
		}
		// Defer: record nothing and retry after a backoff. Keeping nextRunAt set (never
		// null) reserves null for its one meaning: the schedule is exhausted.
		// The row passed validation at write time but can't be planned at claim time, e.g.:
		// - the row is missing a column its kind guarantees (corrupt or hand-edited);
		// - the job's timezone isn't in this runtime's tzdata (written on a newer/other version);
		// - the instance-default timezone a null cron timezone resolves to is misconfigured;
		// - a rolled-back instance claims a schedule written in a shape this version can't evaluate.
		const retryAt = new Date(
			now.getTime() + options.planRetrySeconds * Time.seconds.toMilliseconds,
		);
		return {
			plannedJob: {
				job,
				plan: {
					occurrences: [],
					skippedOccurrences: 0,
					catchUpAt: null,
					nextRunAt: retryAt,
					lastFiredAt: job.lastFiredAt,
				},
			},
			deferred: true,
		};
	}
}
