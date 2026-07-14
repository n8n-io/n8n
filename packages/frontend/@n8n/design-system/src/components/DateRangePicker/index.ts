import type { DateRangePickerRootEmits, DateRangePickerRootProps, PopoverRootEmits } from 'reka-ui';

export { default as N8nDateRangePicker } from './DateRangePicker.vue';
export {
	formatDateRangeValue,
	formatDateValue,
	formatTimeValue,
	formatWeekdayTwoLetters,
	isDateValueInBounds,
	parseDateValue,
	parseTimeValue,
} from './datePicker.utils';
export type { DatePickerFormatOptions } from './datePicker.utils';

export type N8nDateRangePickerProps = DateRangePickerRootProps & {
	hideInputs?: boolean;
	single?: boolean;
	showTime?: boolean;
};
export type N8nDateRangePickerRootEmits = DateRangePickerRootEmits & PopoverRootEmits;
export type { DateRange, DateValue } from 'reka-ui';
