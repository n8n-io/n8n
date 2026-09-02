import { ensureError } from '@n8n/utils/errors/ensure-error';

import { DEFAULT_RECONCILIATION_OPTIONS, type ReconciliationOptions } from './options';
import type { ScheduledJobOwnerRegistry, ScheduledJobOwnerResolver } from './owner';
import type { QuarantinedJob, ReconciliationJobStore } from './store';
import { computeFirstRunAt } from '../recurrence/next-run';
import { resolveSchedule } from '../recurrence/resolve';

/** Where a bounded pass stopped, so the next one resumes there. */
export interface ReconciliationCursor {
	/** The owner type to continue with. */
	ownerType: string;
	/** Exclusive lower bound on `ownerId`. Omit to start at that type's first owner. */
	after?: string;
}

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
	 * Owner types left exactly as they were, because nothing claimed them or
	 * their resolver failed before its first answer. A resolver that failed
	 * part-way through a type is absent here and reported through `drained`.
	 */
	skippedOwnerTypes: string[];
	/**
	 * Whether every settled owner was covered. `false` when the pass spent its
	 * page budget, was cancelled, skipped an unclaimed owner type, or lost an
	 * owner type to a resolver failure.
	 */
	drained: boolean;
	/** Where the next pass should resume. Set whenever the walk stopped short. */
	resumeFrom?: ReconciliationCursor;
}

/**
 * Incidents and outcomes of a pass, for the host to report. A hook that throws
 * is swallowed, so reporting never changes what the pass does.
 */
export interface ReconciliationHooks {
	/** An owner type has jobs but nothing claimed it. Its jobs were left alone. */
	onUnclaimedOwnerType?: (ownerType: string) => void;
	/** A resolver threw. The rest of that owner type's walk was abandoned. */
	onResolverFailed?: (ownerType: string, error: Error) => void;
	/** Jobs were newly quarantined. */
	onQuarantined?: (context: { ownerType: string; jobs: number }) => void;
	/** Quarantined jobs past their grace were deleted. */
	onDeleted?: (context: { ownerType: string; jobs: number }) => void;
	/** Quarantined jobs were re-enabled. */
	onRevived?: (context: { ownerType: string; ownerIds: string[]; jobs: number }) => void;
	/** A revived job's schedule could not be planned. It revived with no clock. */
	onReviveClockFailed?: (context: { jobId: number; error: Error }) => void;
}

/**
 * One owner reconciliation pass: the safety net behind synchronous
 * deprovisioning. Finds scheduled jobs whose owner no longer exists and retires
 * them, covering what a module's own delete transaction missed.
 *
 * Never deletes on first sight. A job whose owner is reported gone is disabled
 * and stamped, with its queued occurrences withdrawn in the same transaction.
 * It is deleted only once that stamp outlives the quarantine grace, and one
 * whose owner is reported alive again is re-enabled with a fresh clock (see
 * {@link revive}). No answer is never read as an answer: an unclaimed owner
 * type, a resolver that threw, and a job younger than the settle period are all
 * left untouched.
 *
 * Safe to run concurrently across instances, since every step is an idempotent
 * owner-scoped statement. Reads at most `maxPagesPerPass` owner pages in a
 * stable order and reports the rest as `resumeFrom`. Cancellation takes effect
 * between pages and between quarantine lifts, keeping what was written.
 *
 * @param now the clock the settle and grace windows are judged against. Every
 * instance must agree on it.
 * @param resumeFrom where to continue. Omit to start at the first owner type.
 */
export async function reconcile(
	store: ReconciliationJobStore,
	owners: ScheduledJobOwnerRegistry,
	now: () => Promise<Date>,
	options: ReconciliationOptions = DEFAULT_RECONCILIATION_OPTIONS,
	hooks: ReconciliationHooks = {},
	signal?: AbortSignal,
	resumeFrom?: ReconciliationCursor,
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

	// Sorted, so a cursor taken from one pass names a resume point in the next.
	const ownerTypes = (await store.findOwnerTypes()).sort();

	for (const ownerType of pendingOwnerTypes(ownerTypes, resumeFrom?.ownerType)) {
		if (signal?.aborted === true || budget <= 0) {
			summary.drained = false;
			summary.resumeFrom ??= { ownerType };
			break;
		}

		const resolver = owners.resolverFor(ownerType);
		if (resolver === undefined) {
			summary.skippedOwnerTypes.push(ownerType);
			summary.drained = false;
			notify(() => hooks.onUnclaimedOwnerType?.(ownerType));
			continue;
		}

		const swept = await sweepOwnerType(
			{
				store,
				ownerType,
				resolver,
				clock,
				options: { ...options, maxPagesPerPass: budget },
				now,
				hooks,
				signal,
			},
			ownerType === resumeFrom?.ownerType ? resumeFrom.after : undefined,
		);
		budget -= swept.pages;
		if (swept.outcome === 'stopped') {
			summary.resumeFrom ??= { ownerType, after: swept.after };
		}
		// Only a failure before the type's first answer left it untouched.
		if (swept.outcome === 'failed' && swept.totals.ownersChecked === 0) {
			summary.skippedOwnerTypes.push(ownerType);
		}
		summary.drained &&= swept.outcome === 'drained';
		summary.ownersChecked += swept.totals.ownersChecked;
		summary.quarantined += swept.totals.quarantined;
		summary.deleted += swept.totals.deleted;
		summary.revived += swept.totals.revived;
	}

	return summary;
}

/**
 * The owner types left to walk, starting at `from`. A cursor whose type is gone
 * continues at the next one, and a cursor past every type starts over.
 */
function pendingOwnerTypes(ownerTypes: string[], from?: string): string[] {
	if (from === undefined) {
		return ownerTypes;
	}
	const start = ownerTypes.findIndex((ownerType) => ownerType >= from);
	return start === -1 ? ownerTypes : ownerTypes.slice(start);
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

/**
 * How one owner type's walk ended. `drained` covered every settled owner,
 * `stopped` ran out of budget or was cancelled, `failed` lost the rest of the
 * type to a resolver that threw.
 */
type SweepOutcome = 'drained' | 'stopped' | 'failed';

interface SweepResult {
	totals: SweepTotals;
	/** Pages read, charged against the pass's shared budget. */
	pages: number;
	outcome: SweepOutcome;
	/** Last owner id read, the resume point of a `stopped` walk. */
	after?: string;
}

/** What one owner type's walk is parameterized by, fixed for its whole run. */
interface Sweep {
	store: ReconciliationJobStore;
	ownerType: string;
	resolver: ScheduledJobOwnerResolver;
	clock: SweepClock;
	options: ReconciliationOptions;
	now: () => Promise<Date>;
	hooks: ReconciliationHooks;
	signal?: AbortSignal;
}

/** How one page ended, and where the walk continues after it. */
type PageResult =
	| { outcome: 'swept'; totals: SweepTotals; after: string }
	| { outcome: 'drained'; totals: SweepTotals }
	| { outcome: 'unfinished'; totals: SweepTotals }
	| { outcome: 'failed'; totals: SweepTotals };

/**
 * Walk one owner type's owners in `ownerId` pages from `startAfter` on, within
 * the page budget. A resolver failure abandons the rest of the walk, but pages
 * already committed still count.
 */
async function sweepOwnerType(sweep: Sweep, startAfter?: string): Promise<SweepResult> {
	let totals = noTotals();
	let after = startAfter;
	let pages = 0;

	while (pages < sweep.options.maxPagesPerPass) {
		if (sweep.signal?.aborted === true) {
			return { totals, pages, outcome: 'stopped', after };
		}

		const page = await sweepPage(sweep, after);
		pages += 1;
		totals = addTotals(totals, page.totals);

		if (page.outcome === 'failed') {
			return { totals, pages, outcome: 'failed' };
		}
		if (page.outcome === 'unfinished') {
			// The page still holds quarantines, so it is its own resume point.
			return { totals, pages, outcome: 'stopped', after };
		}
		if (page.outcome === 'drained') {
			return { totals, pages, outcome: 'drained' };
		}
		after = page.after;
	}

	return { totals, pages, outcome: 'stopped', after };
}

/**
 * Check one page of owners against the resolver and apply each outcome to their
 * jobs. A resolver that cannot answer leaves the page's jobs untouched.
 */
async function sweepPage(sweep: Sweep, after?: string): Promise<PageResult> {
	const { store, ownerType, clock, options, hooks } = sweep;

	const ownerIds = await store.findOwnerIds(
		ownerType,
		clock.settledBefore,
		options.batchSize,
		after,
	);
	if (ownerIds.length === 0) {
		return { outcome: 'drained', totals: noTotals() };
	}

	let existing: Set<string>;
	try {
		existing = await sweep.resolver.findExisting(ownerIds);
	} catch (error) {
		notify(() => hooks.onResolverFailed?.(ownerType, ensureError(error)));
		return { outcome: 'failed', totals: noTotals() };
	}

	const missing = ownerIds.filter((ownerId) => !existing.has(ownerId));
	const alive = ownerIds.filter((ownerId) => existing.has(ownerId));

	const quarantined = await quarantine(store, ownerType, missing, clock, hooks);
	const deleted = await deleteExpired(store, ownerType, missing, clock.quarantinedBefore, hooks);
	const revival = await revive(store, ownerType, alive, sweep.now, options, hooks, sweep.signal);

	const totals: SweepTotals = {
		ownersChecked: ownerIds.length,
		quarantined,
		deleted,
		revived: revival.jobs,
	};

	if (revival.unfinished) {
		return { outcome: 'unfinished', totals };
	}
	if (ownerIds.length < options.batchSize) {
		return { outcome: 'drained', totals };
	}
	return { outcome: 'swept', totals, after: ownerIds[ownerIds.length - 1] };
}

function noTotals(): SweepTotals {
	return { ownersChecked: 0, quarantined: 0, deleted: 0, revived: 0 };
}

function addTotals(first: SweepTotals, second: SweepTotals): SweepTotals {
	return {
		ownersChecked: first.ownersChecked + second.ownersChecked,
		quarantined: first.quarantined + second.quarantined,
		deleted: first.deleted + second.deleted,
		revived: first.revived + second.revived,
	};
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
		notify(() => hooks.onQuarantined?.({ ownerType, jobs: quarantined }));
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
		notify(() => hooks.onDeleted?.({ ownerType, jobs: deleted }));
	}
	return deleted;
}

/** What one page's revival lifted, and whether it left quarantines behind. */
interface ReviveResult {
	/** Quarantines lifted. */
	jobs: number;
	/** Whether quarantines were left for a later pass. */
	unfinished: boolean;
}

/**
 * Lift the quarantine on jobs whose owner exists after all, recomputing each
 * clock from the stored schedule so the job resumes at its next instant.
 *
 * A resolver answers existence, not intent, so a job is restored exactly as it
 * was stored, including one the owner would no longer provision. Bringing the
 * set back in line stays the owner's own job.
 *
 * Reads at most `batchSize` quarantined jobs and stops between lifts once
 * cancelled, leaving the page for a later pass.
 */
async function revive(
	store: ReconciliationJobStore,
	ownerType: string,
	ownerIds: string[],
	now: () => Promise<Date>,
	options: ReconciliationOptions,
	hooks: ReconciliationHooks,
	signal?: AbortSignal,
): Promise<ReviveResult> {
	if (ownerIds.length === 0) {
		return { jobs: 0, unfinished: false };
	}

	const quarantined = await store.findQuarantinedByOwnerIds(ownerType, ownerIds, options.batchSize);
	if (quarantined.length === 0) {
		return { jobs: 0, unfinished: false };
	}

	const from = await now();
	let revived = 0;
	let lifts = 0;
	const revivedOwnerIds = new Set<string>();
	for (const job of quarantined) {
		if (signal?.aborted === true) {
			break;
		}
		const lifted = await store.liftQuarantine(
			job.id,
			nextRunAtFor(job, from, options.defaultTimezone, hooks),
		);
		revived += lifted;
		lifts += 1;
		if (lifted > 0) {
			revivedOwnerIds.add(job.ownerId);
		}
	}

	if (revived > 0) {
		notify(() => hooks.onRevived?.({ ownerType, ownerIds: [...revivedOwnerIds], jobs: revived }));
	}
	return {
		jobs: revived,
		unfinished: lifts < quarantined.length || quarantined.length === options.batchSize,
	};
}

/**
 * A schedule that can no longer be planned revives with no clock rather than
 * blocking the sweep. The job is enabled again but records nothing until it is
 * reprovisioned.
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
		notify(() => hooks.onReviveClockFailed?.({ jobId: job.id, error: ensureError(error) }));
		return null;
	}
}

/** Hooks are host-supplied reporting, so one that throws must not derail the pass. */
function notify(report: () => void): void {
	try {
		report();
	} catch {
		// Deliberately swallowed; see `ReconciliationHooks`.
	}
}

function secondsBefore(instant: Date, seconds: number): Date {
	return new Date(instant.getTime() - seconds * 1000);
}
