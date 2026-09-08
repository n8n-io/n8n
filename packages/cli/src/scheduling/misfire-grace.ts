export const MAX_MISFIRE_GRACE_SECONDS = 30 * 24 * 60 * 60;

export interface MisfireGraceConfig {
	misfireGraceSeconds: number;
	executorIntervalSeconds: number;
	materializationWindowSeconds: number;
}

/** Resolves a requested grace with the same default, floor, and ceiling as the scheduler. */
export function resolveMisfireGraceSeconds(requested: unknown, config: MisfireGraceConfig): number {
	const numeric = Number(requested);
	if (!Number.isFinite(numeric)) return config.misfireGraceSeconds;

	const truncated = Math.trunc(numeric);
	if (truncated < 1) return config.misfireGraceSeconds;

	const floor = Math.min(
		Math.max(config.executorIntervalSeconds + 1, config.materializationWindowSeconds),
		MAX_MISFIRE_GRACE_SECONDS,
	);
	if (!Number.isFinite(floor)) return config.misfireGraceSeconds;

	return Math.min(Math.max(truncated, floor), MAX_MISFIRE_GRACE_SECONDS);
}
