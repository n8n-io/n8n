import type { DateRangePickerRootEmits, DateRangePickerRootProps, PopoverRootEmits } from 'reka-ui';

export { default as N8nDateRangePicker } from './DateRangePicker.vue';
export {
	formatDateRangeValue,
	formatDateValue,
	formatWeekdayTwoLetters,
	isDateValueInBounds,
	parseDateValue,
} from './datePicker.utils';
export type { DatePickerFormatOptions } from './datePicker.utils';

export type N8nDateRangePickerProps = DateRangePickerRootProps & {
	/** When true, hides the date input fields and apply/clear footer */
	hideInputs?: boolean;
	/** When true, selects a single date (start and end are the same) and shows one date input */
	single?: boolean;
};
export type N8nDateRangePickerRootEmits = DateRangePickerRootEmits & PopoverRootEmits;
export type { DateRange, DateValue } from 'reka-ui';
