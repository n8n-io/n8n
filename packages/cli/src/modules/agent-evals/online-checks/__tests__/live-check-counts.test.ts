import { MORE_OFTEN_P, fisherMoreOftenP, isMoreOften } from '../live-check-counts';

describe('fisherMoreOftenP', () => {
	// The values in the plan's "More often" table.
	it.each([
		[4, 212, 1, 340, 0.074],
		[3, 20, 0, 20, 0.115],
		[5, 30, 0, 30, 0.026],
		[10, 200, 2, 200, 0.018],
		[13, 100, 10, 100, 0.33],
		[6, 15, 0, 15, 0.008],
	])('%i of %i against %i of %i gives p = %f', (failed, total, prevFailed, prevTotal, expected) => {
		expect(fisherMoreOftenP(failed, total, prevFailed, prevTotal)).toBeCloseTo(expected, 2);
	});

	it('is 1 when this version failed less often', () => {
		expect(fisherMoreOftenP(0, 100, 5, 100)).toBe(1);
	});

	it('is 1 when nothing failed', () => {
		expect(fisherMoreOftenP(0, 10, 0, 10)).toBe(1);
	});
});

describe('isMoreOften', () => {
	it(`marks a check only below p = ${MORE_OFTEN_P}`, () => {
		expect(isMoreOften(6, 15, 0, 15)).toBe(true);
		expect(isMoreOften(5, 30, 0, 30)).toBe(false);
	});

	it('never marks a check without a previous version to compare with', () => {
		expect(isMoreOften(10, 10, 0, 0)).toBe(false);
	});
});
