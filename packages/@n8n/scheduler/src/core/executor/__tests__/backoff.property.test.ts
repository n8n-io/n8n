import fc from 'fast-check';

import { backoff } from '../backoff';

/**
 * Invariants the retry-backoff curve must hold for any attempt number and any
 * option set, complementing the worked examples in `backoff.test.ts`.
 */
describe('backoff (fast-check)', () => {
	const arbOpts = fc.record({
		baseMs: fc.integer({ min: 1, max: 60_000 }),
		// factor >= 1 so the curve never shrinks between attempts.
		factor: fc.double({ min: 1, max: 4, noNaN: true }),
		maxMs: fc.integer({ min: 1, max: 3_600_000 }),
	});

	it('stays within [0, maxMs] for any attempt', () => {
		fc.assert(
			fc.property(fc.integer({ min: -5, max: 100 }), arbOpts, (attempts, opts) => {
				const delay = backoff(attempts, opts);
				expect(delay).toBeGreaterThanOrEqual(0);
				expect(delay).toBeLessThanOrEqual(opts.maxMs);
			}),
		);
	});

	it('is zero for any non-positive attempt', () => {
		fc.assert(
			fc.property(fc.integer({ min: -100, max: 0 }), arbOpts, (attempts, opts) => {
				expect(backoff(attempts, opts)).toBe(0);
			}),
		);
	});

	it('never decreases as the attempt number grows', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 40 }), arbOpts, (attempts, opts) => {
				expect(backoff(attempts + 1, opts)).toBeGreaterThanOrEqual(backoff(attempts, opts));
			}),
		);
	});
});
