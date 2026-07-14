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
};

export type DatePickerBoundsOptions = {
	minValue?: DateValue;
	maxValue?: DateValue;
};

export type DatePickerSelectionOptions = DatePickerBoundsOptions & {
	granularity?: string;
	referenceStart?: DateValue;
	isDateUnavailable?: (date: DateValue) => boolean;
};

function getDateFormatOptions(includeTime: boolean): Intl.DateTimeFormatOptions {
	if (includeTime) {
		return {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		};
	}

	return {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	};
}

function hasTimeComponent(value: DateValue | undefined): value is CalendarDateTime {
	return value !== undefined && 'hour' in value;
}

function formatShortMonth(date: Date, locale: string): string {
	return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date).slice(0, 3);
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

	return new Intl.DateTimeFormat(locale, getDateFormatOptions(options.includeTime ?? false)).format(
		date,
	);
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
		const startFormatted = new Intl.DateTimeFormat(locale, {
			day: 'numeric',
			month: 'short',
		}).format(startDate);

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
		// Fall through to locale-aware parsing below.
	}

	const timestamp = Date.parse(trimmed);
	if (Number.isNaN(timestamp)) return undefined;

	const date = new Date(timestamp);
	if (options.includeTime) {
		return new CalendarDateTime(
			date.getFullYear(),
			date.getMonth() + 1,
			date.getDate(),
			date.getHours(),
			date.getMinutes(),
			date.getSeconds(),
		);
	}

	return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
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

export function formatTimeValue(value: DateValue | undefined): string {
	if (!hasTimeComponent(value)) return '';

	return `${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`;
}

export function parseTimeValue(input: string): { hour: number; minute: number } | undefined {
	const trimmed = input.trim();
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
