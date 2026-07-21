import { backoff } from '../backoff';

describe('backoff', () => {
	it('is 0 for a non-positive attempt number', () => {
		expect(backoff(0)).toBe(0);
		expect(backoff(-1)).toBe(0);
	});

	it('returns the base delay for the first failed attempt', () => {
		expect(backoff(1, { baseMs: 1000, factor: 2, maxMs: 100_000 })).toBe(1000);
	});

	it('grows exponentially by the factor per attempt', () => {
		const opts = { baseMs: 1000, factor: 2, maxMs: 100_000 };
		expect(backoff(2, opts)).toBe(2000);
		expect(backoff(3, opts)).toBe(4000);
		expect(backoff(4, opts)).toBe(8000);
	});

	it('caps at maxMs', () => {
		const opts = { baseMs: 1000, factor: 2, maxMs: 5000 };
		expect(backoff(4, opts)).toBe(5000);
		expect(backoff(10, opts)).toBe(5000);
	});

	it('uses the built-in defaults when no opts are given', () => {
		expect(backoff(1)).toBe(5_000); // baseMs
		expect(backoff(2)).toBe(10_000); // baseMs * 2
		expect(backoff(20)).toBe(5 * 60_000); // capped at maxMs
	});
});
