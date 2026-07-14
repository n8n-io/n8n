<script setup lang="ts">
import { injectDateRangePickerRootContext } from 'reka-ui';
import { nextTick } from 'vue';

import N8nButton from '../N8nButton';
import { useDateRangePickerContext } from './dateRangePicker.context';
import { getTodayDateValue, isDateSelectable, resolveDateSelection } from './datePicker.utils';

const rootContext = injectDateRangePickerRootContext();
const { activeField, single, showTime } = useDateRangePickerContext();

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

	const selection = resolveDateSelection({
		selected: todayDate,
		range: rootContext.modelValue.value,
		activeField: activeField.value,
		single: single.value,
		preserveTime: showTime.value,
	});

	rootContext.onDateChange(selection.range);
	activeField.value = selection.nextActiveField;
	// reka's modelValue watcher (flush: pre) resets placeholder → start; restore after it runs.
	void nextTick(() => {
		rootContext.onPlaceholderChange(todayDate.copy());
	});
}
</script>

<template>
	<N8nButton variant="ghost" size="small" label="Today" @click="goToToday" />
</template>
