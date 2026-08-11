import { RecurringCronUnit } from '@n8n/constants';
import { DateTime } from 'luxon';

/**
 * How many whole periods of `unit` separate two times, counted on the calendar
 * rather than by elapsed time. For example two times a minute apart but on
 * either side of midnight are 1 day apart, not 0.
 *
 * Daylight-saving changes never affect the count. Hours are counted by the
 * clock, so 23:30 to 01:30 is always 2 hours even if the real gap was 1 or 3
 * hours that night. Weeks start on Sunday. Months are counted on the calendar,
 * so "every 12 months" still lines up a year later.
 *
 * @param from The earlier time.
 * @param to The later time.
 * @param unit The period to count in: hours, days, weeks or months.
 * @param timezone IANA zone the calendar is read in.
 * @returns The number of whole periods from `from` to `to`.
 */
export function periodsBetween(
	from: Date,
	to: Date,
	unit: RecurringCronUnit,
	timezone: string,
): number {
	const start = DateTime.fromJSDate(from, { zone: timezone });
	const end = DateTime.fromJSDate(to, { zone: timezone });

	switch (unit) {
		case RecurringCronUnit.Hours:
			return (
				calendarDaysBetween(start.startOf('day'), end.startOf('day')) * 24 + end.hour - start.hour
			);
		case RecurringCronUnit.Days:
			return calendarDaysBetween(start.startOf('day'), end.startOf('day'));
		case RecurringCronUnit.Weeks:
			return calendarDaysBetween(startOfSundayWeek(start), startOfSundayWeek(end)) / 7;
		case RecurringCronUnit.Months:
			return end.year * 12 + end.month - (start.year * 12 + start.month);
		default: {
			const exhaustive: never = unit;
			return exhaustive;
		}
	}
}

/**
 * The number of whole days between two local midnights. A daylight-saving
 * change can make the raw difference an hour off, so it is rounded back to a
 * whole number of days.
 * @param startOfFromDay Local midnight of the earlier day.
 * @param startOfToDay Local midnight of the later day.
 * @returns The whole-day count between them.
 */
function calendarDaysBetween(startOfFromDay: DateTime, startOfToDay: DateTime): number {
	return Math.round(startOfToDay.diff(startOfFromDay, 'days').days);
}

/**
 * The local midnight of the Sunday that starts `instant`'s week.
 * @param instant The time whose week start we want.
 * @returns Midnight of that Sunday.
 */
function startOfSundayWeek(instant: DateTime): DateTime {
	// Luxon numbers weekdays Mon=1..Sun=7, so Sunday (7 % 7 = 0) is the week start.
	return instant.startOf('day').minus({ days: instant.weekday % 7 });
}
