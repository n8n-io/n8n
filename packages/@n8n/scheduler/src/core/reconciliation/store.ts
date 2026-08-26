import type { StoredSchedule } from '../types';

/** A quarantined row: enough to identify it, and to recompute its clock on revival. */
export type QuarantinedJob = StoredSchedule & { ownerId: string };

/**
 * The storage operations one owner reconciliation pass uses. The `@n8n/db`
 * `ScheduledJobRepository` satisfies it structurally, so the host passes it
 * as-is.
 */
export interface ReconciliationJobStore {
	/** The owner types that currently own at least one job. */
	findOwnerTypes(): Promise<string[]>;

	/**
	 * One page of the distinct owners of one type, ascending, keyset paginated.
	 *
	 * @param settledBefore only owners with a job at least this old; a job
	 * written moments ago may belong to an owner whose own row is not committed
	 * yet.
	 * @param after exclusive lower bound on `ownerId`; omit for the first page.
	 * @returns at most `limit` owner ids.
	 */
	findOwnerIds(
		ownerType: string,
		settledBefore: Date,
		limit: number,
		after?: string,
	): Promise<string[]>;

	/**
	 * Quarantine every not-yet-quarantined job of these owners: disabled, clock
	 * cleared, stamped `orphanedAt`, and its queued occurrences withdrawn, all
	 * committed together.
	 *
	 * @param settledBefore keeps a job written between the caller's liveness
	 * check and this write out of it.
	 * @returns how many jobs were quarantined.
	 */
	quarantineByOwnerIds(
		ownerType: string,
		ownerIds: string[],
		orphanedAt: Date,
		settledBefore: Date,
	): Promise<number>;

	/**
	 * Delete the quarantined jobs of these owners whose stamp is at or before
	 * `quarantinedBefore`; their occurrences go with them.
	 *
	 * @returns how many jobs were deleted.
	 */
	deleteQuarantinedByOwnerIds(
		ownerType: string,
		ownerIds: string[],
		quarantinedBefore: Date,
	): Promise<number>;

	/** The quarantined jobs of these owners, so a revival can recompute their clocks. */
	findQuarantinedByOwnerIds(ownerType: string, ownerIds: string[]): Promise<QuarantinedJob[]>;

	/**
	 * Lift the quarantine on one job: re-enabled, stamp cleared, clock restarted
	 * from `nextRunAt` (`null` for a rule with nothing left to fire). Must act
	 * only while the job is still quarantined, so a concurrent lift or delete
	 * makes it a no-op.
	 *
	 * @returns how many quarantines this call lifted (0 or 1).
	 */
	liftQuarantine(id: number, nextRunAt: Date | null): Promise<number>;
}
