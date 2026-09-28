import { computeBackoff } from '../backoff';

describe('computeBackoff', () => {
	it('ramps exponentially from the floor', () => {
		expect(computeBackoff(1, 1000, 30000)).toBe(1000);
		expect(computeBackoff(2, 1000, 30000)).toBe(2000);
		expect(computeBackoff(3, 1000, 30000)).toBe(4000);
	});

	it('caps at the ceiling', () => {
		expect(computeBackoff(10, 1000, 30000)).toBe(30000);
	});

	it('degrades to a constant floor when max < min', () => {
		expect(computeBackoff(1, 5000, 1000)).toBe(5000);
		expect(computeBackoff(5, 5000, 1000)).toBe(5000);
	});
});
