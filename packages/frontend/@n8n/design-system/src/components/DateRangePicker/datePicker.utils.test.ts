import { CalendarDate, CalendarDateTime } from '@internationalized/date';

import { formatDateRangeValue, formatDateValue } from './datePicker.utils';

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
});
