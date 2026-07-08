import {
	CalendarDate,
	CalendarDateTime,
	getLocalTimeZone,
	parseDate,
	today,
	type DateValue,
} from '@internationalized/date';

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

export function isSingleDayRange(range?: { start?: DateValue; end?: DateValue } | null) {
	return !!range?.start && !!range?.end && range.start.compare(range.end) === 0;
}

export function extendRangeFromAnchor(
	anchor: DateValue,
	selected: DateValue,
): { start: DateValue; end: DateValue } {
	if (selected.compare(anchor) >= 0) {
		return { start: anchor.copy(), end: selected.copy() };
	}

	return { start: selected.copy(), end: anchor.copy() };
}

export function applyActiveFieldSelection(
	activeField: 'start' | 'end',
	selected: DateValue,
	range: { start?: DateValue; end?: DateValue },
): { start?: DateValue; end?: DateValue } {
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

export function getNextActiveFieldAfterSelection(
	activeField: 'start' | 'end',
	rangeBefore: { start?: DateValue; end?: DateValue },
): 'start' | 'end' {
	if (activeField === 'start') {
		return 'end';
	}

	return rangeBefore.end ? 'start' : 'end';
}

export function parseCalendarCellDate(element: Element): DateValue | undefined {
	const value = element.getAttribute('data-value');
	if (!value) return undefined;

	try {
		return parseDate(value);
	} catch {
		return undefined;
	}
}

export function formatWeekdayTwoLetters(day: string): string {
	return day.slice(0, 2);
}

export function formatMonthThreeLetters(date: Date, locale = 'en'): string {
	return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date).slice(0, 3);
}

export function formatMonthYearHeading(months: DateValue[] | undefined, locale = 'en'): string {
	if (!months?.length) return '';

	const monthYear = (value: DateValue) => {
		const date = value.toDate(getLocalTimeZone());
		return `${formatMonthThreeLetters(date, locale)} ${new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(date)}`;
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
		return `${formatMonthThreeLetters(startDate, locale)} - ${formatMonthThreeLetters(endDate, locale)} ${endYear}`;
	}

	return `${monthYear(start)} - ${monthYear(end)}`;
}
