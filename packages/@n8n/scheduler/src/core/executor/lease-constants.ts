// These are constants, not environment variables, to keep this mechanism under
// control in its first version. A per-job timeout may come later.

/**
 * Renewals per lease: two may fail in a row before the lease expires.
 * The cadence depends on the lease, not on how long a run takes.
 */
export const RENEWALS_PER_LEASE = 3;

/**
 * The shortest time between two renewals, so a short lease does not load the
 * database. A lease shorter than {@link RENEWALS_PER_LEASE} times this gets fewer
 * renewals, and one this short or shorter expires before its first renewal.
 */
export const MIN_RENEWAL_INTERVAL_MS = 5_000;
