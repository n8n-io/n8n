import { describe, expect, it } from 'vitest';
import { calculateExponentialBackoff, RETRY_START_DELAY, RETRY_MAX_DELAY } from './retryUtils';

describe('calculateExponentialBackoff', () => {
	it('should return start delay for first retry', () => {
		expect(calculateExponentialBackoff(1)).toBe(2000);
	});

	it('should double the delay for second retry', () => {
		expect(calculateExponentialBackoff(2)).toBe(4000);
	});

	it('should continue exponential growth for subsequent retries', () => {
		expect(calculateExponentialBackoff(3)).toBe(8000);
		expect(calculateExponentialBackoff(4)).toBe(16000);
		expect(calculateExponentialBackoff(5)).toBe(32000);
	});

	it('should cap at max delay', () => {
		expect(calculateExponentialBackoff(6)).toBe(32000);
		expect(calculateExponentialBackoff(7)).toBe(32000);
		expect(calculateExponentialBackoff(10)).toBe(32000);
		expect(calculateExponentialBackoff(100)).toBe(32000);
	});

	it('should handle zero retry count', () => {
		expect(calculateExponentialBackoff(0)).toBe(1000); // 2000 * 2^(-1) = 1000
	});

	it('should use custom start delay', () => {
		expect(calculateExponentialBackoff(1, 1000)).toBe(1000);
		expect(calculateExponentialBackoff(2, 1000)).toBe(2000);
		expect(calculateExponentialBackoff(3, 1000)).toBe(4000);
	});

	it('should use custom max delay', () => {
		expect(calculateExponentialBackoff(10, 2000, 10000)).toBe(10000);
		expect(calculateExponentialBackoff(5, 2000, 10000)).toBe(10000);
	});

	it('should work with both custom start and max delay', () => {
		expect(calculateExponentialBackoff(1, 500, 5000)).toBe(500);
		expect(calculateExponentialBackoff(2, 500, 5000)).toBe(1000);
		expect(calculateExponentialBackoff(3, 500, 5000)).toBe(2000);
		expect(calculateExponentialBackoff(4, 500, 5000)).toBe(4000);
		expect(calculateExponentialBackoff(5, 500, 5000)).toBe(5000);
	});
});

describe('RETRY_START_DELAY', () => {
	it('should be 2000ms', () => {
		expect(RETRY_START_DELAY).toBe(2000);
	});
});

describe('RETRY_MAX_DELAY', () => {
	it('should be 32000ms', () => {
		expect(RETRY_MAX_DELAY).toBe(32000);
	});
});
