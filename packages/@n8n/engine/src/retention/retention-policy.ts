import type { ExecutionRetentionPolicy } from './retention-sweeper';

const HOUR_MS = 3_600_000;

/** The cap keeps the cutoff in the Postgres timestamp range. */
const MAX_RETENTION_MS = 1_000 * 365 * 24 * HOUR_MS;

/**
 * Gives no policy when `enabled` is false. A fraction rounds down. A count below
 * 1, or one that is not a safe integer, gives no count limit.
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
