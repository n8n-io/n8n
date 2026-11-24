/**
 * How far ahead of a tick a fixed-interval poll loop must claim so a row due
 * before its next tick is claimed in time (used by the executor to fire on the
 * timeline, and by the materializer to plan a job before its window runs out).
 *
 * The horizon has to cover the largest gap between two consecutive ticks. Jitter
 * is applied per slot and symmetric, so one tick can land up to
 * `jitterRatio·interval` early and the next up to `jitterRatio·interval` late:
 * the gap stretches by both sides at once, to `interval·(1 + 2·jitterRatio)`.
 * Budgeting only one side leaves a row due in that tail claimed a tick late.
 */
export function pollLookaheadSeconds(intervalSeconds: number, jitterRatio: number): number {
	return intervalSeconds * (1 + 2 * jitterRatio);
}
