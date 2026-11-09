/**
 * "More often" for live checks (see "Live reporting" in the plan): a check is
 * marked only when a one-sided Fisher exact test says this version fails it
 * more often than the last one at p < 0.01. Low counts give large p values,
 * so no minimum session count is needed.
 */
export const MORE_OFTEN_P = 0.01;

function logFactorial(n: number): number {
	let sum = 0;
	for (let i = 2; i <= n; i++) sum += Math.log(i);
	return sum;
}

function logChoose(n: number, k: number): number {
	return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

/**
 * The chance of this version failing at least `failed` of `total` sessions if
 * both versions failed equally often, given the failures of both together.
 */
export function fisherMoreOftenP(
	failed: number,
	total: number,
	prevFailed: number,
	prevTotal: number,
): number {
	const failures = failed + prevFailed;
	const sessions = total + prevTotal;
	if (failures === 0 || total === 0 || prevTotal === 0) return 1;
	if (failed / total <= prevFailed / prevTotal) return 1;

	const logAll = logChoose(sessions, total);
	let p = 0;
	for (let k = failed; k <= Math.min(failures, total); k++) {
		p += Math.exp(logChoose(failures, k) + logChoose(sessions - failures, total - k) - logAll);
	}
	return Math.min(1, p);
}

export function isMoreOften(
	failed: number,
	total: number,
	prevFailed: number,
	prevTotal: number,
): boolean {
	return fisherMoreOftenP(failed, total, prevFailed, prevTotal) < MORE_OFTEN_P;
}
