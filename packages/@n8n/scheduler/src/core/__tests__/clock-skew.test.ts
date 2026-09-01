import {
	CLOCK_SKEW_WARN_THRESHOLD_MS,
	isClockSkewSignificant,
	measureClockSkew,
} from '../clock-skew';

describe('measureClockSkew', () => {
	it('reports no offset when the coordination clock matches the round-trip midpoint', () => {
		const skew = measureClockSkew({ before: 1_000, referenceNow: 1_050, after: 1_100 });

		expect(skew.offsetMs).toBe(0);
		expect(skew.roundTripMs).toBe(100);
	});

	it('reports a positive offset when the coordination clock is ahead of the instance', () => {
		// Midpoint is 1_050; the coordination clock read 5_000 ms later.
		const skew = measureClockSkew({ before: 1_000, referenceNow: 6_050, after: 1_100 });

		expect(skew.offsetMs).toBe(5_000);
	});

	it('reports a negative offset when the coordination clock is behind the instance', () => {
		const skew = measureClockSkew({ before: 10_000, referenceNow: 7_000, after: 10_000 });

		expect(skew.offsetMs).toBe(-3_000);
	});
});

describe('isClockSkewSignificant', () => {
	it('is false for an in-sync clock', () => {
		expect(isClockSkewSignificant({ offsetMs: 0, roundTripMs: 20 })).toBe(false);
	});

	it('is false for an offset within the threshold', () => {
		expect(
			isClockSkewSignificant({ offsetMs: CLOCK_SKEW_WARN_THRESHOLD_MS - 1, roundTripMs: 20 }),
		).toBe(false);
	});

	it('is false for an offset exactly at the threshold (strict comparison)', () => {
		expect(
			isClockSkewSignificant({ offsetMs: CLOCK_SKEW_WARN_THRESHOLD_MS, roundTripMs: 20 }),
		).toBe(false);
	});

	it('is false for an offset exactly at half the round-trip', () => {
		// Round-trip 4_000 gives a 2_000 ms bound; an offset of exactly 2_000 (above the
		// fixed threshold) must not warn, since the comparison is strict.
		expect(isClockSkewSignificant({ offsetMs: 2_000, roundTripMs: 4_000 })).toBe(false);
	});

	it('is true for an offset beyond the threshold, in either direction', () => {
		expect(isClockSkewSignificant({ offsetMs: 5_000, roundTripMs: 20 })).toBe(true);
		expect(isClockSkewSignificant({ offsetMs: -5_000, roundTripMs: 20 })).toBe(true);
	});

	it('requires the offset to exceed half the round-trip', () => {
		// A 4s round-trip gives ±2s of measurement uncertainty, so a 1.5s offset (above
		// the fixed threshold) is still within the noise and must not warn.
		expect(isClockSkewSignificant({ offsetMs: 1_500, roundTripMs: 4_000 })).toBe(false);
		expect(isClockSkewSignificant({ offsetMs: 3_000, roundTripMs: 4_000 })).toBe(true);
	});

	it('honours a custom threshold', () => {
		expect(isClockSkewSignificant({ offsetMs: 200, roundTripMs: 20 }, 100)).toBe(true);
		expect(isClockSkewSignificant({ offsetMs: 200, roundTripMs: 20 }, 500)).toBe(false);
	});
});
