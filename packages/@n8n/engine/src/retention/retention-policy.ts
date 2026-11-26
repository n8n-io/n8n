import type { ExecutionRetentionPolicy } from './retention-sweeper';

const HOUR_MS = 3_600_000;

/** The cap keeps the cutoff in the Postgres timestamp range. */
const MAX_RETENTION_MS = 1_000 * 365 * 24 * HOUR_MS;

/** Gives no policy when `enabled` is false. */
export function retentionPolicyFromHours({
	enabled,
	maxAgeHours,
}: {
	enabled: boolean;
	maxAgeHours: number;
}): ExecutionRetentionPolicy | undefined {
	if (!enabled) return undefined;

	return { maxAgeMs: Math.min(MAX_RETENTION_MS, Math.max(0, Math.round(maxAgeHours * HOUR_MS))) };
}
