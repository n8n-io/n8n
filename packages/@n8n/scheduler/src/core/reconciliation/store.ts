import type { StoredSchedule } from '../types';

/** A quarantined row, carrying what a revival needs to recompute its clock. */
export type QuarantinedJob = StoredSchedule & { ownerId: string; enabled: boolean };

/** The storage operations one owner reconciliation pass uses. */
export interface ReconciliationJobStore {
	/** The owner types that currently own at least one job. */
	findOwnerTypes(): Promise<string[]>;

	/**
	 * One page of the distinct owners of one type, ascending, keyset paginated.
	 * A quarantined job still counts as one of its owner's jobs, so a fully
	 * quarantined owner keeps coming back until deleted or revived.
	 *
	 * @param settledBefore only owners with a job at least this old.
	 * @param after exclusive lower bound on `ownerId`. Omit for the first page.
	 * @returns at most `limit` owner ids.
	 */
	findOwnerIds(
		ownerType: string,
		settledBefore: Date,
		limit: number,
		after?: string,
	): Promise<string[]>;

	/**
	 * Quarantine every not-yet-quarantined job of these owners, committing the
	 * cleared clock, the `orphanedAt` stamp and the withdrawal of its queued
	 * occurrences together. `enabled` is left as it was.
	 *
	 * @param settledBefore excludes jobs written since the liveness check.
	 * @returns how many jobs were quarantined.
	 */
	quarantineByOwnerIds(
		ownerType: string,
		ownerIds: string[],
		orphanedAt: Date,
		settledBefore: Date,
	): Promise<number>;

	/**
	 * Delete the quarantined jobs of these owners stamped at or before
	 * `quarantinedBefore`, along with their occurrences.
	 *
	 * @returns how many jobs were deleted.
	 */
	deleteQuarantinedByOwnerIds(
		ownerType: string,
		ownerIds: string[],
		quarantinedBefore: Date,
	): Promise<number>;

	/**
	 * The quarantined jobs of these owners, in any order.
	 *
	 * @param limit at most this many jobs.
	 */
	findQuarantinedByOwnerIds(
		ownerType: string,
		ownerIds: string[],
		limit: number,
	): Promise<QuarantinedJob[]>;

	/**
	 * Lift one job's quarantine, clearing its stamp and restarting its clock from
	 * `nextRunAt` (`null` for a rule with nothing left to fire). Acts only while
	 * the job is still quarantined, so a concurrent lift or delete is a no-op.
	 *
	 * @returns how many quarantines this call lifted (0 or 1).
	 */
	liftQuarantine(id: number, nextRunAt: Date | null): Promise<number>;
}
