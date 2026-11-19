import { formatCost, formatTokenCount } from './task-board.format';

describe('formatTokenCount', () => {
	it.each([
		[0, '0'],
		[950, '950'],
		[1000, '1k'],
		[1234, '1.2k'],
		[12_400, '12.4k'],
		[12_449, '12.4k'],
		[128_000, '128k'],
		[1_500_000, '1.5M'],
		[2_000_000_000, '2B'],
	])('writes %d as %s', (count, expected) => {
		expect(formatTokenCount(count)).toBe(expected);
	});

	it('moves to the next unit when the rounded value reaches 1000', () => {
		expect(formatTokenCount(999_950)).toBe('1M');
		expect(formatTokenCount(999_949)).toBe('999.9k');
	});
});

describe('formatCost', () => {
	it.each([
		[0, '$0.00'],
		[0.04, '$0.04'],
		[0.046, '$0.05'],
		[1.5, '$1.50'],
		[1234.5, '$1,234.50'],
	])('writes %d with two decimals as %s', (cost, expected) => {
		expect(formatCost(cost)).toBe(expected);
	});

	it('keeps the digits of a price below one cent, so it does not read as free', () => {
		expect(formatCost(0.0042)).toBe('$0.0042');
		expect(formatCost(0.003)).toBe('$0.003');
		expect(formatCost(0.00456)).toBe('$0.0046');
	});

	it('shows a floor for a price that four decimals cannot hold', () => {
		expect(formatCost(0.00001)).toBe('<$0.0001');
	});
});
