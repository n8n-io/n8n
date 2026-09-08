import { Time } from '@n8n/constants';

/**
 * Ceiling for a resolved misfire grace: the cap the config value carries, and well
 * inside the column's `int` range.
 */
export const MAX_MISFIRE_GRACE_SECONDS = 30 * Time.days.toSeconds;

export interface MisfireGraceConfig {
	misfireGraceSeconds: number;
	executorIntervalSeconds: number;
	materializationWindowSeconds: number;
}

/**
 * The grace the scheduler stores for a requested value: the truncated request,
 * raised to the scheduler's floor and lowered to the ceiling. `null` when the
 * request is not a positive number, or the configured floor is unusable; the
 * caller falls back to the instance default.
 */
export function clampMisfireGraceSeconds(
	requested: unknown,
	config: MisfireGraceConfig,
): number | null {
	const numeric = Number(requested);
	if (!Number.isFinite(numeric)) return null;

	const truncated = Math.trunc(numeric);
	if (truncated < 1) return null;

	const floor = Math.min(
		Math.max(config.executorIntervalSeconds + 1, config.materializationWindowSeconds),
		MAX_MISFIRE_GRACE_SECONDS,
	);
	if (!Number.isFinite(floor)) return null;

	return Math.min(Math.max(truncated, floor), MAX_MISFIRE_GRACE_SECONDS);
}

/** The grace a job runs with for a requested value: the clamped request, or the instance default. */
export function resolveMisfireGraceSeconds(requested: unknown, config: MisfireGraceConfig): number {
	return clampMisfireGraceSeconds(requested, config) ?? config.misfireGraceSeconds;
}
