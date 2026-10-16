import {
	MAX_INTEGER_32BITS_SIGNED,
	MAX_TIMER_DELAY_SECONDS,
	type ScheduledJobMisfirePolicy,
	Time,
} from '@n8n/constants';
import { isDeepStrictEqual } from 'node:util';

import { InvalidRunOptionError } from '../errors';
import type { ScheduledJob } from '../types/schedule';

/**
 * Ceiling for a resolved misfire grace: the cap the config value carries, and well
 * inside the column's `int` range.
 */
const MAX_MISFIRE_GRACE_SECONDS = 30 * Time.days.toSeconds;

/**
 * Ceiling for a concurrency limit: what the column's `int` holds. Postgres rejects
 * anything above it outright, so it is checked here for both dialects to behave the
 * same.
 */
const MAX_CONCURRENCY_LIMIT = MAX_INTEGER_32BITS_SIGNED;

/** The settings every occurrence of a job runs with. */
export type RunOptions = Pick<
	ScheduledJob,
	'maxAttempts' | 'timeoutSeconds' | 'misfirePolicy' | 'misfireGraceSeconds' | 'concurrencyLimit'
>;

/** Run options as a caller asked for them. An omitted value inherits the instance default. */
export interface RequestedRunOptions {
	misfirePolicy: ScheduledJobMisfirePolicy;
	/** Not trusted to be a number: a stored node parameter can still be a string or `null`. */
	misfireGraceSeconds?: unknown;
	maxAttempts?: number;
	timeoutSeconds?: number;
	concurrencyLimit?: number | null;
}

/** The instance settings a request falls back to, and the bounds of the grace floor. */
export interface RunOptionDefaults {
	maxAttempts: number;
	timeoutSeconds: number;
	misfireGraceSeconds: number;
	executorIntervalSeconds: number;
	materializationWindowSeconds: number;
}

/** A requested grace that resolution moved to the scheduler's floor or ceiling. */
export interface MisfireGraceAdjustment {
	direction: 'raised' | 'lowered';
	requestedMisfireGraceSeconds: number;
}

export interface ResolvedRunOptions {
	runOptions: RunOptions;
	/** Set when the requested grace was moved to a bound. */
	misfireGraceAdjustment?: MisfireGraceAdjustment;
}

/** The ids of stored jobs whose columns differ from the resolved request. */
export interface OutdatedJobIds {
	/** Any run option differs. */
	runOptions: number[];
	misfireGrace: number[];
	timeout: number[];
	payload: number[];
}

/**
 * Resolve a request against the instance defaults into the run options a job stores.
 *
 * @throws {InvalidRunOptionError} when the timeout or the concurrency limit is outside
 * the range the scheduler enforces.
 */
export function resolveCoreRunOptions(
	requested: RequestedRunOptions,
	defaults: RunOptionDefaults,
): ResolvedRunOptions {
	const { misfireGraceSeconds, misfireGraceAdjustment } = resolveMisfireGraceSeconds(
		requested.misfireGraceSeconds,
		defaults,
	);
	return {
		runOptions: {
			maxAttempts: requested.maxAttempts ?? defaults.maxAttempts,
			timeoutSeconds: resolveTimeoutSeconds(requested.timeoutSeconds ?? defaults.timeoutSeconds),
			misfirePolicy: requested.misfirePolicy,
			misfireGraceSeconds,
			concurrencyLimit: resolveConcurrencyLimit(requested.concurrencyLimit),
		},
		misfireGraceAdjustment,
	};
}

/** List the stored jobs whose run options or payload differ from the given ones. */
export function findOutdatedJobs(
	rows: Array<Pick<ScheduledJob, 'id' | 'payload'> & RunOptions>,
	runOptions: RunOptions,
	payload: Record<string, unknown>,
): OutdatedJobIds {
	const idsWhere = (differs: (row: (typeof rows)[number]) => boolean) =>
		rows.filter(differs).map((row) => row.id);
	const graceChanged = (row: RunOptions) =>
		row.misfireGraceSeconds !== runOptions.misfireGraceSeconds;
	const timeoutChanged = (row: RunOptions) => row.timeoutSeconds !== runOptions.timeoutSeconds;
	return {
		runOptions: idsWhere(
			(row) =>
				graceChanged(row) ||
				timeoutChanged(row) ||
				row.misfirePolicy !== runOptions.misfirePolicy ||
				row.maxAttempts !== runOptions.maxAttempts ||
				row.concurrencyLimit !== runOptions.concurrencyLimit,
		),
		misfireGrace: idsWhere(graceChanged),
		timeout: idsWhere(timeoutChanged),
		payload: idsWhere((row) => !isDeepStrictEqual(row.payload, payload)),
	};
}

function resolveMisfireGraceSeconds(
	requested: unknown,
	defaults: RunOptionDefaults,
): { misfireGraceSeconds: number; misfireGraceAdjustment?: MisfireGraceAdjustment } {
	const { misfireGraceSeconds, executorIntervalSeconds, materializationWindowSeconds } = defaults;

	const numeric = Number(requested);
	if (!Number.isFinite(numeric)) {
		return { misfireGraceSeconds };
	}

	const truncated = Math.trunc(numeric);
	if (truncated < 1) {
		return { misfireGraceSeconds };
	}

	const floor = Math.min(
		Math.max(executorIntervalSeconds + 1, materializationWindowSeconds),
		MAX_MISFIRE_GRACE_SECONDS,
	);

	if (!Number.isFinite(floor)) {
		return { misfireGraceSeconds };
	}

	const effective = Math.min(Math.max(truncated, floor), MAX_MISFIRE_GRACE_SECONDS);

	if (effective === truncated && numeric <= MAX_MISFIRE_GRACE_SECONDS) {
		return { misfireGraceSeconds: effective };
	}

	return {
		misfireGraceSeconds: effective,
		misfireGraceAdjustment: {
			direction: effective > truncated ? 'raised' : 'lowered',
			requestedMisfireGraceSeconds: numeric,
		},
	};
}

/**
 * Check a timeout against what the executor can enforce: a whole number of seconds
 * from 1 to {@link MAX_TIMER_DELAY_SECONDS}.
 *
 * @throws {InvalidRunOptionError} when the timeout falls outside that range. A timeout
 * of 0 stops every run as soon as it starts.
 */
function resolveTimeoutSeconds(requested: number): number {
	if (!Number.isInteger(requested) || requested < 1 || requested > MAX_TIMER_DELAY_SECONDS) {
		throw new InvalidRunOptionError(
			'Scheduled job timeout is outside the range the scheduler enforces',
			'timeoutSeconds',
			requested,
			MAX_TIMER_DELAY_SECONDS,
		);
	}
	return requested;
}

/**
 * Normalize a requested concurrency ceiling to what the column stores: a whole
 * number from 1 to {@link MAX_CONCURRENCY_LIMIT}, or `null` for no limit.
 *
 * @throws {InvalidRunOptionError} when the limit is set but falls outside that range.
 * A ceiling below one would hold every occurrence back until its misfire deadline
 * passed, so the job would never run.
 */
function resolveConcurrencyLimit(requested: number | null | undefined): number | null {
	if (requested === undefined || requested === null) {
		return null;
	}
	if (!Number.isInteger(requested) || requested < 1 || requested > MAX_CONCURRENCY_LIMIT) {
		throw new InvalidRunOptionError(
			'Scheduled job concurrency limit is outside the range the column holds',
			'concurrencyLimit',
			requested,
			MAX_CONCURRENCY_LIMIT,
		);
	}
	return requested;
}
