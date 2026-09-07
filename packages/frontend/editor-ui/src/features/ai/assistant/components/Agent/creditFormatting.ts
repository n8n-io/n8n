/** Round a (possibly decimal) credit value to 2 decimal places for display. */
export function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
