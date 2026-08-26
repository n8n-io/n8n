import { ensureError } from '@n8n/utils/errors/ensure-error';

import { DEFAULT_RECONCILIATION_OPTIONS, type ReconciliationOptions } from './options';
import type { ScheduledJobOwnerRegistry, ScheduledJobOwnerResolver } from './owner';
import type { QuarantinedJob, ReconciliationJobStore } from './store';
import { computeFirstRunAt } from '../recurrence/next-run';
import { resolveSchedule } from '../recurrence/resolve';

/** What one pass did, for reporting and for tests to assert on. */
export interface ReconciliationSummary {
	/** Owners checked against their resolver. */
	ownersChecked: number;
	/** Jobs newly disabled and stamped, starting their quarantine. */
	quarantined: number;
	/** Quarantined jobs whose grace ran out, deleted. */
	deleted: number;
	/** Quarantined jobs whose owner turned out to exist after all, re-enabled. */
	revived: number;
	/**
	 * Owner types left entirely untouched this pass: no resolver claimed them, or
	 * their resolver failed. "Could not tell" is never read as "gone".
	 */
	skippedOwnerTypes: string[];
	/**
	 * Whether everything settled was covered.
	 * `false` means the pass spent its page budget or was cancelled first.
	 * The next pass covers what this one did not.
	 */
	drained: boolean;
}

/** Incidents and notable outcomes of a pass, for the host to report. */
export interface ReconciliationHooks {
	/** An owner type has jobs but nothing claimed it; its jobs were left alone. */
	onUnclaimedOwnerType?: (ownerType: string) => void;
	/** A resolver threw; the rest of its owner type's walk was abandoned. */
	onResolverFailed?: (ownerType: string, error: Error) => void;
	/** Jobs were newly quarantined. */
	onQuarantined?: (context: { ownerType: string; owners: number; jobs: number }) => void;
	/** Quarantined jobs past their grace were deleted. */
	onDeleted?: (context: { ownerType: string; jobs: number }) => void;
	/** Quarantined jobs were re-enabled. */
	onRevived?: (context: { ownerType: string; ownerIds: string[]; jobs: number }) => void;
	/** A revived job's stored schedule could not be planned; it revived clock-dead. */
	onReviveClockFailed?: (context: { jobId: number; error: Error }) => void;
}

/**
 * One owner reconciliation pass: the safety net behind synchronous
 * deprovisioning, finding scheduled jobs whose owner no longer exists and
 * retiring them.
 *
 * Owners are deleted by the modules that create them, and each of those
 * deletions removes the owner's jobs in its own transaction. This pass exists
 * for the cases that path cannot cover: a process killed between the two
 * writes, a teardown path added before it learned about scheduled jobs, an
 * owner removed straight from storage.
 *
 * Because it acts on an answer from code it does not own, it never deletes on
 * first sight:
 *
 * - a job whose owner is reported gone is **disabled and stamped**
 *   (`orphanedAt`), and its queued occurrences are withdrawn in the same
 *   transaction, so it stops firing immediately;
 * - it is **deleted only once that stamp is older than the quarantine grace**,
 *   and only while its owner is still reported gone;
 * - a stamped job whose owner is reported alive again is **re-enabled** with a
 *   freshly computed clock, so a resolver bug corrected inside the grace window
 *   destroys nothing (see {@link revive} for the limits of a revival).
 *
 * A resolver that throws, or an owner type nothing claimed, leaves every job of
 * that type exactly as it was: absence of an answer is never treated as an
 * answer. Jobs younger than the settle period are also left out, so an owner
 * written just after its jobs is never mistaken for one that never existed.
 *
 * Safe to run concurrently across instances: each step is an idempotent,
 * owner-scoped statement, so concurrent passes converge instead of conflicting.
 *
 * Cancellation (`signal`) is page-granular, because each step is its own
 * committed statement: the pass reads no further pages, keeps what it already
 * wrote, and reports itself not drained — exactly like a spent page budget.
 *
 * @param now reads the clock the settle and grace windows are judged against;
 * every instance must agree on it (in production, the store's clock).
 */
export async function reconcile(
	store: ReconciliationJobStore,
	owners: ScheduledJobOwnerRegistry,
	now: () => Promise<Date>,
	options: ReconciliationOptions = DEFAULT_RECONCILIATION_OPTIONS,
	hooks: ReconciliationHooks = {},
	signal?: AbortSignal,
): Promise<ReconciliationSummary> {
	const summary: ReconciliationSummary = {
		ownersChecked: 0,
		quarantined: 0,
		deleted: 0,
		revived: 0,
		skippedOwnerTypes: [],
		drained: true,
	};

	const at = await now();
	const clock: SweepClock = {
		now: at,
		settledBefore: secondsBefore(at, options.settleSeconds),
		quarantinedBefore: secondsBefore(at, options.quarantineGraceSeconds),
	};
	let budget = options.maxPagesPerPass;

	for (const ownerType of await store.findOwnerTypes()) {
		if (signal?.aborted === true || budget <= 0) {
			summary.drained = false;
			break;
		}

		const resolver = owners.resolverFor(ownerType);
		if (resolver === undefined) {
			summary.skippedOwnerTypes.push(ownerType);
			hooks.onUnclaimedOwnerType?.(ownerType);
			continue;
		}

		const swept = await sweepOwnerType(
			store,
			ownerType,
			resolver,
			clock,
			{ ...options, maxPagesPerPass: budget },
			now,
			hooks,
			signal,
		);
		budget -= swept.pages;
		if (swept.skipped) {
			summary.skippedOwnerTypes.push(ownerType);
		}
		summary.drained &&= swept.drained;
		summary.ownersChecked += swept.totals.ownersChecked;
		summary.quarantined += swept.totals.quarantined;
		summary.deleted += swept.totals.deleted;
		summary.revived += swept.totals.revived;
	}

	return summary;
}

interface SweepClock {
	now: Date;
	settledBefore: Date;
	quarantinedBefore: Date;
}

type SweepTotals = Pick<
	ReconciliationSummary,
	'ownersChecked' | 'quarantined' | 'deleted' | 'revived'
>;

interface SweepResult {
	totals: SweepTotals;
	/** The walk stopped on a resolver failure; the owner type counts as skipped. */
	skipped: boolean;
	/** Pages read, charged against the pass's shared budget. */
	pages: number;
	/** `false` when the budget or a cancellation ended the walk early. */
	drained: boolean;
}

/**
 * Walk one owner type's owners in `ownerId` pages. A resolver failure abandons
 * the rest of the walk; pages that completed before it still count, since their
 * writes are committed.
 */
async function sweepOwnerType(
	store: ReconciliationJobStore,
	ownerType: string,
	resolver: ScheduledJobOwnerResolver,
	clock: SweepClock,
	options: ReconciliationOptions,
	now: () => Promise<Date>,
	hooks: ReconciliationHooks,
	signal?: AbortSignal,
): Promise<SweepResult> {
	const totals: SweepTotals = { ownersChecked: 0, quarantined: 0, deleted: 0, revived: 0 };
	let pages = 0;
	let after: string | undefined;

	while (true) {
		if (signal?.aborted === true || pages >= options.maxPagesPerPass) {
			return { totals, skipped: false, pages, drained: false };
		}

		const ownerIds = await store.findOwnerIds(
			ownerType,
			clock.settledBefore,
			options.batchSize,
			after,
		);
		pages += 1;
		if (ownerIds.length === 0) {
			break;
		}
		after = ownerIds[ownerIds.length - 1];

		let existing: Set<string>;
		try {
			existing = await resolver.findExisting(ownerIds);
		} catch (error) {
			hooks.onResolverFailed?.(ownerType, ensureError(error));
			return { totals, skipped: true, pages, drained: true };
		}

		const missing = ownerIds.filter((ownerId) => !existing.has(ownerId));
		const alive = ownerIds.filter((ownerId) => existing.has(ownerId));
		totals.ownersChecked += ownerIds.length;

		totals.quarantined += await quarantine(store, ownerType, missing, clock, hooks);
		totals.deleted += await deleteExpired(
			store,
			ownerType,
			missing,
			clock.quarantinedBefore,
			hooks,
		);
		totals.revived += await revive(store, ownerType, alive, now, options, hooks);

		if (ownerIds.length < options.batchSize) {
			break;
		}
	}

	return { totals, skipped: false, pages, drained: true };
}

/**
 * Disable and stamp the not-yet-quarantined jobs of owners reported gone, and
 * withdraw their queued occurrences so nothing already materialized still fires.
 */
async function quarantine(
	store: ReconciliationJobStore,
	ownerType: string,
	ownerIds: string[],
	clock: SweepClock,
	hooks: ReconciliationHooks,
): Promise<number> {
	if (ownerIds.length === 0) {
		return 0;
	}

	const quarantined = await store.quarantineByOwnerIds(
		ownerType,
		ownerIds,
		clock.now,
		clock.settledBefore,
	);
	if (quarantined > 0) {
		hooks.onQuarantined?.({ ownerType, owners: ownerIds.length, jobs: quarantined });
	}
	return quarantined;
}

async function deleteExpired(
	store: ReconciliationJobStore,
	ownerType: string,
	ownerIds: string[],
	quarantinedBefore: Date,
	hooks: ReconciliationHooks,
): Promise<number> {
	if (ownerIds.length === 0) {
		return 0;
	}

	const deleted = await store.deleteQuarantinedByOwnerIds(ownerType, ownerIds, quarantinedBefore);
	if (deleted > 0) {
		hooks.onDeleted?.({ ownerType, jobs: deleted });
	}
	return deleted;
}

/**
 * Lift the quarantine on jobs whose owner exists after all: a resolver that
 * was wrong, or an owner recreated under the same id. Each job's clock is
 * recomputed from its stored schedule, so it resumes at its next instant
 * rather than replaying the quarantine.
 *
 * A resolver answers existence, not intent, so a job is restored exactly as it
 * was stored, including one the owner would no longer provision (a member
 * dropped while its jobs were quarantined). Reconciling the set back to what
 * the owner wants stays the owner's own job, done by provisioning it again.
 */
async function revive(
	store: ReconciliationJobStore,
	ownerType: string,
	ownerIds: string[],
	now: () => Promise<Date>,
	options: ReconciliationOptions,
	hooks: ReconciliationHooks,
): Promise<number> {
	if (ownerIds.length === 0) {
		return 0;
	}

	const quarantined = await store.findQuarantinedByOwnerIds(ownerType, ownerIds);
	if (quarantined.length === 0) {
		return 0;
	}

	const from = await now();
	let revived = 0;
	for (const job of quarantined) {
		revived += await store.liftQuarantine(
			job.id,
			nextRunAtFor(job, from, options.defaultTimezone, hooks),
		);
	}

	if (revived > 0) {
		hooks.onRevived?.({
			ownerType,
			ownerIds: [...new Set(quarantined.map((job) => job.ownerId))],
			jobs: revived,
		});
	}
	return revived;
}

/**
 * A schedule that can no longer be planned (an unknown timezone, a one-off
 * whose instant has passed, a hand-corrupted row) revives clock-dead rather
 * than blocking the whole sweep: the job is enabled again but records nothing
 * until it is reprovisioned.
 */
function nextRunAtFor(
	job: QuarantinedJob,
	from: Date,
	defaultTimezone: string,
	hooks: ReconciliationHooks,
): Date | null {
	try {
		return computeFirstRunAt(resolveSchedule(job, defaultTimezone), from);
	} catch (error) {
		hooks.onReviveClockFailed?.({ jobId: job.id, error: ensureError(error) });
		return null;
	}
}

function secondsBefore(instant: Date, seconds: number): Date {
	return new Date(instant.getTime() - seconds * 1000);
}
