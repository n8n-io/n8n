<script setup lang="ts">
import type { DateValue } from '@internationalized/date';
import { injectDateRangePickerRootContext } from 'reka-ui';
import { computed, inject, ref, watch } from 'vue';

import N8nInput from '../N8nInput';
import {
	N8N_DATE_RANGE_PICKER_ACTIVE_FIELD,
	N8N_DATE_RANGE_PICKER_SINGLE,
} from './dateRangePicker.context';
import { formatDateValue, isDateValueInBounds, parseDateValue } from './datePicker.utils';

const rootContext = injectDateRangePickerRootContext();
const activeField = inject(N8N_DATE_RANGE_PICKER_ACTIVE_FIELD);
const single = inject(N8N_DATE_RANGE_PICKER_SINGLE);

if (!activeField) {
	throw new Error('DateRangePickerField must be used within N8nDateRangePicker');
}

watch(
	() => rootContext.modelValue.value,
	(range) => {
		if (single?.value) {
			activeField.value = 'start';
			return;
		}

		if (!range?.start && !range?.end) {
			activeField.value = 'start';
			return;
		}

		if (range.start && !range.end) {
			activeField.value = 'end';
		}
	},
	{ deep: true, immediate: true },
);

const includeTime = computed(() => {
	const granularity = rootContext.granularity.value;
	if (granularity && granularity !== 'day') return true;

	const { start, end } = rootContext.modelValue.value;
	return (start !== undefined && 'hour' in start) || (end !== undefined && 'hour' in end);
});

const formatOptions = computed(() => ({
	locale: rootContext.locale.value,
	includeTime: includeTime.value,
}));

const startText = ref('');
const endText = ref('');
const editingStart = ref(false);
const editingEnd = ref(false);

function syncStartText() {
	startText.value = formatDateValue(rootContext.modelValue.value.start, formatOptions.value);
}

function syncEndText() {
	endText.value = formatDateValue(rootContext.modelValue.value.end, formatOptions.value);
}

watch(
	() => rootContext.modelValue.value.start,
	() => {
		if (!editingStart.value) syncStartText();
	},
	{ immediate: true },
);

watch(
	() => rootContext.modelValue.value.end,
	() => {
		if (!editingEnd.value) syncEndText();
	},
	{ immediate: true },
);

watch(formatOptions, () => {
	if (!editingStart.value) syncStartText();
	if (!editingEnd.value) syncEndText();
});

function isUnavailable(date: DateValue) {
	return rootContext.isDateUnavailable?.(date) ?? false;
}

function isValidDate(date: DateValue | undefined) {
	if (!date) return false;
	if (isUnavailable(date)) return false;
	return isDateValueInBounds(date, {
		minValue: rootContext.minValue.value,
		maxValue: rootContext.maxValue.value,
	});
}

function isBeforeOrSame(start: DateValue, end: DateValue) {
	return start.compare(end) <= 0;
}

function isValidRange(start: DateValue | undefined, end: DateValue | undefined) {
	if (!start || !end) return true;
	if (!isBeforeOrSame(start, end)) return false;

	if (rootContext.isDateUnavailable) {
		let cursor = start;
		while (isBeforeOrSame(cursor, end)) {
			if (isUnavailable(cursor)) return false;
			cursor = cursor.add({ days: 1 });
		}
	}

	return true;
}

const isInvalid = computed(() => {
	const { start, end } = rootContext.modelValue.value;
	if (start && !isValidDate(start)) return true;
	if (end && !isValidDate(end)) return true;
	return !isValidRange(start, end);
});

function updateRange(start: DateValue | undefined, end: DateValue | undefined) {
	rootContext.onDateChange({ start, end });
}

function commitField(type: 'start' | 'end') {
	const currentStart = rootContext.modelValue.value.start;
	const currentEnd = rootContext.modelValue.value.end;
	const text = type === 'start' ? startText.value : endText.value;
	const parsed = parseDateValue(text, formatOptions.value);

	if (!parsed) {
		if (type === 'start') syncStartText();
		else syncEndText();
		return;
	}

	if (!isValidDate(parsed)) {
		if (type === 'start') syncStartText();
		else syncEndText();
		return;
	}

	if (single?.value) {
		updateRange(parsed.copy(), parsed.copy());
		return;
	}

	if (type === 'start') {
		const nextEnd = currentEnd && currentEnd.compare(parsed) < 0 ? undefined : currentEnd?.copy();
		if (!isValidRange(parsed, nextEnd)) {
			syncStartText();
			return;
		}
		updateRange(parsed.copy(), nextEnd?.copy());
		return;
	}

	const nextStart =
		currentStart && parsed.compare(currentStart) < 0 ? undefined : currentStart?.copy();
	if (!isValidRange(nextStart, parsed)) {
		syncEndText();
		return;
	}
	updateRange(nextStart?.copy(), parsed.copy());
}

function onStartFocus() {
	editingStart.value = true;
	activeField.value = 'start';
}

function onStartBlur() {
	editingStart.value = false;
	commitField('start');
}

function onEndFocus() {
	editingEnd.value = true;
	activeField.value = 'end';
}

function onEndBlur() {
	editingEnd.value = false;
	commitField('end');
}
</script>

<template>
	<div
		:class="[$style.DateFields, single && $style.DateFieldsSingle]"
		:data-invalid="isInvalid ? '' : undefined"
	>
		<N8nInput
			v-model="startText"
			size="small"
			:class="[$style.DateFieldInput, activeField === 'start' && $style.DateFieldInputActive]"
			:aria-label="single ? 'Date' : 'Start date'"
			@focus="onStartFocus"
			@blur="onStartBlur"
		/>
		<N8nInput
			v-if="!single"
			v-model="endText"
			size="small"
			:class="[$style.DateFieldInput, activeField === 'end' && $style.DateFieldInputActive]"
			aria-label="End date"
			@focus="onEndFocus"
			@blur="onEndBlur"
		/>
	</div>
</template>

<style lang="css" module>
.DateFields {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--2xs);
	width: 100%;
}

.DateFieldsSingle {
	grid-template-columns: minmax(0, 1fr);
}

.DateFieldInput {
	width: 100%;
	min-width: 0;
}

.DateFieldInput :global(input) {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.DateFieldInput :global(.n8n-input__wrapper:focus-within) {
	outline: none;
}

.DateFieldInputActive :global(.n8n-input__wrapper),
.DateFieldInputActive :global(.n8n-input__wrapper:focus-within),
.DateFieldInputActive :global(.n8n-input__wrapper:hover:not(:focus-within)) {
	outline: none;
	box-shadow: inset 0 0 0 2px var(--color--purple-400);
}
</style>
