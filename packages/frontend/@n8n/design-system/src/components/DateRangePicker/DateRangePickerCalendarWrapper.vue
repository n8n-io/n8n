<script setup lang="ts">
import { injectDateRangePickerRootContext } from 'reka-ui';
import { inject, ref } from 'vue';

import {
	N8N_DATE_RANGE_PICKER_ACTIVE_FIELD,
	N8N_DATE_RANGE_PICKER_SKIP_NEXT_CELL_CLICK,
} from './dateRangePicker.context';
import {
	applyActiveFieldSelection,
	getNextActiveFieldAfterSelection,
	parseCalendarCellDate,
} from './datePicker.utils';

const rootContext = injectDateRangePickerRootContext();
const activeField = inject(N8N_DATE_RANGE_PICKER_ACTIVE_FIELD);
const skipNextCellClick = inject(N8N_DATE_RANGE_PICKER_SKIP_NEXT_CELL_CLICK);
const blockedCellInteraction = ref(false);

function isCalendarCellTarget(event: Event): HTMLElement | null {
	const target = (event.target as Element | null)?.closest('[data-reka-calendar-cell-trigger]');
	if (!target || target.hasAttribute('data-disabled') || target.hasAttribute('data-unavailable')) {
		return null;
	}

	return target as HTMLElement;
}

function isPlaceholderDayCell(target: HTMLElement): boolean {
	const selectedDate = parseCalendarCellDate(target);
	if (!selectedDate) return false;

	return selectedDate.compare(rootContext.placeholder.value) === 0;
}

function shouldSkipPlaceholderCellInteraction(target: HTMLElement): boolean {
	if (!skipNextCellClick?.value) return false;

	return isPlaceholderDayCell(target);
}

function blockCalendarCellEvent(event: Event) {
	event.preventDefault();
	event.stopImmediatePropagation();
}

function handleCalendarPointerDownCapture(event: PointerEvent) {
	const target = isCalendarCellTarget(event);
	if (!target || !shouldSkipPlaceholderCellInteraction(target)) return;

	skipNextCellClick.value = false;
	blockedCellInteraction.value = true;
	blockCalendarCellEvent(event);
}

function handleCalendarClickCapture(event: MouseEvent) {
	const target = isCalendarCellTarget(event);
	if (!target) return;

	if (blockedCellInteraction.value) {
		blockedCellInteraction.value = false;
		blockCalendarCellEvent(event);
		return;
	}

	if (shouldSkipPlaceholderCellInteraction(target)) {
		skipNextCellClick.value = false;
		blockCalendarCellEvent(event);
		return;
	}

	if (skipNextCellClick?.value) {
		skipNextCellClick.value = false;
	}

	const selectedDate = parseCalendarCellDate(target);
	if (!selectedDate || !activeField?.value) return;

	blockCalendarCellEvent(event);

	const rangeBefore = rootContext.modelValue.value;

	rootContext.onDateChange(applyActiveFieldSelection(activeField.value, selectedDate, rangeBefore));
	activeField.value = getNextActiveFieldAfterSelection(activeField.value, rangeBefore);
}
</script>

<template>
	<div
		@pointerdown.prevent
		@pointerdown.capture="handleCalendarPointerDownCapture"
		@click.capture="handleCalendarClickCapture"
	>
		<slot />
	</div>
</template>
