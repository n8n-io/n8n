import { describe, it, expect } from 'vitest';
import { round1 } from './creditFormatting';

describe('round1', () => {
	it('rounds a decimal to one decimal place', () => {
		expect(round1(97.30000001)).toBe(97.3);
		expect(round1(2.46)).toBe(2.5);
	});

	it('leaves integers unchanged', () => {
		expect(round1(100)).toBe(100);
		expect(round1(0)).toBe(0);
	});
});
