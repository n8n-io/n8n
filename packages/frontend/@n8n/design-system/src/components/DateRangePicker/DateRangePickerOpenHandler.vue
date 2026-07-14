<script setup lang="ts">
import { injectDateRangePickerRootContext } from 'reka-ui';
import { inject, watch } from 'vue';

import {
	N8N_DATE_RANGE_PICKER_ACTIVE_FIELD,
	N8N_DATE_RANGE_PICKER_SINGLE,
} from './dateRangePicker.context';
import { createTodayRange, isEmptyDateRange } from './datePicker.utils';

const rootContext = injectDateRangePickerRootContext();
const activeField = inject(N8N_DATE_RANGE_PICKER_ACTIVE_FIELD);
const single = inject(N8N_DATE_RANGE_PICKER_SINGLE);

watch(
	() => rootContext.open.value,
	(isOpen) => {
		if (!isOpen) return;

		if (!isEmptyDateRange(rootContext.modelValue.value)) return;

		const todayRange = createTodayRange({
			granularity: rootContext.granularity.value,
			referenceStart: rootContext.modelValue.value.start,
			minValue: rootContext.minValue.value,
			maxValue: rootContext.maxValue.value,
			isDateUnavailable: rootContext.isDateUnavailable,
		});

		if (!todayRange) return;

		rootContext.onDateChange({
			start: todayRange.start.copy(),
			end: todayRange.end.copy(),
		});
		rootContext.onPlaceholderChange(todayRange.start.copy());

		if (activeField) {
			activeField.value = single?.value ? 'start' : 'end';
		}
	},
);
</script>

<template></template>
