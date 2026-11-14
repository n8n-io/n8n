import { describe, it, expect, vi } from 'vitest';

import { DateTime, Settings } from 'luxon';

import { convertToDateTime, defineField } from '../utils';

describe('defineField', () => {
	it('should add an own data field instead of calling an inherited setter', () => {
		const setter = vi.fn();
		const target = Object.create({
			set test(value: unknown) {
				setter(value);
			},
		}) as Record<string, unknown>;

		defineField(target, 'test', 1);

		expect(setter).not.toHaveBeenCalled();
		expect(Object.getOwnPropertyDescriptor(target, 'test')).toEqual({
			value: 1,
			writable: true,
			enumerable: true,
			configurable: true,
		});
	});
});

describe('convertToDateTime', () => {
	it.each(['America/New_York', 'UTC', 'Asia/Seoul'])(
		'keeps the written day of a date-only string in %s',
		(zone) => {
			const originalZone = Settings.defaultZone;
			Settings.defaultZone = zone;
			try {
				const day = convertToDateTime('2023-06-16');
				expect(day?.toISODate()).toBe('2023-06-16');
				expect(day?.hour).toBe(0);
				expect(convertToDateTime('2023-06')?.toISODate()).toBe('2023-06-01');
				expect(convertToDateTime('2023')?.toISODate()).toBe('2023-01-01');
			} finally {
				Settings.defaultZone = originalZone;
			}
		},
	);

	it('parses datetimes with an explicit offset unchanged', () => {
		expect(convertToDateTime('2023-06-16T10:00:00.000Z')?.toMillis()).toBe(
			new Date('2023-06-16T10:00:00.000Z').getTime(),
		);
	});

	it('parses ISO datetimes without an offset as local time, unchanged', () => {
		const parsed = convertToDateTime('2023-06-16T10:30:00');
		expect(parsed?.toISODate()).toBe('2023-06-16');
		expect(parsed?.hour).toBe(10);
		expect(parsed?.minute).toBe(30);
	});

	it('returns undefined for invalid dates', () => {
		expect(convertToDateTime('2023-13')).toBeUndefined();
		expect(convertToDateTime('nonsense')).toBeUndefined();
	});

	it.each(['America/New_York', 'UTC', 'Asia/Seoul'])(
		'keeps the previous rollover normalization for invalid date-only strings in %s',
		(zone) => {
			const originalZone = Settings.defaultZone;
			Settings.defaultZone = zone;
			try {
				// These used to go through new Date(), which normalizes
				// "2023-02-29" to March 1 and "2023-06-31" to July 1.
				const rolled = convertToDateTime('2023-02-29');
				expect(rolled?.isValid).toBe(true);
				expect(rolled?.toMillis()).toBe(new Date('2023-02-29').getTime());
				expect(convertToDateTime('2023-06-31')?.toMillis()).toBe(
					new Date('2023-06-31').getTime(),
				);
			} finally {
				Settings.defaultZone = originalZone;
			}
		},
	);

	it('passes Date and DateTime values through unchanged', () => {
		const fromDate = convertToDateTime(new Date(2023, 5, 16, 12, 30));
		expect(fromDate?.toISODate()).toBe('2023-06-16');
		expect(fromDate?.hour).toBe(12);
		const dateTime = DateTime.fromISO('2023-06-16T08:00:00', { zone: 'Asia/Seoul' });
		expect(convertToDateTime(dateTime)).toBe(dateTime);
	});
});
