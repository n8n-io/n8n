import type { DateRangePickerRootEmits, DateRangePickerRootProps, PopoverRootEmits } from 'reka-ui';

export { default as N8nDateRangePicker } from './DateRangePicker.vue';

/**
 * Spelled out rather than aliased from reka-ui: it declares `WeekDayFormat` in an
 * internal module it does not re-export, so the published declarations cannot
 * name it (TS2883). An alias still resolves back to that declaration, so the
 * union has to be restated here.
 */
export type N8nWeekdayFormat = 'narrow' | 'short' | 'long';

/** Fails to compile if reka-ui's accepted values drift from the union above. */
type AssertWeekdayFormatMatchesRekaUi = NonNullable<
	DateRangePickerRootProps['weekdayFormat']
> extends N8nWeekdayFormat
	? N8nWeekdayFormat extends NonNullable<DateRangePickerRootProps['weekdayFormat']>
		? true
		: never
	: never;
const _assertWeekdayFormat: AssertWeekdayFormatMatchesRekaUi = true;
void _assertWeekdayFormat;

export type N8nDateRangePickerProps = Omit<DateRangePickerRootProps, 'weekdayFormat'> & {
	weekdayFormat?: N8nWeekdayFormat;
	/** When true, hides the date input fields and apply button at the bottom of the picker */
	hideInputs?: boolean;
};
export type N8nDateRangePickerRootEmits = DateRangePickerRootEmits & PopoverRootEmits;
export type { DateRange, DateValue } from 'reka-ui';
