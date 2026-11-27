import { describe, expect, test } from 'vitest';
import { compactTokenFormatter, formatTokenCount } from '../token-count';

describe('compactTokenFormatter', () => {
	test.each([0, 999, 1000, 1300, 999999, 2_400_000, -1300, 1.25, NaN, Infinity, -Infinity])(
		'preserves timeline formatting for %s',
		(tokens) => {
			const timelineFormatter = new Intl.NumberFormat('en-US', {
				notation: 'compact',
				maximumFractionDigits: 1,
			});

			expect(compactTokenFormatter.format(tokens).toUpperCase()).toBe(
				timelineFormatter.format(tokens).toUpperCase(),
			);
		},
	);
});

describe('formatTokenCount', () => {
	test.each([
		[0, '0'],
		[100, '100'],
		[999, '999'],
		[1000, '1K'],
		[1300, '1.3K'],
		[12345, '12.3K'],
		[999999, '1M'],
		[2_400_000, '2.4M'],
		[1_900_000_000, '1.9B'],
	])('formats %i as %s', (input, expected) => {
		expect(formatTokenCount(input)).toBe(expected);
	});

	test('returns non-finite values as strings', () => {
		expect(formatTokenCount(Number.NaN)).toBe('NaN');
	});
});
