<script setup lang="ts">
import { injectDateRangePickerRootContext } from 'reka-ui';
import { watch } from 'vue';

import { useDateRangePickerContext } from './dateRangePicker.context';
import { createTodayRange, isEmptyDateRange } from './datePicker.utils';

const rootContext = injectDateRangePickerRootContext();
const { activeField, single } = useDateRangePickerContext();

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
		activeField.value = single.value ? 'start' : 'end';
	},
);
</script>

<template></template>
