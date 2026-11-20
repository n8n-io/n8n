import { formatBytes, formatMbOrGb, toGb, toMb } from './bytes';

describe('formatBytes', () => {
	test.each([
		[0, '0B'],
		[512, '512B'],
		[1023, '1023B'],
		[1024, '1KB'],
		[1536, '2KB'],
		[100 * 1024 + 44 * 1024, '144KB'],
		[1024 * 1024 - 1, '1024KB'],
		[1024 * 1024, '1MB'],
		[5 * 1024 * 1024, '5MB'],
	])('formats %i bytes as %s', (input, expected) => {
		expect(formatBytes(input)).toBe(expected);
	});
});

describe('toMb', () => {
	test.each([
		[0, 0],
		[512 * 1024 - 1, 0],
		[512 * 1024, 1],
		[1024 * 1024, 1],
		[1536 * 1024, 2],
		[5 * 1024 * 1024, 5],
	])('converts %i bytes to %i MB', (input, expected) => {
		expect(toMb(input)).toBe(expected);
	});
});

describe('toGb', () => {
	test.each([
		[0, 0],
		[1024 * 1024 * 1024, 1],
		[1536 * 1024 * 1024, 1.5],
		[2000 * 1024 * 1024, 1.95],
		[500 * 1024 * 1024, 0.49],
		[1024 * 1024 * 1024 + 1, 1],
	])('converts %i bytes to %s GB', (input, expected) => {
		expect(toGb(input)).toBe(expected);
	});
});

describe('formatMbOrGb', () => {
	test.each([
		[4 * 1024 * 1024, '4 MB'],
		[500 * 1024 * 1024, '500 MB'],
		[1000 * 1024 * 1024, '1000 MB'],
		[1023 * 1024 * 1024, '1023 MB'],
		[1024 * 1024 * 1024, '1 GB'],
		[1536 * 1024 * 1024, '1.5 GB'],
		[2000 * 1024 * 1024, '1.95 GB'],
	])('formats %i bytes as %s', (input, expected) => {
		expect(formatMbOrGb(input)).toBe(expected);
	});
});
