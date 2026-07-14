<script setup lang="ts">
import type { DateValue } from '@internationalized/date';
import { injectDateRangePickerRootContext } from 'reka-ui';
import { ref } from 'vue';

import { useDateRangePickerContext } from './dateRangePicker.context';
import { parseCalendarCellDate, resolveDateSelection } from './datePicker.utils';

const rootContext = injectDateRangePickerRootContext();
const { activeField, skipNextCellClick, single, showTime } = useDateRangePickerContext();
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
	if (!skipNextCellClick.value) return false;

	return isPlaceholderDayCell(target);
}

function blockCalendarCellEvent(event: Event) {
	event.preventDefault();
	event.stopImmediatePropagation();
}

function applySelection(selectedDate: DateValue) {
	const selection = resolveDateSelection({
		selected: selectedDate,
		range: rootContext.modelValue.value,
		activeField: activeField.value,
		single: single.value,
		preserveTime: showTime.value,
	});

	rootContext.onDateChange(selection.range);
	activeField.value = selection.nextActiveField;
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

	if (skipNextCellClick.value) {
		skipNextCellClick.value = false;
	}

	const selectedDate = parseCalendarCellDate(target);
	if (!selectedDate) return;

	blockCalendarCellEvent(event);
	applySelection(selectedDate);
}

function handleCalendarKeydownCapture(event: KeyboardEvent) {
	if (event.key !== 'Enter' && event.key !== ' ') return;

	const target = isCalendarCellTarget(event);
	if (!target) return;

	if (shouldSkipPlaceholderCellInteraction(target)) {
		skipNextCellClick.value = false;
		blockCalendarCellEvent(event);
		return;
	}

	if (skipNextCellClick.value) {
		skipNextCellClick.value = false;
	}

	const selectedDate = parseCalendarCellDate(target);
	if (!selectedDate) return;

	blockCalendarCellEvent(event);
	applySelection(selectedDate);
}
</script>

<template>
	<div
		@pointerdown.prevent
		@pointerdown.capture="handleCalendarPointerDownCapture"
		@click.capture="handleCalendarClickCapture"
		@keydown.capture="handleCalendarKeydownCapture"
	>
		<slot />
	</div>
</template>
