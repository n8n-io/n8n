<script setup lang="ts">
import type { DateValue } from '@internationalized/date';
import { injectRangeCalendarRootContext } from 'reka-ui';

const props = defineProps<{
	day: DateValue;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	select: [];
}>();

const calendar = injectRangeCalendarRootContext();

/** Drive Reka's hover range preview — CellTrigger can't receive pointer events. */
function onMouseEnter() {
	if (props.disabled) return;
	calendar.focusedValue.value = props.day.copy();
}
</script>

<template>
	<button
		type="button"
		tabindex="-1"
		:disabled="disabled"
		:data-n8n-calendar-day="day.toString()"
		:aria-label="day.toString()"
		@click="emit('select')"
		@mouseenter="onMouseEnter"
	/>
</template>
