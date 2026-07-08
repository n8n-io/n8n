import { CalendarDate, CalendarDateTime } from '@internationalized/date';

import {
	applyActiveFieldSelection,
	formatDateRangeValue,
	formatDateValue,
	formatMonthYearHeading,
	formatWeekdayTwoLetters,
	getNextActiveFieldAfterSelection,
	parseDateValue,
	createTodayRange,
} from './datePicker.utils';

describe('datePicker.utils', () => {
	describe('formatDateValue', () => {
		it('returns empty string when value is undefined', () => {
			expect(formatDateValue(undefined)).toBe('');
		});

		it('formats a date with locale-aware month names', () => {
			const date = new CalendarDate(2025, 6, 15);

			expect(formatDateValue(date, { locale: 'en-GB' })).toMatch(/15.*Jun.*2025/);
		});

		it('includes time when requested', () => {
			const date = new CalendarDateTime(2025, 6, 15, 14, 30, 0);

			expect(formatDateValue(date, { locale: 'en-GB', includeTime: true })).toMatch(/14:30/);
		});
	});

	describe('formatDateRangeValue', () => {
		it('returns empty string when start is missing', () => {
			expect(formatDateRangeValue({ end: new CalendarDate(2025, 6, 15) })).toBe('');
		});

		it('formats a single-day range as one date', () => {
			const date = new CalendarDate(2025, 6, 15);

			expect(formatDateRangeValue({ start: date, end: date }, { locale: 'en-GB' })).toMatch(
				/15.*Jun.*2025/,
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

			expect(result).toMatch(/10.*Jan.*–.*15.*Jun.*2025/);
		});

		it('includes both years when the range spans years', () => {
			const result = formatDateRangeValue(
				{
					start: new CalendarDate(2024, 12, 20),
					end: new CalendarDate(2025, 1, 5),
				},
				{ locale: 'en-GB' },
			);

			expect(result).toMatch(/2024.*–.*2025/);
		});
	});

	describe('parseDateValue', () => {
		it('parses ISO date strings', () => {
			const parsed = parseDateValue('2025-06-15');

			expect(parsed?.year).toBe(2025);
			expect(parsed?.month).toBe(6);
			expect(parsed?.day).toBe(15);
		});

		it('returns undefined for invalid input', () => {
			expect(parseDateValue('not-a-date')).toBeUndefined();
		});
	});

	describe('formatWeekdayTwoLetters', () => {
		it('returns the first two letters of a weekday label', () => {
			expect(formatWeekdayTwoLetters('Mon')).toBe('Mo');
			expect(formatWeekdayTwoLetters('Wednesday')).toBe('We');
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

	describe('applyActiveFieldSelection', () => {
		it('sets the end date when the end field is active', () => {
			const start = new CalendarDate(2025, 6, 10);
			const end = new CalendarDate(2025, 6, 20);

			const result = applyActiveFieldSelection('end', end, { start });

			expect(result.start?.compare(start)).toBe(0);
			expect(result.end?.compare(end)).toBe(0);
		});

		it('swaps the range when the end field is active and the date is before start', () => {
			const start = new CalendarDate(2025, 6, 20);
			const selected = new CalendarDate(2025, 6, 10);

			const result = applyActiveFieldSelection('end', selected, { start });

			expect(result.start?.compare(selected)).toBe(0);
			expect(result.end?.compare(start)).toBe(0);
		});

		it('updates the start date when the start field is active', () => {
			const start = new CalendarDate(2025, 6, 5);
			const end = new CalendarDate(2025, 6, 20);

			const result = applyActiveFieldSelection('start', start, { start: end, end });

			expect(result.start?.compare(start)).toBe(0);
			expect(result.end?.compare(end)).toBe(0);
		});
	});

	describe('getNextActiveFieldAfterSelection', () => {
		it('moves to end immediately after selecting start', () => {
			expect(
				getNextActiveFieldAfterSelection('start', {
					start: new CalendarDate(2025, 6, 10),
					end: new CalendarDate(2025, 6, 20),
				}),
			).toBe('end');
		});

		it('stays on end after the first end selection', () => {
			expect(
				getNextActiveFieldAfterSelection('end', {
					start: new CalendarDate(2025, 6, 10),
				}),
			).toBe('end');
		});

		it('moves to start after updating an existing end date', () => {
			expect(
				getNextActiveFieldAfterSelection('end', {
					start: new CalendarDate(2025, 6, 10),
					end: new CalendarDate(2025, 6, 20),
				}),
			).toBe('start');
		});
	});
});
