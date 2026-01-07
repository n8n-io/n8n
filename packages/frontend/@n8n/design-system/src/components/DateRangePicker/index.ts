import type { DateRangePickerRootEmits, DateRangePickerRootProps, PopoverRootEmits } from 'reka-ui';

export { default as N8nDateRangePicker } from './DateRangePicker.vue';

export type N8nDateRangePickerProps = DateRangePickerRootProps & {
	/** When true, hides the date input fields and apply button at the bottom of the picker */
	hideInputs?: boolean;
};
export type N8nDateRangePickerRootEmits = DateRangePickerRootEmits & PopoverRootEmits;
export type { DateRange, DateValue } from 'reka-ui';
