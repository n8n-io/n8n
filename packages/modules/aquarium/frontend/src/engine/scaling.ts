import { LIVE_SPEED, SIZE_TIER_THRESHOLDS, SWIM_SPEED } from '../aquarium.constants';
import type { EntityMetrics, SizeTier } from '../aquarium.types';

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
