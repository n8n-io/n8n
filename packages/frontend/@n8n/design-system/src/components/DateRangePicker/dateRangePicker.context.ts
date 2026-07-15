import { inject, type InjectionKey, type Ref, type ShallowRef } from 'vue';
import type { injectDateRangePickerRootContext } from 'reka-ui';

import type { DatePickerHourCycle } from './datePicker.utils';

export type DateRangePickerRekaRoot = ReturnType<typeof injectDateRangePickerRootContext>;

export type DateRangePickerContext = {
	single: Ref<boolean>;
	showTime: Ref<boolean>;
	hourCycle: Ref<DatePickerHourCycle>;
	/** Set under DateRangePickerRoot so the parent can call reka APIs. */
	rekaRoot: ShallowRef<DateRangePickerRekaRoot | null>;
};

export const N8N_DATE_RANGE_PICKER_CONTEXT: InjectionKey<DateRangePickerContext> = Symbol(
	'N8nDateRangePickerContext',
);

export function useDateRangePickerContext(): DateRangePickerContext {
	const context = inject(N8N_DATE_RANGE_PICKER_CONTEXT);

	if (!context) {
		throw new Error('DateRangePicker components must be used within N8nDateRangePicker');
	}

	return context;
}
