<script setup lang="ts">
import type { DateValue } from '@internationalized/date';
import { injectDateRangePickerRootContext } from 'reka-ui';
import { computed, ref, watch } from 'vue';

import N8nInput from '../N8nInput';
import { useDateRangePickerContext } from './dateRangePicker.context';
import {
	formatDateValue,
	formatTimeValue,
	isDateValueInBounds,
	parseDateValue,
	parseTimeValue,
	toDateTimeValue,
} from './datePicker.utils';

const rootContext = injectDateRangePickerRootContext();
const { activeField, single, showTime } = useDateRangePickerContext();

watch(
	() => rootContext.modelValue.value,
	(range) => {
		if (single.value) {
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

const includeTimeInDateField = computed(() => {
	if (showTime.value) return false;

	const granularity = rootContext.granularity.value;
	if (granularity && granularity !== 'day') return true;

	const { start, end } = rootContext.modelValue.value;
	return (start !== undefined && 'hour' in start) || (end !== undefined && 'hour' in end);
});

const formatOptions = computed(() => ({
	locale: rootContext.locale.value,
	includeTime: includeTimeInDateField.value,
}));

const startText = ref('');
const endText = ref('');
const startTimeText = ref('');
const endTimeText = ref('');
const editingStart = ref(false);
const editingEnd = ref(false);
const editingStartTime = ref(false);
const editingEndTime = ref(false);

function syncStartText() {
	startText.value = formatDateValue(rootContext.modelValue.value.start, formatOptions.value);
}

function syncEndText() {
	endText.value = formatDateValue(rootContext.modelValue.value.end, formatOptions.value);
}

function syncStartTimeText() {
	startTimeText.value = formatTimeValue(rootContext.modelValue.value.start);
}

function syncEndTimeText() {
	endTimeText.value = formatTimeValue(rootContext.modelValue.value.end);
}

watch(
	() => rootContext.modelValue.value.start,
	() => {
		if (!editingStart.value) syncStartText();
		if (!editingStartTime.value) syncStartTimeText();
	},
	{ immediate: true },
);

watch(
	() => rootContext.modelValue.value.end,
	() => {
		if (!editingEnd.value) syncEndText();
		if (!editingEndTime.value) syncEndTimeText();
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

function withExistingTime(parsed: DateValue, existing: DateValue | undefined): DateValue {
	if (!showTime.value) return parsed;

	return toDateTimeValue(parsed, {
		hour: existing && 'hour' in existing ? existing.hour : 0,
		minute: existing && 'minute' in existing ? existing.minute : 0,
		second: existing && 'second' in existing ? existing.second : 0,
	});
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

	const nextValue = withExistingTime(parsed, type === 'start' ? currentStart : currentEnd);

	if (!isValidDate(nextValue)) {
		if (type === 'start') syncStartText();
		else syncEndText();
		return;
	}

	if (single.value) {
		updateRange(nextValue.copy(), nextValue.copy());
		return;
	}

	if (type === 'start') {
		const nextEnd =
			currentEnd && currentEnd.compare(nextValue) < 0 ? undefined : currentEnd?.copy();
		if (!isValidRange(nextValue, nextEnd)) {
			syncStartText();
			return;
		}
		updateRange(nextValue.copy(), nextEnd?.copy());
		return;
	}

	const nextStart =
		currentStart && nextValue.compare(currentStart) < 0 ? undefined : currentStart?.copy();
	if (!isValidRange(nextStart, nextValue)) {
		syncEndText();
		return;
	}
	updateRange(nextStart?.copy(), nextValue.copy());
}

function commitTimeField(type: 'start' | 'end') {
	const currentStart = rootContext.modelValue.value.start;
	const currentEnd = rootContext.modelValue.value.end;
	const current = type === 'start' ? currentStart : currentEnd;
	const text = type === 'start' ? startTimeText.value : endTimeText.value;
	const parsedTime = parseTimeValue(text);

	if (!current || !parsedTime) {
		if (type === 'start') syncStartTimeText();
		else syncEndTimeText();
		return;
	}

	const nextValue = toDateTimeValue(current, parsedTime);

	if (!isValidDate(nextValue)) {
		if (type === 'start') syncStartTimeText();
		else syncEndTimeText();
		return;
	}

	if (single.value) {
		updateRange(nextValue.copy(), nextValue.copy());
		return;
	}

	if (type === 'start') {
		if (!isValidRange(nextValue, currentEnd)) {
			syncStartTimeText();
			return;
		}
		updateRange(nextValue.copy(), currentEnd?.copy());
		return;
	}

	if (!isValidRange(currentStart, nextValue)) {
		syncEndTimeText();
		return;
	}
	updateRange(currentStart?.copy(), nextValue.copy());
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

function onStartTimeFocus() {
	editingStartTime.value = true;
	activeField.value = 'start';
}

function onStartTimeBlur() {
	editingStartTime.value = false;
	commitTimeField('start');
}

function onEndTimeFocus() {
	editingEndTime.value = true;
	activeField.value = 'end';
}

function onEndTimeBlur() {
	editingEndTime.value = false;
	commitTimeField('end');
}
</script>

<template>
	<div
		:class="[$style.DateFields, single && $style.DateFieldsSingle]"
		:data-invalid="isInvalid ? '' : undefined"
	>
		<div :class="$style.DateFieldGroup">
			<N8nInput
				v-model="startText"
				size="small"
				:class="[$style.DateFieldInput, activeField === 'start' && $style.DateFieldInputActive]"
				:aria-label="single ? 'Date' : 'Start date'"
				@focus="onStartFocus"
				@blur="onStartBlur"
			/>
			<input
				v-if="showTime"
				v-model="startTimeText"
				type="time"
				:class="[$style.TimeFieldInput, activeField === 'start' && $style.DateFieldInputActive]"
				:aria-label="single ? 'Time' : 'Start time'"
				@focus="onStartTimeFocus"
				@blur="onStartTimeBlur"
			/>
		</div>
		<div v-if="!single" :class="$style.DateFieldGroup">
			<N8nInput
				v-model="endText"
				size="small"
				:class="[$style.DateFieldInput, activeField === 'end' && $style.DateFieldInputActive]"
				aria-label="End date"
				@focus="onEndFocus"
				@blur="onEndBlur"
			/>
			<input
				v-if="showTime"
				v-model="endTimeText"
				type="time"
				:class="[$style.TimeFieldInput, activeField === 'end' && $style.DateFieldInputActive]"
				aria-label="End time"
				@focus="onEndTimeFocus"
				@blur="onEndTimeBlur"
			/>
		</div>
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

.DateFieldGroup {
	display: flex;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.DateFieldInput {
	width: 100%;
	min-width: 0;
	flex: 1;
}

.TimeFieldInput {
	box-sizing: border-box;
	width: 5.5rem;
	flex-shrink: 0;
	height: var(--spacing--xl);
	padding: 0 var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--2xs);
	background: var(--background--surface);
	color: var(--text-color);
	font-size: var(--font-size--xs);
	font-family: inherit;
	outline: none;
}

.TimeFieldInput:hover {
	border-color: var(--border-color--strong);
}

.TimeFieldInput:focus {
	border-color: var(--focus--border-color);
	box-shadow: 0 0 0 var(--focus--border-width) var(--focus--outline-color);
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
.DateFieldInputActive :global(.n8n-input__wrapper:hover:not(:focus-within)),
.TimeFieldInput.DateFieldInputActive {
	outline: none;
	box-shadow: inset 0 0 0 2px var(--color--purple-400);
}

.TimeFieldInput.DateFieldInputActive {
	border-color: var(--color--purple-400);
}
</style>
