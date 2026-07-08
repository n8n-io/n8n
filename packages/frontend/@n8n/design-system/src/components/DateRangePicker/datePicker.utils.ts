import { getLocalTimeZone, type DateValue } from '@internationalized/date';

export type DatePickerFormatOptions = {
	includeTime?: boolean;
	locale?: string;
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
