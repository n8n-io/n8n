/**
 * How far ahead of a tick the executor must claim so a task due before the next
 * tick is claimed in time to fire precisely on the timeline (see {@link Timeline}).
 *
 * The horizon has to cover the largest gap between two consecutive fires. Jitter
 * is applied per slot and symmetric, so one tick can land up to
 * `jitterRatio·interval` early and the next up to `jitterRatio·interval` late:
 * the gap stretches by both sides at once, to `interval·(1 + 2·jitterRatio)`.
 * Budgeting only one side leaves a task due in that tail claimed a tick late,
 * so it fires late.
 */
export function executorLookaheadSeconds(intervalSeconds: number, jitterRatio: number): number {
	return intervalSeconds * (1 + 2 * jitterRatio);
}
