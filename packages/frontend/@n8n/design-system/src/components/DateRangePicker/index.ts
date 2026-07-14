import type { DateRangePickerRootEmits, DateRangePickerRootProps, PopoverRootEmits } from 'reka-ui';

export { default as N8nDateRangePicker } from './DateRangePicker.vue';
export {
	formatDateRangeValue,
	formatDateValue,
	formatTimeValue,
	parseDateValue,
	parseTimeValue,
} from './datePicker.utils';
export type { DatePickerFormatOptions } from './datePicker.utils';

export type N8nDateRangePickerProps = DateRangePickerRootProps & {
	hideInputs?: boolean;
	single?: boolean;
	showTime?: boolean;
	/** 24-hour (`24`, default) or 12-hour with AM/PM (`12`) time fields when `showTime` is enabled. */
	hourCycle?: 12 | 24;
};
export type N8nDateRangePickerRootEmits = DateRangePickerRootEmits & PopoverRootEmits;
export type { DateRange, DateValue } from 'reka-ui';
export type { DatePickerHourCycle } from './datePicker.utils';
