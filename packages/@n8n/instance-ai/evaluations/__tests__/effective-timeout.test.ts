import { effectiveTimeoutMs } from '../harness/runner';

describe('effectiveTimeoutMs', () => {
	it('gives complex cases 1.5x the base budget', () => {
		expect(effectiveTimeoutMs('complex', 900_000)).toBe(1_350_000);
	});

	it('keeps the base budget for simple and medium cases', () => {
		expect(effectiveTimeoutMs('simple', 900_000)).toBe(900_000);
		expect(effectiveTimeoutMs('medium', 900_000)).toBe(900_000);
	});

	it('keeps the base budget when complexity is missing', () => {
		expect(effectiveTimeoutMs(undefined, 900_000)).toBe(900_000);
	});
});
