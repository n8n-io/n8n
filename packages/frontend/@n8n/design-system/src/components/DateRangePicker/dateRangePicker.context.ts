import type { InjectionKey, Ref } from 'vue';

export type DateRangePickerActiveField = 'start' | 'end';

export const N8N_DATE_RANGE_PICKER_ACTIVE_FIELD: InjectionKey<Ref<DateRangePickerActiveField>> =
	Symbol('N8nDateRangePickerActiveField');

export const N8N_DATE_RANGE_PICKER_SKIP_NEXT_CELL_CLICK: InjectionKey<Ref<boolean>> = Symbol(
	'N8nDateRangePickerSkipNextCellClick',
);
