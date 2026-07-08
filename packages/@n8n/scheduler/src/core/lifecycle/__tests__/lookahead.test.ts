import { executorLookaheadSeconds } from '../lookahead';

describe('executorLookaheadSeconds', () => {
	const INTERVAL = 10;

	it('is exactly the interval when there is no jitter', () => {
		expect(executorLookaheadSeconds(INTERVAL, 0)).toBe(10);
	});

	it('adds twice the jitter ratio, covering both the early and late side', () => {
		// Twice the jitter rather than once: a one-sided budget would give 11 and fire tail tasks late.
		expect(executorLookaheadSeconds(INTERVAL, 0.1)).toBeCloseTo(12);
		expect(executorLookaheadSeconds(INTERVAL, 0.25)).toBeCloseTo(15);
		expect(executorLookaheadSeconds(INTERVAL, 0.5)).toBeCloseTo(20);
	});

	it('always exceeds a one-sided (jitter-only) budget while jitter is non-zero', () => {
		for (const jitter of [0.01, 0.1, 0.3, 0.99]) {
			const oneSided = INTERVAL * (1 + jitter);
			expect(executorLookaheadSeconds(INTERVAL, jitter)).toBeGreaterThan(oneSided);
		}
	});

	it('scales linearly with the interval', () => {
		expect(executorLookaheadSeconds(20, 0.1)).toBeCloseTo(24);
		expect(executorLookaheadSeconds(5, 0.1)).toBeCloseTo(6);
	});
});
