import { parseThreadListLimit } from '../parse-thread-list-limit';

describe('parseThreadListLimit', () => {
	it('defaults to 20 when the value is absent', () => {
		expect(parseThreadListLimit(undefined)).toBe(20);
	});

	it('defaults to 20 when the value is not a number', () => {
		expect(parseThreadListLimit('abc')).toBe(20);
	});

	it('defaults to 20 when the value is zero', () => {
		expect(parseThreadListLimit('0')).toBe(20);
	});

	it('truncates a fractional value to an integer', () => {
		expect(parseThreadListLimit('1.5')).toBe(1);
	});

	it('clamps values below 1 up to 1', () => {
		expect(parseThreadListLimit('-5')).toBe(1);
	});

	it('clamps values above 100 down to 100', () => {
		expect(parseThreadListLimit('500')).toBe(100);
	});

	it('passes through a valid integer within range', () => {
		expect(parseThreadListLimit('42')).toBe(42);
	});
});
