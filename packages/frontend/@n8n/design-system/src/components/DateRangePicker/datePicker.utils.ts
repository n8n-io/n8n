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

function hasTimeComponent(value: DateValue | undefined): value is CalendarDateTime {
	return value !== undefined && 'hour' in value;
}

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

function formatTimeParts(date: Date, locale: string, hourCycle: DatePickerHourCycle = 24): string {
	return new Intl.DateTimeFormat(locale, {
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: hourCycle === 12 ? 'h12' : 'h23',
	}).format(date);
}

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

function applyActiveFieldSelection(
	activeField: 'start' | 'end',
	selected: DateValue,
	range: DateRange,
): DateRange {
	if (activeField === 'start') {
		const start = selected.copy();
		const end = range.end?.copy();

		if (end && start.compare(end) > 0) {
			return { start: end.copy(), end: start.copy() };
		}

		return { start, end };
	}

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

export function isDateValueInBounds(
	value: DateValue,
	{ minValue, maxValue }: DatePickerBoundsOptions,
): boolean {
	if (minValue && value.compare(minValue) < 0) return false;
	if (maxValue && maxValue.compare(value) < 0) return false;
	return true;
}

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

export function isDateSelectable(
	date: DateValue,
	{ minValue, maxValue, isDateUnavailable }: DatePickerSelectionOptions = {},
): boolean {
	if (isDateUnavailable?.(date)) return false;
	return isDateValueInBounds(date, { minValue, maxValue });
}

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

export function isEmptyDateRange(range?: { start?: DateValue; end?: DateValue } | null) {
	return !range?.start && !range?.end;
}

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

export function toDateTimeValue(
	value: DateValue,
	time: { hour?: number; minute?: number; second?: number } = {},
): CalendarDateTime {
	return new CalendarDateTime(
		value.year,
		value.month,
		value.day,
		time.hour ?? (hasTimeComponent(value) ? value.hour : 0),
		time.minute ?? (hasTimeComponent(value) ? value.minute : 0),
		time.second ?? (hasTimeComponent(value) ? value.second : 0),
	);
}

export function mergeDatePreservingTime(selected: DateValue, existing?: DateValue): DateValue {
	if (!hasTimeComponent(existing) && !hasTimeComponent(selected)) {
		return selected.copy();
	}

	return toDateTimeValue(selected, {
		hour: hasTimeComponent(existing) ? existing.hour : 0,
		minute: hasTimeComponent(existing) ? existing.minute : 0,
		second: hasTimeComponent(existing) ? existing.second : 0,
	});
}

export function resolveDateSelection(options: {
	selected: DateValue;
	range: DateRange;
	activeField: 'start' | 'end';
	single?: boolean;
	preserveTime?: boolean;
}): { range: DateRange; nextActiveField: 'start' | 'end' } {
	const { selected, range, activeField, single = false, preserveTime = false } = options;

	if (single) {
		const singleDate = preserveTime ? mergeDatePreservingTime(selected, range.start) : selected;
		return {
			range: {
				start: singleDate.copy(),
				end: singleDate.copy(),
			},
			nextActiveField: 'start',
		};
	}

	const withTime = preserveTime
		? mergeDatePreservingTime(selected, activeField === 'end' ? range.end : range.start)
		: selected;

	return {
		range: applyActiveFieldSelection(activeField, withTime, range),
		nextActiveField: activeField === 'start' ? 'end' : 'start',
	};
}

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
