import { inject, type InjectionKey, type Ref } from 'vue';

export type DateRangePickerActiveField = 'start' | 'end';

export type DateRangePickerContext = {
	activeField: Ref<DateRangePickerActiveField>;
	skipNextCellClick: Ref<boolean>;
	single: Ref<boolean>;
	showTime: Ref<boolean>;
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
