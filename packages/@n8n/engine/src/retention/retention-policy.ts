import type { ExecutionRetentionPolicy } from './retention-sweeper';

const HOUR_MS = 3_600_000;

/** 1,000 years. The cap keeps the period a safe integer and the cutoff in the Postgres range. */
const MAX_RETENTION_MS = 1_000 * 365 * 24 * HOUR_MS;

/**
 * The policy for a host that sets the retention period in hours and a count
 * limit. Off gives no policy. A count below 1, or one that is not a safe
 * integer, gives no count limit. A fraction rounds down.
 */
export function retentionPolicyFromHours({
	enabled,
	maxAgeHours,
	maxCount,
}: {
	enabled: boolean;
	maxAgeHours: number;
	maxCount: number;
}): ExecutionRetentionPolicy | undefined {
	if (!enabled) return undefined;

	const count = Math.floor(maxCount);
	return {
		maxAgeMs: Math.min(MAX_RETENTION_MS, Math.max(0, Math.round(maxAgeHours * HOUR_MS))),
		maxCount: Number.isSafeInteger(count) && count > 0 ? count : 0,
	};
}
