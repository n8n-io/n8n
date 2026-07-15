<script setup lang="ts">
import { injectDateRangePickerRootContext } from 'reka-ui';
import { nextTick } from 'vue';

import N8nButton from '../N8nButton';
import { useDateRangePickerContext } from './dateRangePicker.context';
import { getTodayDateValue, isDateSelectable, mergeDatePreservingTime } from './datePicker.utils';

const rootContext = injectDateRangePickerRootContext();
const { activeField, showTime } = useDateRangePickerContext();

function goToToday() {
	const todayDate = getTodayDateValue({
		granularity: rootContext.granularity.value,
	});

	rootContext.onPlaceholderChange(todayDate.copy());

	if (
		!isDateSelectable(todayDate, {
			minValue: rootContext.minValue.value,
			maxValue: rootContext.maxValue.value,
			isDateUnavailable: rootContext.isDateUnavailable,
		})
	) {
		return;
	}

	const { start: previousStart, end: previousEnd } = rootContext.modelValue.value;
	const nextStart = showTime.value
		? mergeDatePreservingTime(todayDate, previousStart)
		: todayDate.copy();
	const nextEnd = showTime.value
		? mergeDatePreservingTime(todayDate, previousEnd ?? previousStart)
		: todayDate.copy();

	rootContext.onDateChange({ start: nextStart, end: nextEnd });
	// Complete range — next calendar click starts a new start → end cycle.
	activeField.value = 'start';

	void nextTick(() => {
		rootContext.onPlaceholderChange(todayDate.copy());
	});
}
</script>

<template>
	<N8nButton variant="ghost" size="small" label="Today" @click="goToToday" />
</template>
