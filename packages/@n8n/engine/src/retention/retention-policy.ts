import type { ExecutionRetentionPolicy } from './retention-sweeper';

const HOUR_MS = 3_600_000;

/** 1,000 years. The cap keeps the period a safe integer and the cutoff in the Postgres range. */
const MAX_RETENTION_MS = 1_000 * 365 * 24 * HOUR_MS;

/** The policy for a host that sets the retention period in hours. Off gives no policy. */
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
