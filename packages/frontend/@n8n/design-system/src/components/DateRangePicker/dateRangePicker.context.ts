import { inject, type InjectionKey, type Ref, type ShallowRef } from 'vue';
import type { injectDateRangePickerRootContext } from 'reka-ui';

export type DateRangePickerActiveField = 'start' | 'end';

export type DateRangePickerRekaRoot = ReturnType<typeof injectDateRangePickerRootContext>;

export type DateRangePickerContext = {
	activeField: Ref<DateRangePickerActiveField>;
	single: Ref<boolean>;
	showTime: Ref<boolean>;
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
