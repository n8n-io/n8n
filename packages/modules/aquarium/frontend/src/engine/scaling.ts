import { LIVE_SPEED, SIZE_TIER_THRESHOLDS, SWIM_SPEED } from '../aquarium.constants';
import type { EntityActivity, EntityMetrics, SizeTier } from '../aquarium.types';

export const SIZE_TIERS: readonly SizeTier[] = ['tiny', 'small', 'medium', 'large', 'huge'];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Grows with node count, and slowly with runtime: each doubling of seconds adds 2. */
export function complexityScore(metrics: EntityMetrics): number {
	const runTimeSeconds = Math.max(0, metrics.averageRunTimeMs) / 1000;
	return Math.max(0, metrics.complexity) + 2 * Math.log2(1 + runTimeSeconds);
}

export function sizeTierFor(score: number): SizeTier {
	if (score >= SIZE_TIER_THRESHOLDS.huge) return 'huge';
	if (score >= SIZE_TIER_THRESHOLDS.large) return 'large';
	if (score >= SIZE_TIER_THRESHOLDS.medium) return 'medium';
	if (score >= SIZE_TIER_THRESHOLDS.small) return 'small';
	return 'tiny';
}

/** Log scale, so 10 and 10,000 executions both look different from their neighbours. */
export function swimSpeedFor(executionCount: number): number {
	const ratio = Math.log10(1 + Math.max(0, executionCount)) / Math.log10(1 + SWIM_SPEED.saturation);
	return SWIM_SPEED.min + (SWIM_SPEED.max - SWIM_SPEED.min) * clamp01(ratio);
}

export function failureRateOf(metrics: EntityMetrics): number {
	if (metrics.executionCount <= 0) return 0;
	return clamp01(metrics.failedCount / metrics.executionCount);
}

/** Mean starts per second over the last `seconds` entries of the series. */
export function recentRate(
	startedPerSecond: readonly number[],
	seconds: number = LIVE_SPEED.rateSeconds,
): number {
	const recent = startedPerSecond.slice(-seconds);
	if (recent.length === 0) return 0;
	return recent.reduce((total, count) => total + count, 0) / recent.length;
}

/** Log scale, so a busy workflow still speeds up visibly when its rate grows. */
export function liveSpeedBoostFor(ratePerSecond: number): number {
	const ratio =
		Math.log10(1 + Math.max(0, ratePerSecond)) / Math.log10(1 + LIVE_SPEED.saturationPerSecond);
	return LIVE_SPEED.maxBoost * clamp01(ratio);
}

/**
 * Share of runs that are paused, of paused and finished runs, 0 to 1. A workflow that waits a lot
 * is working as built, so show it as resting, not as sick: waiting is never a failure.
 */
export function waitingShareOf(metrics: EntityMetrics): number {
	const total = metrics.waitingCount + metrics.finishedCount;
	return total > 0 ? clamp01(metrics.waitingCount / total) : 0;
}

/** Some runs are paused and none has finished: every recent run is waiting. */
export function allRunsWaitingOf(metrics: EntityMetrics): boolean {
	return metrics.waitingCount > 0 && metrics.finishedCount === 0;
}

/** Live: runs are paused, nothing runs, and nothing ended in the activity window. */
export function allRunsWaitingNow(activity: EntityActivity): boolean {
	return (
		activity.waiting > 0 &&
		activity.running === 0 &&
		activity.succeeded === 0 &&
		activity.failed === 0
	);
}

/**
 * Every run of the workflow is paused. Uses the live activity when the window has run events,
 * because it is newer. Otherwise it uses the metrics.
 */
export function allRunsWaiting(metrics: EntityMetrics, activity?: EntityActivity): boolean {
	const hasLiveRuns =
		activity !== undefined &&
		(activity.started > 0 || activity.running > 0 || activity.succeeded > 0 || activity.failed > 0);
	if (activity && hasLiveRuns) return allRunsWaitingNow(activity);
	return allRunsWaitingOf(metrics) || (activity !== undefined && allRunsWaitingNow(activity));
}
