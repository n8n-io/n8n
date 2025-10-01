import { DateRangePickerTrigger } from 'reka-ui';
import type { DateRangePickerRootEmits, DateRangePickerRootProps, PopoverRootEmits } from 'reka-ui';

// import DateRangePicker from './DateRangePicker.vue';

import {
	default as DateRangePicker,
	// type N8nDateRangePickerProps,
	// type N8nDateRangePickerRootEmits,
	// type DateRange,
	// type DateValue,
} from './DateRangePicker.vue';

export {
	DateRangePicker as N8nDateRangePicker,
	DateRangePickerTrigger as N8nDateRangePickerTrigger,
};
// export type { N8nDateRangePickerProps, N8nDateRangePickerRootEmits, DateRange, DateValue };
export type N8nDateRangePickerProps = DateRangePickerRootProps & { hideInputs?: boolean };
export type N8nDateRangePickerRootEmits = DateRangePickerRootEmits & PopoverRootEmits;
export type { DateRange, DateValue } from 'reka-ui';
