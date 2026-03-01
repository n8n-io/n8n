import { smartDecimal } from './smartDecimal';

describe('smartDecimal', () => {
	it('should return the same value if it is an integer', () => {
		expect(smartDecimal(42)).toBe(42);
	});

	it('should return the same value if it has only one decimal place', () => {
		expect(smartDecimal(42.5)).toBe(42.5);
	});

	it('should round to two decimal places by default', () => {
		expect(smartDecimal(42.567)).toBe(42.57);
	});

	it('should round to the specified number of decimal places', () => {
		expect(smartDecimal(42.567, 1)).toBe(42.6);
	});

	it('should handle negative numbers correctly', () => {
		expect(smartDecimal(-42.567, 2)).toBe(-42.57);
	});

	it('should handle zero correctly', () => {
		expect(smartDecimal(0)).toBe(0);
	});

	it('should handle very small numbers correctly', () => {
		expect(smartDecimal(0.000567, 5)).toBe(0.00057);
	});

	it('should round to two decimal if it is smaller than the given one', () => {
		expect(smartDecimal(42.56, 3)).toBe(42.56);
	});
});
