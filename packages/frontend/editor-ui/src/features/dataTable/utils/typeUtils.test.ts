import { describe, it, expect } from 'vitest';

import { parseLooseDateInput, areValuesEqual } from '@/features/dataTable/utils/typeUtils';

describe('Loose Date Parsing', () => {
	it('parses full loose datetime with single-digit parts', () => {
		const d = parseLooseDateInput('2023-7-9 5:6:7');
		expect(d).not.toBeNull();
		expect(d?.getFullYear()).toBe(2023);
		expect(d?.getMonth()).toBe(6); // July is 6 (0-indexed)
		expect(d?.getDate()).toBe(9);
		expect(d?.getHours()).toBe(5);
		expect(d?.getMinutes()).toBe(6);
		expect(d?.getSeconds()).toBe(7);
	});

	it('parses date-only and defaults time to 00:00:00', () => {
		const d = parseLooseDateInput('2023-07-09');
		expect(d).not.toBeNull();
		expect(d?.getHours()).toBe(0);
		expect(d?.getMinutes()).toBe(0);
		expect(d?.getSeconds()).toBe(0);
	});

	it('parses without seconds and defaults seconds to 00', () => {
		const d = parseLooseDateInput('2023-07-09 05:06');
		expect(d).not.toBeNull();
		expect(d?.getHours()).toBe(5);
		expect(d?.getMinutes()).toBe(6);
		expect(d?.getSeconds()).toBe(0);
	});

	it('trims surrounding whitespace', () => {
		const d = parseLooseDateInput('   2023-07-09 05:06:07   ');
		expect(d).not.toBeNull();
		expect(d?.getFullYear()).toBe(2023);
	});

	it('accepts T separator between date and time', () => {
		const d = parseLooseDateInput('2023-01-02T3:4:5');
		expect(d).not.toBeNull();
		expect(d?.getFullYear()).toBe(2023);
		expect(d?.getMonth()).toBe(0);
		expect(d?.getDate()).toBe(2);
		expect(d?.getHours()).toBe(3);
		expect(d?.getMinutes()).toBe(4);
		expect(d?.getSeconds()).toBe(5);
	});

	it('accepts T separator without seconds and defaults seconds to 00', () => {
		const d = parseLooseDateInput('2023-01-02T3:4');
		expect(d).not.toBeNull();
		expect(d?.getFullYear()).toBe(2023);
		expect(d?.getMonth()).toBe(0);
		expect(d?.getDate()).toBe(2);
		expect(d?.getHours()).toBe(3);
		expect(d?.getMinutes()).toBe(4);
		expect(d?.getSeconds()).toBe(0);
	});

	it('validates real calendar dates (e.g., leap day)', () => {
		expect(parseLooseDateInput('2024-02-29')).not.toBeNull();
		expect(parseLooseDateInput('2023-02-29')).toBeNull();
	});

	it('accepts single-digit date-only input', () => {
		const d = parseLooseDateInput('2023-7-9');
		expect(d).not.toBeNull();
		expect(d?.getFullYear()).toBe(2023);
		expect(d?.getMonth()).toBe(6);
		expect(d?.getDate()).toBe(9);
		expect(d?.getHours()).toBe(0);
		expect(d?.getMinutes()).toBe(0);
		expect(d?.getSeconds()).toBe(0);
	});

	it('returns null for invalid inputs', () => {
		const invalidInputs = [
			// Invalid ranges
			'2023-13-01',
			'2023-00-10',
			'2023-01-32',
			'2023-01-00',
			'2023-01-01 24:00:00',
			'2023-01-01 23:60:00',
			'2023-01-01 23:59:60',
			// Invalid calendar dates
			'2023-02-30',
			'2023-04-31',
			// Invalid separators/spacing
			'2023-01-02  3:4:5',
			// Non-matching strings
			'not a date',
			'2023/07/09',
			'07-09-2023',
		];

		invalidInputs.forEach((input) => {
			expect(parseLooseDateInput(input)).toBeNull();
		});
	});
});

describe('Cell value comparison', () => {
	it('compares Date values by timestamp when type is date', () => {
		const a = new Date(2023, 6, 9, 5, 6, 7);
		const b = new Date(2023, 6, 9, 5, 6, 7);
		const c = new Date(2023, 6, 9, 5, 6, 8);

		expect(areValuesEqual(a, b, 'date')).toBe(true);
		expect(areValuesEqual(a, c, 'date')).toBe(false);
	});

	it('falls back to strict equality for non-date types', () => {
		expect(areValuesEqual(1, 1, 'number')).toBe(true);
		expect(areValuesEqual(1, 2, 'number')).toBe(false);
		const obj = { a: 1 };
		expect(areValuesEqual(obj, obj, 'string')).toBe(true);
		expect(areValuesEqual({ a: 1 }, { a: 1 }, 'string')).toBe(false);
	});

	it('when type is date but values are not Date instances, uses strict equality', () => {
		const date = new Date(2023, 6, 9);
		expect(areValuesEqual(date, date.toISOString(), 'date')).toBe(false);
		const sameRef: unknown = { when: date };
		expect(areValuesEqual(sameRef, sameRef, 'date')).toBe(true);
	});
});
