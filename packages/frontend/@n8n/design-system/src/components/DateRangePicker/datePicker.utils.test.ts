import { CalendarDate, CalendarDateTime } from '@internationalized/date';

import {
	createTodayRange,
	formatDateRangeValue,
	formatDateValue,
	formatMonthYearHeading,
	formatTimeValue,
	isDateRangeValid,
	isDateSelectable,
	mergeDatePreservingTime,
	parseDateValue,
	parseTimeValue,
	resolveFieldValueCommit,
	shouldIncludeTimeInDateFormat,
	toDateTimeValue,
} from './datePicker.utils';

describe('datePicker.utils', () => {
	describe('formatDateValue', () => {
		it('returns empty string when value is undefined', () => {
			expect(formatDateValue(undefined)).toBe('');
		});

		it('formats a date as MMM dd, yyyy', () => {
			const date = new CalendarDate(2025, 6, 15);

			expect(formatDateValue(date, { locale: 'en-GB' })).toBe('Jun 15, 2025');
		});

		it('zero-pads single-digit days', () => {
			const date = new CalendarDate(2025, 6, 5);

			expect(formatDateValue(date)).toBe('Jun 05, 2025');
		});

		it('includes time when requested', () => {
			const date = new CalendarDateTime(2025, 6, 15, 14, 30, 0);

			expect(formatDateValue(date, { locale: 'en-GB', includeTime: true })).toMatch(
				/^Jun 15, 2025, .*14:30/,
			);
		});
	});

	describe('formatDateRangeValue', () => {
		it('returns empty string when start is missing', () => {
			expect(formatDateRangeValue({ end: new CalendarDate(2025, 6, 15) })).toBe('');
		});

		it('formats a single-day range as one date', () => {
			const date = new CalendarDate(2025, 6, 15);

			expect(formatDateRangeValue({ start: date, end: date }, { locale: 'en-GB' })).toBe(
				'Jun 15, 2025',
			);
		});

		it('omits the year on the start date when both dates share a year', () => {
			const result = formatDateRangeValue(
				{
					start: new CalendarDate(2025, 1, 10),
					end: new CalendarDate(2025, 6, 15),
				},
				{ locale: 'en-GB' },
			);

			expect(result).toBe('Jan 10 – Jun 15, 2025');
		});

		it('includes both years when the range spans years', () => {
			const result = formatDateRangeValue(
				{
					start: new CalendarDate(2024, 12, 20),
					end: new CalendarDate(2025, 1, 5),
				},
				{ locale: 'en-GB' },
			);

			expect(result).toBe('Dec 20, 2024 – Jan 05, 2025');
		});
	});

	describe('parseDateValue', () => {
		it('parses ISO date strings', () => {
			const parsed = parseDateValue('2025-06-15');

			expect(parsed?.year).toBe(2025);
			expect(parsed?.month).toBe(6);
			expect(parsed?.day).toBe(15);
		});

		it('parses MMM dd, yyyy formatted dates', () => {
			const parsed = parseDateValue('Jun 15, 2025');

			expect(parsed?.year).toBe(2025);
			expect(parsed?.month).toBe(6);
			expect(parsed?.day).toBe(15);
		});

		it('rejects malformed or ambiguous dates instead of guessing', () => {
			expect(parseDateValue('Jul 30,2026')).toBeUndefined();
			expect(parseDateValue('Jul 30,99')).toBeUndefined();
			expect(parseDateValue('Jul 30, 99')).toBeUndefined();
			expect(parseDateValue('not-a-date')).toBeUndefined();
		});
	});

	describe('isDateRangeValid', () => {
		it('allows incomplete ranges', () => {
			expect(isDateRangeValid(new CalendarDate(2025, 6, 15), undefined)).toBe(true);
			expect(isDateRangeValid(undefined, new CalendarDate(2025, 6, 15))).toBe(true);
		});

		it('rejects ranges where start is after end', () => {
			expect(isDateRangeValid(new CalendarDate(2025, 6, 20), new CalendarDate(2025, 6, 15))).toBe(
				false,
			);
		});

		it('rejects ranges that include an unavailable date', () => {
			const unavailable = new CalendarDate(2025, 6, 17);

			expect(
				isDateRangeValid(new CalendarDate(2025, 6, 15), new CalendarDate(2025, 6, 20), {
					isDateUnavailable: (date) => date.compare(unavailable) === 0,
				}),
			).toBe(false);
		});
	});

	describe('isDateSelectable', () => {
		it('rejects dates outside bounds', () => {
			expect(
				isDateSelectable(new CalendarDate(2025, 1, 1), {
					minValue: new CalendarDate(2025, 6, 1),
				}),
			).toBe(false);
		});
	});

	describe('createTodayRange', () => {
		it('returns today for both start and end', () => {
			const range = createTodayRange();

			expect(range?.start).toBeDefined();
			expect(range?.end).toBeDefined();
			expect(range?.start?.compare(range.end)).toBe(0);
		});
	});

	describe('formatMonthYearHeading', () => {
		it('formats a month heading with a three-letter month name', () => {
			expect(formatMonthYearHeading([new CalendarDate(2025, 12, 1)], 'en-GB')).toMatch(
				/^Dec 2025$/,
			);
		});
	});

	describe('formatTimeValue', () => {
		it('returns empty string for date-only values', () => {
			expect(formatTimeValue(new CalendarDate(2025, 6, 15))).toBe('');
		});

		it('formats hours and minutes with leading zeros in 24-hour mode', () => {
			expect(formatTimeValue(new CalendarDateTime(2025, 6, 15, 9, 5, 0))).toBe('09:05');
			expect(formatTimeValue(new CalendarDateTime(2025, 6, 15, 17, 0, 0), 24)).toBe('17:00');
		});

		it('formats times with AM/PM in 12-hour mode', () => {
			expect(formatTimeValue(new CalendarDateTime(2025, 6, 15, 0, 0, 0), 12)).toBe('12:00 AM');
			expect(formatTimeValue(new CalendarDateTime(2025, 6, 15, 9, 5, 0), 12)).toBe('09:05 AM');
			expect(formatTimeValue(new CalendarDateTime(2025, 6, 15, 12, 0, 0), 12)).toBe('12:00 PM');
			expect(formatTimeValue(new CalendarDateTime(2025, 6, 15, 17, 30, 0), 12)).toBe('05:30 PM');
		});
	});

	describe('parseTimeValue', () => {
		it('parses a valid HH:mm string in 24-hour mode', () => {
			expect(parseTimeValue('14:30')).toEqual({ hour: 14, minute: 30 });
		});

		it('parses AM/PM strings in 12-hour mode', () => {
			expect(parseTimeValue('12:00 AM', 12)).toEqual({ hour: 0, minute: 0 });
			expect(parseTimeValue('09:05 AM', 12)).toEqual({ hour: 9, minute: 5 });
			expect(parseTimeValue('12:00 PM', 12)).toEqual({ hour: 12, minute: 0 });
			expect(parseTimeValue('5:30 pm', 12)).toEqual({ hour: 17, minute: 30 });
		});

		it('returns undefined for invalid input', () => {
			expect(parseTimeValue('25:00')).toBeUndefined();
			expect(parseTimeValue('abc')).toBeUndefined();
			expect(parseTimeValue('13:00 AM', 12)).toBeUndefined();
			expect(parseTimeValue('14:30', 12)).toBeUndefined();
		});
	});

	describe('mergeDatePreservingTime', () => {
		it('keeps the existing time when merging a new calendar date', () => {
			const selected = new CalendarDate(2025, 6, 20);
			const existing = new CalendarDateTime(2025, 6, 15, 9, 30, 0);

			const result = mergeDatePreservingTime(selected, existing);

			expect(result.toString()).toBe('2025-06-20T09:30:00');
		});

		it('defaults to 9:00 when no existing time is present', () => {
			const selected = new CalendarDate(2025, 6, 20);

			expect(mergeDatePreservingTime(selected).toString()).toBe('2025-06-20T09:00:00');
			expect(mergeDatePreservingTime(selected, new CalendarDate(2025, 6, 15)).toString()).toBe(
				'2025-06-20T09:00:00',
			);
		});
	});

	describe('shouldIncludeTimeInDateFormat', () => {
		it('is false when a separate time field is shown', () => {
			expect(
				shouldIncludeTimeInDateFormat({
					showTime: true,
					granularity: 'minute',
				}),
			).toBe(false);
		});

		it('is true when granularity includes time and showTime is off', () => {
			expect(
				shouldIncludeTimeInDateFormat({
					showTime: false,
					granularity: 'minute',
				}),
			).toBe(true);
		});
	});

	describe('resolveFieldValueCommit', () => {
		it('sets both ends in single mode', () => {
			const value = new CalendarDate(2025, 6, 15);
			const result = resolveFieldValueCommit({
				field: 'start',
				value,
				range: { start: undefined, end: undefined },
				single: true,
			});

			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.range.start?.compare(value)).toBe(0);
			expect(result.range.end?.compare(value)).toBe(0);
		});

		it('clears end when a new start is after the current end', () => {
			const result = resolveFieldValueCommit({
				field: 'start',
				value: new CalendarDate(2025, 6, 20),
				range: {
					start: new CalendarDate(2025, 6, 10),
					end: new CalendarDate(2025, 6, 15),
				},
			});

			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.range.start?.toString()).toBe('2025-06-20');
			expect(result.range.end).toBeUndefined();
		});

		it('rejects values outside the allowed bounds', () => {
			const result = resolveFieldValueCommit({
				field: 'end',
				value: new CalendarDate(2025, 1, 1),
				range: { start: new CalendarDate(2025, 6, 10), end: undefined },
				selectionOptions: { minValue: new CalendarDate(2025, 6, 1) },
			});

			expect(result).toEqual({ ok: false, error: 'outside' });
		});
	});

	describe('toDateTimeValue', () => {
		it('applies the provided time onto a date', () => {
			const result = toDateTimeValue(new CalendarDate(2025, 6, 15), { hour: 8, minute: 15 });

			expect(result.toString()).toBe('2025-06-15T08:15:00');
		});
	});
});
