/** Rounds to the whole second the scheduler requires, never below one. */
export function wholeSeconds(seconds: number): number {
	return Math.max(1, Math.round(seconds));
}
