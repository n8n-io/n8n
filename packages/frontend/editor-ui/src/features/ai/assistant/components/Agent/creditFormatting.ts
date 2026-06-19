/** Round a (possibly decimal) credit value to 1 decimal place for display (req #5). */
export function round1(value: number): number {
	return Math.round(value * 10) / 10;
}
