<script setup lang="ts">
import type { DateValue } from '@internationalized/date';
import { injectDateRangePickerRootContext } from 'reka-ui';
import { computed, ref, watch } from 'vue';

import N8nInput from '../N8nInput';
import { useDateRangePickerContext } from './dateRangePicker.context';
import {
	formatDateValue,
	formatTimeValue,
	isDateRangeValid,
	isDateSelectable,
	mergeDatePreservingTime,
	parseDateValue,
	parseTimeValue,
	toDateTimeValue,
	type DatePickerFormatOptions,
} from './datePicker.utils';

const props = defineProps<{
	type: 'start' | 'end';
	dateLabel: string;
	timeLabel: string;
}>();

const emit = defineEmits<{
	'update:error': [message: string | null];
}>();

const rootContext = injectDateRangePickerRootContext();
const { activeField, single, showTime, hourCycle } = useDateRangePickerContext();

const INVALID_DATE_MESSAGE = 'Invalid date';
const OUTSIDE_RANGE_MESSAGE = 'Outside of allowed range';

const formatOptions = computed<DatePickerFormatOptions>(() => {
	let includeTime = false;

	if (!showTime.value) {
		const granularity = rootContext.granularity.value;
		if (granularity && granularity !== 'day') {
			includeTime = true;
		} else {
			const { start, end } = rootContext.modelValue.value;
			includeTime =
				(start !== undefined && 'hour' in start) || (end !== undefined && 'hour' in end);
		}
	}

	return {
		locale: rootContext.locale.value,
		includeTime,
		hourCycle: hourCycle.value,
	};
});

const selectionOptions = computed(() => ({
	minValue: rootContext.minValue.value,
	maxValue: rootContext.maxValue.value,
	isDateUnavailable: rootContext.isDateUnavailable,
}));

const dateText = ref('');
const timeText = ref('');
const editingDate = ref(false);
const editingTime = ref(false);
const inputError = ref<string | null>(null);

const fieldValue = computed(() =>
	props.type === 'start' ? rootContext.modelValue.value.start : rootContext.modelValue.value.end,
);

function setError(message: string | null) {
	inputError.value = message;
	emit('update:error', message);
}

function syncDateText() {
	dateText.value = formatDateValue(fieldValue.value, formatOptions.value);
	setError(null);
}

function syncTimeText() {
	timeText.value = formatTimeValue(fieldValue.value, hourCycle.value);
	setError(null);
}

watch(
	fieldValue,
	() => {
		if (!editingDate.value) syncDateText();
		if (!editingTime.value) syncTimeText();
	},
	{ immediate: true },
);

watch(formatOptions, () => {
	if (!editingDate.value) syncDateText();
});

watch(hourCycle, () => {
	if (!editingTime.value) syncTimeText();
});

function updateRange(start: DateValue | undefined, end: DateValue | undefined) {
	rootContext.onDateChange({ start, end });
}

function commitDate() {
	const currentStart = rootContext.modelValue.value.start;
	const currentEnd = rootContext.modelValue.value.end;
	const trimmed = dateText.value.trim();

	if (!trimmed) {
		setError(null);
		syncDateText();
		return;
	}

	const parsed = parseDateValue(trimmed, formatOptions.value);
	if (!parsed) {
		setError(INVALID_DATE_MESSAGE);
		return;
	}

	const nextValue = showTime.value ? mergeDatePreservingTime(parsed, fieldValue.value) : parsed;

	if (!isDateSelectable(nextValue, selectionOptions.value)) {
		setError(OUTSIDE_RANGE_MESSAGE);
		return;
	}

	if (single.value) {
		setError(null);
		updateRange(nextValue.copy(), nextValue.copy());
		return;
	}

	if (props.type === 'start') {
		const nextEnd =
			currentEnd && currentEnd.compare(nextValue) < 0 ? undefined : currentEnd?.copy();
		if (!isDateRangeValid(nextValue, nextEnd, selectionOptions.value)) {
			setError(INVALID_DATE_MESSAGE);
			return;
		}
		setError(null);
		updateRange(nextValue.copy(), nextEnd?.copy());
		return;
	}

	const nextStart =
		currentStart && nextValue.compare(currentStart) < 0 ? undefined : currentStart?.copy();
	if (!isDateRangeValid(nextStart, nextValue, selectionOptions.value)) {
		setError(INVALID_DATE_MESSAGE);
		return;
	}
	setError(null);
	updateRange(nextStart?.copy(), nextValue.copy());
}

function commitTime() {
	const currentStart = rootContext.modelValue.value.start;
	const currentEnd = rootContext.modelValue.value.end;
	const current = fieldValue.value;
	const trimmed = timeText.value.trim();

	if (!current || !trimmed) {
		setError(null);
		syncTimeText();
		return;
	}

	const parsedTime = parseTimeValue(trimmed, hourCycle.value);
	if (!parsedTime) {
		setError(INVALID_DATE_MESSAGE);
		return;
	}

	const nextValue = toDateTimeValue(current, parsedTime);

	if (!isDateSelectable(nextValue, selectionOptions.value)) {
		setError(OUTSIDE_RANGE_MESSAGE);
		return;
	}

	if (single.value) {
		setError(null);
		updateRange(nextValue.copy(), nextValue.copy());
		return;
	}

	if (props.type === 'start') {
		if (!isDateRangeValid(nextValue, currentEnd, selectionOptions.value)) {
			setError(INVALID_DATE_MESSAGE);
			return;
		}
		setError(null);
		updateRange(nextValue.copy(), currentEnd?.copy());
		return;
	}

	if (!isDateRangeValid(currentStart, nextValue, selectionOptions.value)) {
		setError(INVALID_DATE_MESSAGE);
		return;
	}
	setError(null);
	updateRange(currentStart?.copy(), nextValue.copy());
}

function onDateFocus() {
	editingDate.value = true;
	activeField.value = props.type;
}

function onDateBlur() {
	editingDate.value = false;
	commitDate();
}

function onTimeFocus() {
	editingTime.value = true;
	activeField.value = props.type;
}

function onTimeBlur() {
	editingTime.value = false;
	commitTime();
}
</script>

<template>
	<div
		:class="[
			$style.DateFieldGroup,
			showTime && $style.DateFieldGroupJoined,
			activeField === type && $style.DateFieldGroupActive,
			inputError && $style.DateFieldGroupInvalid,
		]"
	>
		<N8nInput
			v-model="dateText"
			size="small"
			:class="$style.DateFieldInput"
			:aria-label="dateLabel"
			:aria-invalid="inputError ? true : undefined"
			@focus="onDateFocus"
			@blur="onDateBlur"
		/>
		<input
			v-if="showTime"
			v-model="timeText"
			:type="hourCycle === 12 ? 'text' : 'time'"
			:class="[$style.TimeFieldInput, hourCycle === 12 && $style.TimeFieldInputAmPm]"
			:placeholder="hourCycle === 12 ? 'hh:mm AM' : undefined"
			:aria-label="timeLabel"
			:aria-invalid="inputError ? true : undefined"
			@focus="onTimeFocus"
			@blur="onTimeBlur"
		/>
	</div>
</template>

<style lang="css" module>
.DateFieldGroup {
	display: flex;
	min-width: 0;
}

.DateFieldGroupJoined {
	--input--height: var(--height--sm);
	--input--radius: var(--radius--3xs);
	--input--font-size: var(--font-size--xs);
	--input--padding: var(--spacing--2xs);
	--input--color--background: light-dark(var(--color--neutral-white), var(--color--neutral-950));
	--input--border-color: var(--border-color);
	--input--border-color--hover: var(--border-color--strong);
	--input--border-color--focus: var(--focus--border-color);

	align-items: center;
	min-height: var(--input--height);
	border-radius: var(--input--radius);
	background-color: var(--input--color--background);
	box-shadow: inset 0 0 0 1px var(--input--border-color);
	overflow: hidden;
}

.DateFieldGroupJoined:hover:not(:focus-within) {
	box-shadow: inset 0 0 0 1px var(--input--border-color--hover);
}

.DateFieldGroupJoined:focus-within {
	outline: var(--focus--border-width) solid var(--focus--outline-color);
	box-shadow: inset 0 0 0 1px var(--input--border-color--focus);
}

.DateFieldGroupJoined.DateFieldGroupActive {
	box-shadow: inset 0 0 0 2px var(--focus--border-color);
}

.DateFieldGroupJoined.DateFieldGroupActive:hover:not(:focus-within),
.DateFieldGroupJoined.DateFieldGroupActive:focus-within {
	outline: none;
	box-shadow: inset 0 0 0 2px var(--focus--border-color);
}

.DateFieldGroupInvalid.DateFieldGroupJoined,
.DateFieldGroupInvalid.DateFieldGroupJoined:hover:not(:focus-within),
.DateFieldGroupInvalid.DateFieldGroupJoined:focus-within,
.DateFieldGroupInvalid.DateFieldGroupJoined.DateFieldGroupActive,
.DateFieldGroupInvalid.DateFieldGroupJoined.DateFieldGroupActive:hover:not(:focus-within),
.DateFieldGroupInvalid.DateFieldGroupJoined.DateFieldGroupActive:focus-within {
	outline: none;
	box-shadow: inset 0 0 0 1px var(--border-color--danger);
}

.DateFieldGroupInvalid:not(.DateFieldGroupJoined) .DateFieldInput :global(.n8n-input__wrapper),
.DateFieldGroupInvalid:not(.DateFieldGroupJoined)
	.DateFieldInput
	:global(.n8n-input__wrapper:focus-within),
.DateFieldGroupInvalid:not(.DateFieldGroupJoined)
	.DateFieldInput
	:global(.n8n-input__wrapper:hover:not(:focus-within)) {
	outline: none;
	box-shadow: inset 0 0 0 1px var(--border-color--danger);
}

.DateFieldInput {
	width: 100%;
	min-width: 0;
	flex: 1;
}

.DateFieldGroupJoined .DateFieldInput :global(.n8n-input__wrapper),
.DateFieldGroupJoined .DateFieldInput :global(.n8n-input__wrapper:hover:not(:focus-within)),
.DateFieldGroupJoined .DateFieldInput :global(.n8n-input__wrapper:focus-within) {
	min-height: var(--input--height);
	border-radius: 0;
	background: transparent;
	box-shadow: none;
	outline: none;
}

.DateFieldInput :global(input) {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.TimeFieldInput {
	flex-shrink: 0;
	align-self: stretch;
	padding: 0 var(--input--padding);
	border: none;
	border-left: 1px solid var(--input--border-color);
	border-radius: 0;
	background: transparent;
	color: var(--color--text--shade-1);
	font-size: var(--input--font-size);
	font-family: inherit;
	outline: none;
}

.TimeFieldInputAmPm {
	width: 6.75rem;
}

.TimeFieldInput::-webkit-calendar-picker-indicator {
	display: none;
	-webkit-appearance: none;
}

.DateFieldGroup:not(.DateFieldGroupJoined)
	.DateFieldInput
	:global(.n8n-input__wrapper:focus-within) {
	outline: none;
}

.DateFieldGroupActive:not(.DateFieldGroupJoined):not(.DateFieldGroupInvalid)
	.DateFieldInput
	:global(.n8n-input__wrapper),
.DateFieldGroupActive:not(.DateFieldGroupJoined):not(.DateFieldGroupInvalid)
	.DateFieldInput
	:global(.n8n-input__wrapper:focus-within),
.DateFieldGroupActive:not(.DateFieldGroupJoined):not(.DateFieldGroupInvalid)
	.DateFieldInput
	:global(.n8n-input__wrapper:hover:not(:focus-within)) {
	outline: none;
	box-shadow: inset 0 0 0 2px var(--focus--border-color);
}
</style>
