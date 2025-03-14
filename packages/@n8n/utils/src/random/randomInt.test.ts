import { randomInt } from './randomInt';
import { repeat } from '../__tests__/utils';

describe('randomInt', () => {
	it('should generate random integers', () => {
		repeat(() => {
			const result = randomInt(10);
			expect(result).toBeLessThanOrEqual(10);
			expect(result).toBeGreaterThanOrEqual(0);
		});
	});

	it('should generate random in range', () => {
		repeat(() => {
			const result = randomInt(10, 100);
			expect(result).toBeLessThanOrEqual(100);
			expect(result).toBeGreaterThanOrEqual(10);
		});
	});
});
