import {
	CalendarDate,
	CalendarDateTime,
	getLocalTimeZone,
	parseDate,
	today,
	type DateValue,
} from '@internationalized/date';
import type { DateRange } from 'reka-ui';

export type DatePickerFormatOptions = {
	includeTime?: boolean;
	locale?: string;
	hourCycle?: 12 | 24;
};

export type DatePickerHourCycle = NonNullable<DatePickerFormatOptions['hourCycle']>;

export type DatePickerBoundsOptions = {
	minValue?: DateValue;
	maxValue?: DateValue;
};

export type DatePickerSelectionOptions = DatePickerBoundsOptions & {
	granularity?: string;
	referenceStart?: DateValue;
	isDateUnavailable?: (date: DateValue) => boolean;
};

/** Type guard for DateValues that include hour/minute/second. */
function hasTimeComponent(value: DateValue | undefined): value is CalendarDateTime {
	return value !== undefined && 'hour' in value;
}

/** Short month label, truncated to three characters for consistent parsing. */
function formatShortMonth(date: Date, locale: string): string {
	return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date).slice(0, 3);
}

/** Formats as `MMM dd, yyyy` (e.g. Jun 15, 2025). */
function formatDateParts(date: Date, locale: string): string {
	const month = formatShortMonth(date, locale);
	const day = String(date.getDate()).padStart(2, '0');
	const year = String(date.getFullYear());
	return `${month} ${day}, ${year}`;
}

/** Formats hour:minute using the given hour cycle. */
function formatTimeParts(date: Date, locale: string, hourCycle: DatePickerHourCycle = 24): string {
	return new Intl.DateTimeFormat(locale, {
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: hourCycle === 12 ? 'h12' : 'h23',
	}).format(date);
}

/** Maps a short month name back to a 1–12 month index for the locale. */
function resolveMonthIndex(monthText: string, locale: string): number | undefined {
	const normalized = monthText.slice(0, 3).toLowerCase();

	for (let month = 1; month <= 12; month++) {
		const sample = new Date(2000, month - 1, 1);
		if (formatShortMonth(sample, locale).toLowerCase() === normalized) {
			return month;
		}
	}

	return undefined;
}

/** Creates a CalendarDate / CalendarDateTime, rejecting impossible calendar days. */
function createParsedDate(
	year: number,
	month: number,
	day: number,
	includeTime: boolean,
): DateValue | undefined {
	try {
		const date = new CalendarDate(year, month, day);
		if (date.year !== year || date.month !== month || date.day !== day) {
			return undefined;
		}

		return includeTime ? new CalendarDateTime(year, month, day, 0, 0, 0) : date;
	} catch {
		return undefined;
	}
}

/** Parses `MMM dd, yyyy` (optionally with a trailing time segment when includeTime is set). */
function parseFormattedDateValue(
	input: string,
	options: DatePickerFormatOptions,
): DateValue | undefined {
	const locale = options.locale ?? 'en';
	const includeTime = options.includeTime ?? false;

	const match = includeTime
		? /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4}),\s+(.+)$/.exec(input)
		: /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/.exec(input);

	if (!match) return undefined;

	const month = resolveMonthIndex(match[1], locale);
	if (month === undefined) return undefined;

	const day = Number(match[2]);
	const year = Number(match[3]);
	if (!Number.isInteger(day) || !Number.isInteger(year)) return undefined;
	if (year < 1000 || year > 9999 || day < 1 || day > 31) return undefined;

	const parsed = createParsedDate(year, month, day, includeTime);
	if (!parsed || !includeTime) return parsed;

	const timeText = match[4]?.trim();
	if (!timeText) return undefined;

	const parsedTime = parseTimeValue(timeText, options.hourCycle ?? 24);
	if (parsedTime) {
		return toDateTimeValue(parsed, parsedTime);
	}

	// Accept locale-formatted times produced by formatTimeParts (e.g. "14:30").
	const localeParsed = Date.parse(`2000-01-01T${timeText}`);
	if (Number.isNaN(localeParsed)) {
		const spaced = Date.parse(`2000-01-01 ${timeText}`);
		if (Number.isNaN(spaced)) return undefined;
		const localeDate = new Date(spaced);
		return new CalendarDateTime(
			year,
			month,
			day,
			localeDate.getHours(),
			localeDate.getMinutes(),
			localeDate.getSeconds(),
		);
	}

	const localeDate = new Date(localeParsed);
	return new CalendarDateTime(
		year,
		month,
		day,
		localeDate.getHours(),
		localeDate.getMinutes(),
		localeDate.getSeconds(),
	);
}

/** Sets start from a calendar click and always clears end (start → end → start → end). */
function applyStartSelection(selected: DateValue, _range: DateRange): DateRange {
	return { start: selected.copy(), end: undefined };
}

/** Sets end from a calendar click, swapping start/end when the user picks an earlier day. */
function applyEndSelection(selected: DateValue, range: DateRange): DateRange {
	const end = selected.copy();
	const start = range.start?.copy();

	if (!start) {
		return { start: end.copy(), end: undefined };
	}

	if (end.compare(start) < 0) {
		return { start: end.copy(), end: start.copy() };
	}

	return { start, end };
}

/** Formats a single date for display (`MMM dd, yyyy`, optionally with time). */
export function formatDateValue(
	value: DateValue | undefined,
	options: DatePickerFormatOptions = {},
): string {
	if (!value) return '';

	const locale = options.locale ?? 'en';
	const date = value.toDate(getLocalTimeZone());
	const formatted = formatDateParts(date, locale);

	if (!options.includeTime) return formatted;

	return `${formatted}, ${formatTimeParts(date, locale, options.hourCycle ?? 24)}`;
}

/** Formats a start/end range for the trigger label (collapses same-day ranges). */
export function formatDateRangeValue(
	range: { start?: DateValue; end?: DateValue },
	options: DatePickerFormatOptions = {},
): string {
	const { start, end } = range;
	if (!start) return '';

	if (!end || start.compare(end) === 0) {
		return formatDateValue(start, options);
	}

	const locale = options.locale ?? 'en';
	const startDate = start.toDate(getLocalTimeZone());

	if (start.year === end.year) {
		const startFormatted = `${formatShortMonth(startDate, locale)} ${String(startDate.getDate()).padStart(2, '0')}`;

		return `${startFormatted} – ${formatDateValue(end, options)}`;
	}

	return `${formatDateValue(start, options)} – ${formatDateValue(end, options)}`;
}

/** Returns whether a date falls within optional min/max bounds. */
export function isDateValueInBounds(
	value: DateValue,
	{ minValue, maxValue }: DatePickerBoundsOptions,
): boolean {
	if (minValue && value.compare(minValue) < 0) return false;
	if (maxValue && maxValue.compare(value) < 0) return false;
	return true;
}

/** Parses ISO or formatted date text into a DateValue. */
export function parseDateValue(
	input: string,
	options: DatePickerFormatOptions = {},
): DateValue | undefined {
	const trimmed = input.trim();
	if (!trimmed) return undefined;

	try {
		const parsed = parseDate(trimmed);
		return options.includeTime
			? new CalendarDateTime(parsed.year, parsed.month, parsed.day, 0, 0, 0)
			: parsed;
	} catch {
		// Fall through to strict formatted parsing below.
	}

	return parseFormattedDateValue(trimmed, options);
}

/** Returns today's date, with time when granularity or referenceStart requires it. */
export function getTodayDateValue(
	options: Pick<DatePickerSelectionOptions, 'granularity' | 'referenceStart'> = {},
): DateValue {
	const todayDate = today(getLocalTimeZone());
	const needsTime =
		(options.granularity !== undefined && options.granularity !== 'day') ||
		(options.referenceStart !== undefined && 'hour' in options.referenceStart);

	if (!needsTime) return todayDate;

	if (options.referenceStart && 'hour' in options.referenceStart) {
		return new CalendarDateTime(
			todayDate.year,
			todayDate.month,
			todayDate.day,
			options.referenceStart.hour,
			options.referenceStart.minute,
			options.referenceStart.second,
		);
	}

	return new CalendarDateTime(todayDate.year, todayDate.month, todayDate.day, 0, 0, 0);
}

/** Returns whether a date is within bounds and not marked unavailable. */
export function isDateSelectable(
	date: DateValue,
	{ minValue, maxValue, isDateUnavailable }: DatePickerSelectionOptions = {},
): boolean {
	if (isDateUnavailable?.(date)) return false;
	return isDateValueInBounds(date, { minValue, maxValue });
}

/** Returns whether start ≤ end and no day in the span is unavailable. */
export function isDateRangeValid(
	start: DateValue | undefined,
	end: DateValue | undefined,
	{ isDateUnavailable }: Pick<DatePickerSelectionOptions, 'isDateUnavailable'> = {},
): boolean {
	if (!start || !end) return true;
	if (start.compare(end) > 0) return false;

	if (isDateUnavailable) {
		let cursor = start;
		while (cursor.compare(end) <= 0) {
			if (isDateUnavailable(cursor)) return false;
			cursor = cursor.add({ days: 1 });
		}
	}

	return true;
}

/** Builds a same-day start/end range for today, or undefined if today is not selectable. */
export function createTodayRange(options: DatePickerSelectionOptions = {}):
	| {
			start: DateValue;
			end: DateValue;
	  }
	| undefined {
	const todayDate = getTodayDateValue(options);
	if (!isDateSelectable(todayDate, options)) return undefined;

	return {
		start: todayDate.copy(),
		end: todayDate.copy(),
	};
}

/** Returns true when both start and end are missing. */
export function isEmptyDateRange(range?: { start?: DateValue; end?: DateValue } | null) {
	return !range?.start && !range?.end;
}

/** Formats the time portion of a DateValue for the time input. */
export function formatTimeValue(
	value: DateValue | undefined,
	hourCycle: DatePickerHourCycle = 24,
): string {
	if (!hasTimeComponent(value)) return '';

	const minute = String(value.minute).padStart(2, '0');

	if (hourCycle === 24) {
		return `${String(value.hour).padStart(2, '0')}:${minute}`;
	}

	const period = value.hour < 12 ? 'AM' : 'PM';
	const hour12 = value.hour % 12 === 0 ? 12 : value.hour % 12;
	return `${String(hour12).padStart(2, '0')}:${minute} ${period}`;
}

/** Parses `HH:mm` or `hh:mm AM/PM` text into hour/minute. */
export function parseTimeValue(
	input: string,
	hourCycle: DatePickerHourCycle = 24,
): { hour: number; minute: number } | undefined {
	const trimmed = input.trim();

	if (hourCycle === 12) {
		const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
		if (!match) return undefined;

		let hour = Number(match[1]);
		const minute = Number(match[2]);
		const period = match[3].toUpperCase();

		if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return undefined;

		if (period === 'AM') {
			hour = hour === 12 ? 0 : hour;
		} else {
			hour = hour === 12 ? 12 : hour + 12;
		}

		return { hour, minute };
	}

	const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
	if (!match) return undefined;

	const hour = Number(match[1]);
	const minute = Number(match[2]);
	if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;

	return { hour, minute };
}

/** Default time-of-day when a date is first given a time component. */
export const DEFAULT_TIME_OF_DAY = { hour: 9, minute: 0, second: 0 } as const;

/** Combines a calendar date with hour/minute/second into a CalendarDateTime. */
export function toDateTimeValue(
	value: DateValue,
	time: { hour?: number; minute?: number; second?: number } = {},
): CalendarDateTime {
	return new CalendarDateTime(
		value.year,
		value.month,
		value.day,
		time.hour ?? (hasTimeComponent(value) ? value.hour : DEFAULT_TIME_OF_DAY.hour),
		time.minute ?? (hasTimeComponent(value) ? value.minute : DEFAULT_TIME_OF_DAY.minute),
		time.second ?? (hasTimeComponent(value) ? value.second : DEFAULT_TIME_OF_DAY.second),
	);
}

/** Applies a new calendar day while keeping the existing time-of-day when present. */
export function mergeDatePreservingTime(selected: DateValue, existing?: DateValue): DateValue {
	if (!hasTimeComponent(existing)) {
		return toDateTimeValue(selected, DEFAULT_TIME_OF_DAY);
	}

	return toDateTimeValue(selected, {
		hour: existing.hour,
		minute: existing.minute,
		second: existing.second,
	});
}

/** Whether the date text input should also display a time segment. */
export function shouldIncludeTimeInDateFormat(options: {
	showTime: boolean;
	granularity?: string;
	start?: DateValue;
	end?: DateValue;
}): boolean {
	if (options.showTime) return false;

	const { granularity, start, end } = options;
	return (
		(granularity !== undefined && granularity !== 'day') ||
		(start !== undefined && 'hour' in start) ||
		(end !== undefined && 'hour' in end)
	);
}

export type FieldValueCommitResult =
	| { ok: true; range: DateRange }
	| { ok: false; error: 'outside' | 'invalid' };

/**
 * Builds the next range when a start/end field commits a typed value.
 * Clears the opposite end when the new value would invert the range.
 */
export function resolveFieldValueCommit(options: {
	field: 'start' | 'end';
	value: DateValue;
	range: DateRange;
	single?: boolean;
	selectionOptions?: DatePickerSelectionOptions;
}): FieldValueCommitResult {
	const { field, value, range, single = false, selectionOptions = {} } = options;

	if (!isDateSelectable(value, selectionOptions)) {
		return { ok: false, error: 'outside' };
	}

	if (single) {
		return {
			ok: true,
			range: { start: value.copy(), end: value.copy() },
		};
	}

	if (field === 'start') {
		const nextEnd = range.end && range.end.compare(value) < 0 ? undefined : range.end?.copy();
		if (!isDateRangeValid(value, nextEnd, selectionOptions)) {
			return { ok: false, error: 'invalid' };
		}
		return { ok: true, range: { start: value.copy(), end: nextEnd?.copy() } };
	}

	const nextStart = range.start && value.compare(range.start) < 0 ? undefined : range.start?.copy();
	if (!isDateRangeValid(nextStart, value, selectionOptions)) {
		return { ok: false, error: 'invalid' };
	}
	return { ok: true, range: { start: nextStart?.copy(), end: value.copy() } };
}

/**
 * Resolves a calendar-day click into the next range and selection step.
 * Always alternates start → end → start → end. Start always clears end; end may
 * swap bounds. The step always advances.
 */
export function resolveDateSelection(options: {
	selected: DateValue;
	range: DateRange;
	selectionStep: 'start' | 'end';
	single?: boolean;
	preserveTime?: boolean;
}): { range: DateRange; nextSelectionStep: 'start' | 'end' } {
	const { selected, range, selectionStep, single = false, preserveTime = false } = options;

	if (single) {
		const singleDate = preserveTime ? mergeDatePreservingTime(selected, range.start) : selected;
		return {
			range: {
				start: singleDate.copy(),
				end: singleDate.copy(),
			},
			nextSelectionStep: 'start',
		};
	}

	const withTime = preserveTime
		? mergeDatePreservingTime(
				selected,
				selectionStep === 'end' ? (range.end ?? range.start) : range.start,
			)
		: selected.copy();

	return {
		range:
			selectionStep === 'start'
				? applyStartSelection(withTime, range)
				: applyEndSelection(withTime, range),
		nextSelectionStep: selectionStep === 'start' ? 'end' : 'start',
	};
}

/** Reads a calendar cell's `data-value` attribute into a DateValue. */
export function parseCalendarCellDate(element: Element): DateValue | undefined {
	const value = element.getAttribute('data-value');
	if (!value) return undefined;

	try {
		return parseDate(value);
	} catch {
		// Date-time cell values include a time segment (e.g. 2026-07-15T00:00).
		const datePart = value.split('T')[0];
		try {
			return parseDate(datePart);
		} catch {
			return undefined;
		}
	}
}

/** Formats the calendar header month/year label for one or more visible months. */
export function formatMonthYearHeading(months: DateValue[] | undefined, locale = 'en'): string {
	if (!months?.length) return '';

	const monthYear = (value: DateValue) => {
		const date = value.toDate(getLocalTimeZone());
		return `${formatShortMonth(date, locale)} ${new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(date)}`;
	};

	if (months.length === 1) {
		return monthYear(months[0]);
	}

	const start = months[0];
	const end = months[months.length - 1];
	const startDate = start.toDate(getLocalTimeZone());
	const endDate = end.toDate(getLocalTimeZone());
	const startYear = new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(startDate);
	const endYear = new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(endDate);

	if (startYear === endYear) {
		return `${formatShortMonth(startDate, locale)} - ${formatShortMonth(endDate, locale)} ${endYear}`;
	}

	return `${monthYear(start)} - ${monthYear(end)}`;
}
