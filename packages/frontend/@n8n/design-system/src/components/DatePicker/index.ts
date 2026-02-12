import type { DatePickerRootEmits, DatePickerRootProps, PopoverRootEmits } from 'reka-ui';

export { default as N8nDatePicker } from './DatePicker.vue';

export type N8nDatePickerProps = DatePickerRootProps & {
	/** When true, hides the date input fields */
	hideInputs?: boolean;
};

export type N8nDatePickerRootEmits = DatePickerRootEmits & PopoverRootEmits;

export type { DateValue } from 'reka-ui';
