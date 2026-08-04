import type { DateRangePickerRootEmits, DateRangePickerRootProps, PopoverRootEmits } from 'reka-ui';

import type { N8nDateRangePickerPreset } from './DateRangePickerPresets.vue';

export { default as N8nDateRangePicker } from './DateRangePicker.vue';
export { default as N8nDateRangePickerPresets } from './DateRangePickerPresets.vue';
export type { N8nDateRangePickerPreset } from './DateRangePickerPresets.vue';
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
	/** Hides the Today button in the calendar header. */
	hideToday?: boolean;
	single?: boolean;
	showTime?: boolean;
	/** 24-hour (`24`, default) or 12-hour with AM/PM (`12`) time fields when `showTime` is enabled. */
	hourCycle?: 12 | 24;
	/** Preset options rendered in the sidebar. Prefer this over the `presets` slot when possible. */
	presets?: N8nDateRangePickerPreset[];
};
export type N8nDateRangePickerRootEmits = DateRangePickerRootEmits &
	PopoverRootEmits & {
		select: [value: string | number];
	};
export type { DateRange, DateValue } from 'reka-ui';
export type { DatePickerHourCycle } from './datePicker.utils';
