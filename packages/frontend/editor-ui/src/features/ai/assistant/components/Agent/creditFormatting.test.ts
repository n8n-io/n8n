import { describe, it, expect } from 'vitest';
import { round2 } from './creditFormatting';

describe('round2', () => {
	it('rounds a decimal to two decimal places', () => {
		expect(round2(97.30000001)).toBe(97.3);
		expect(round2(2.468)).toBe(2.47);
		expect(round2(2.46)).toBe(2.46);
	});

	it('leaves integers unchanged', () => {
		expect(round2(100)).toBe(100);
		expect(round2(0)).toBe(0);
	});
});
