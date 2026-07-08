<script setup lang="ts">
import { injectDateRangePickerRootContext } from 'reka-ui';
import { watch } from 'vue';

import { createTodayRange, isEmptyDateRange } from './datePicker.utils';

const rootContext = injectDateRangePickerRootContext();

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
			end: undefined,
		});
		rootContext.onPlaceholderChange(todayRange.start.copy());
	},
);
</script>

<template></template>
