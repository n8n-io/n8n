import { stringExtensions } from '../string-extensions';

const length = stringExtensions.functions.length as (value: string) => number;

describe('length with Unicode code points', () => {
	it('counts an emoji as one character', () => {
		expect(length('😀')).toBe(1);
	});

	it('counts multiple emoji as one character each', () => {
		expect(length('😀😁')).toBe(2);
	});

	// Regression boundaries: existing behaviour must be preserved.
	it('still returns the ASCII string length', () => {
		expect(length('String')).toBe(6);
		expect(length('')).toBe(0);
	});

	it('still counts BMP characters one-for-one', () => {
		expect(length('café')).toBe(4);
		expect(length('こんにちは')).toBe(5);
	});
});
