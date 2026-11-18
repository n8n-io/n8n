import {
	areCellValuesEqual,
	formatCellValue,
	parseLooseDate,
	parsePastedValue,
	toText,
} from './cellValues';

describe('areCellValuesEqual', () => {
	it('should compare primitive values strictly', () => {
		expect(areCellValuesEqual('a', 'a', 'string')).toBe(true);
		expect(areCellValuesEqual('a', 'b', 'string')).toBe(false);
		expect(areCellValuesEqual(1, 1, 'number')).toBe(true);
		expect(areCellValuesEqual(1, '1', 'number')).toBe(false);
		expect(areCellValuesEqual(true, false, 'boolean')).toBe(false);
	});

	it('should treat undefined and null as the same value', () => {
		expect(areCellValuesEqual(undefined, null, 'string')).toBe(true);
		expect(areCellValuesEqual(null, '', 'string')).toBe(false);
	});

	it('should compare dates by time', () => {
		expect(
			areCellValuesEqual(
				new Date('2026-11-18T10:00:00Z'),
				new Date('2026-11-18T10:00:00Z'),
				'date',
			),
		).toBe(true);
		expect(
			areCellValuesEqual(
				new Date('2026-11-18T10:00:00Z'),
				new Date('2026-11-18T11:00:00Z'),
				'date',
			),
		).toBe(false);
	});

	it('should compare a date string with a Date by time', () => {
		expect(
			areCellValuesEqual('2026-11-18T10:00:00.000Z', new Date('2026-11-18T10:00:00Z'), 'date'),
		).toBe(true);
	});

	it('should not treat a date and null as equal', () => {
		expect(areCellValuesEqual(new Date('2026-11-18T10:00:00Z'), null, 'date')).toBe(false);
		expect(areCellValuesEqual(null, undefined, 'date')).toBe(true);
	});
});

describe('formatCellValue', () => {
	it('should show missing values as an empty text', () => {
		expect(formatCellValue(null, 'string')).toBe('');
		expect(formatCellValue(undefined, 'number')).toBe('');
	});

	it('should group thousands with a space and keep the decimal dot', () => {
		expect(formatCellValue(1234567.89, 'number')).toBe('1 234 567.89');
		expect(formatCellValue(-1234, 'number')).toBe('-1 234');
	});

	it('should show dates as ISO 8601 in the local time zone', () => {
		const formatted = formatCellValue(new Date(2026, 10, 18, 9, 5, 7), 'date');

		expect(formatted).toMatch(/^2026-11-18T09:05:07\.000[+-]\d{2}:\d{2}$/);
		expect(new Date(formatted).getTime()).toBe(new Date(2026, 10, 18, 9, 5, 7).getTime());
	});

	it('should show json values as JSON', () => {
		expect(formatCellValue({ a: [1] }, 'json')).toBe('{"a":[1]}');
	});
});

describe('toText', () => {
	it('should convert values to text', () => {
		expect(toText(null)).toBe('');
		expect(toText(12)).toBe('12');
		expect(toText(new Date('2026-11-18T10:00:00Z'))).toBe('2026-11-18T10:00:00.000Z');
		expect(toText({ a: 1 })).toBe('{"a":1}');
	});
});

describe('parsePastedValue', () => {
	it('should convert pasted text to the column type', () => {
		expect(parsePastedValue('abc', 'string')).toBe('abc');
		expect(parsePastedValue('12.5', 'number')).toBe(12.5);
		expect(parsePastedValue('TRUE', 'boolean')).toBe(true);
		expect(parsePastedValue('false', 'boolean')).toBe(false);
		expect(parsePastedValue('2026-11-18T10:00:00Z', 'date')).toEqual(
			new Date('2026-11-18T10:00:00Z'),
		);
	});

	it('should return undefined for text that does not fit the column type', () => {
		expect(parsePastedValue('abc', 'number')).toBeUndefined();
		expect(parsePastedValue(' ', 'number')).toBeUndefined();
		expect(parsePastedValue('yes', 'boolean')).toBeUndefined();
		expect(parsePastedValue('not a date', 'date')).toBeUndefined();
		expect(parsePastedValue('{}', 'json')).toBeUndefined();
	});
});

describe('parseLooseDate', () => {
	it('should parse dates with missing leading zeros, time or seconds', () => {
		expect(parseLooseDate('2023-7-9 5:6:7')).toEqual(new Date(2023, 6, 9, 5, 6, 7));
		expect(parseLooseDate('2023-07-09')).toEqual(new Date(2023, 6, 9, 0, 0, 0));
		expect(parseLooseDate(' 2023-07-09 05:06 ')).toEqual(new Date(2023, 6, 9, 5, 6, 0));
	});

	it('should reject text that is not a valid date', () => {
		expect(parseLooseDate('2023-02-30')).toBeNull();
		expect(parseLooseDate('2023-07-09 25:00')).toBeNull();
		expect(parseLooseDate('09/07/2023')).toBeNull();
	});
});
