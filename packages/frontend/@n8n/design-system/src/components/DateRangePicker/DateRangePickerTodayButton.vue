<script setup lang="ts">
import { injectDateRangePickerRootContext } from 'reka-ui';

import N8nButton from '../N8nButton';
import { getTodayDateValue, isDateSelectable } from './datePicker.utils';

const rootContext = injectDateRangePickerRootContext();

function goToToday() {
	const todayDate = getTodayDateValue({
		granularity: rootContext.granularity.value,
		referenceStart: rootContext.modelValue.value.start,
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

	const currentEnd = rootContext.modelValue.value.end;
	const nextEnd = currentEnd && currentEnd.compare(todayDate) < 0 ? undefined : currentEnd?.copy();

	rootContext.onDateChange({
		start: todayDate.copy(),
		end: nextEnd?.copy(),
	});
}
</script>

<template>
	<N8nButton variant="ghost" size="small" label="Today" @click="goToToday" />
</template>
