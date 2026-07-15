<script setup lang="ts">
import type { DateValue } from '@internationalized/date';
import { injectDateRangePickerRootContext } from 'reka-ui';
import { computed, ref, watch } from 'vue';

import { useDateRangePickerContext } from './dateRangePicker.context';
import {
	formatDateValue,
	formatTimeValue,
	getDateValuePlaceholder,
	getTimeValuePlaceholder,
	mergeDatePreservingTime,
	parseDateValue,
	parseTimeValue,
	resolveFieldValueCommit,
	shouldIncludeTimeInDateFormat,
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
const { single, showTime, hourCycle } = useDateRangePickerContext();

const INVALID_DATE_MESSAGE = 'Invalid date';
const OUTSIDE_RANGE_MESSAGE = 'Outside of allowed range';

/** Formatting options for the date text input (locale, optional inline time). */
const formatOptions = computed<DatePickerFormatOptions>(() => ({
	locale: rootContext.locale.value,
	hourCycle: hourCycle.value,
	includeTime: shouldIncludeTimeInDateFormat({
		showTime: showTime.value,
		granularity: rootContext.granularity.value,
		start: rootContext.modelValue.value.start,
		end: rootContext.modelValue.value.end,
	}),
}));

const datePlaceholder = computed(() => getDateValuePlaceholder(formatOptions.value));
const timePlaceholder = computed(() => getTimeValuePlaceholder(hourCycle.value));

/** Bounds / unavailable-date rules used when validating typed values. */
const selectionOptions = computed(() => ({
	minValue: rootContext.minValue.value,
	maxValue: rootContext.maxValue.value,
	isDateUnavailable: rootContext.isDateUnavailable,
}));

const dateText = ref('');
const timeText = ref('');
/** True while the user is editing the date input — skips external sync overwrites. */
const editingDate = ref(false);
/** True while the user is editing the time input — skips external sync overwrites. */
const editingTime = ref(false);
const inputError = ref<string | null>(null);

/** The start or end value this field is bound to. */
const fieldValue = computed(() =>
	props.type === 'start' ? rootContext.modelValue.value.start : rootContext.modelValue.value.end,
);

/** Publishes the field error to the parent and local invalid styling. */
function setError(message: string | null) {
	inputError.value = message;
	emit('update:error', message);
}

/** Refreshes the date input from the current model value. */
function syncDateText() {
	dateText.value = formatDateValue(fieldValue.value, formatOptions.value);
	setError(null);
}

/** Refreshes the time input from the current model value. */
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

/** Applies a parsed date/time to the range, or surfaces a validation error. */
function commitValue(nextValue: DateValue) {
	const result = resolveFieldValueCommit({
		field: props.type,
		value: nextValue,
		range: rootContext.modelValue.value,
		single: single.value,
		selectionOptions: selectionOptions.value,
	});

	if (!result.ok) {
		setError(result.error === 'outside' ? OUTSIDE_RANGE_MESSAGE : INVALID_DATE_MESSAGE);
		return;
	}

	setError(null);
	rootContext.onDateChange(result.range);
}

/** Parses the date input on blur and commits it when valid. */
function commitDate() {
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

	commitValue(showTime.value ? mergeDatePreservingTime(parsed, fieldValue.value) : parsed);
}

/** Parses the time input on blur and commits it onto the current date. */
function commitTime() {
	const current = fieldValue.value;
	const trimmed = timeText.value.trim();
	if (!current || !trimmed) {
		setError(null);
		syncTimeText();
		return;
	}

	const parsedTime = parseTimeValue(trimmed, hourCycle.value);
	if (!parsedTime) {
		// Invalid text (e.g. AM/PM removed) — restore the last committed time.
		setError(null);
		syncTimeText();
		return;
	}

	commitValue(toDateTimeValue(current, parsedTime));
}

/** Marks the date segment as being edited. */
function onDateFocus() {
	editingDate.value = true;
}

/** Stops date editing and commits the typed date. */
function onDateBlur() {
	editingDate.value = false;
	commitDate();
}

/** Marks the time segment as being edited. */
function onTimeFocus() {
	editingTime.value = true;
}

/** Stops time editing and commits the typed time. */
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
			inputError && $style.DateFieldGroupInvalid,
		]"
	>
		<input
			v-model="dateText"
			type="text"
			:class="$style.FieldInput"
			:placeholder="datePlaceholder"
			:aria-label="dateLabel"
			:aria-invalid="inputError ? true : undefined"
			@focus="onDateFocus"
			@blur="onDateBlur"
		/>
		<input
			v-if="showTime"
			v-model="timeText"
			type="text"
			:class="$style.FieldInput"
			:placeholder="timePlaceholder"
			:aria-label="timeLabel"
			:aria-invalid="inputError ? true : undefined"
			@focus="onTimeFocus"
			@blur="onTimeBlur"
		/>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.DateFieldGroup {
	--input--height: var(--height--md);
	--input--radius: var(--radius--3xs);
	--input--font-size: var(--font-size--xs);
	--input--padding: var(--spacing--2xs);
	--input--color--background: light-dark(var(--color--neutral-white), var(--color--neutral-950));
	--input--border-color: var(--border-color);
	--input--border-color--hover: var(--border-color--strong);
	--input--border-color--focus: var(--focus--border-color);
	--input--border-color--invalid: var(--color--red-500);
	--joined--border-shadow: inset 0 0 0 1px var(--input--border-color);

	display: flex;
	min-width: 0;
	gap: 4px;
	height: var(--input--height);
	border-radius: var(--input--radius);
	background-color: var(--input--color--background);
	box-shadow: var(--joined--border-shadow);
	overflow: hidden;

	@include focus.focus-within-ring;

	&:hover:not(:focus-within) {
		--joined--border-shadow: inset 0 0 0 1px var(--input--border-color--hover);
	}

	&:focus-within {
		--joined--border-shadow: inset 0 0 0 1px var(--input--border-color--focus);
	}
}

.DateFieldGroupJoined {
	position: relative;
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	align-items: stretch;
}

.DateFieldGroupJoined::after {
	content: '';
	position: absolute;
	top: var(--spacing--3xs);
	bottom: var(--spacing--3xs);
	left: 50%;
	width: 1px;
	transform: translateX(-50%);
	background-color: var(--input--border-color);
	pointer-events: none;
}

.DateFieldGroupInvalid,
.DateFieldGroupInvalid:hover:not(:focus-within),
.DateFieldGroupInvalid:focus-within {
	outline: none;
	--joined--border-shadow: inset 0 0 0 1px var(--input--border-color--invalid);
	background-color: var(--input--color--background);
}

.FieldInput {
	width: 100%;
	min-width: 0;
	height: 100%;
	padding: 0 var(--input--padding);
	border: none;
	border-radius: 0;
	background: transparent;
	color: var(--color--text--shade-1);
	font-size: var(--input--font-size);
	font-family: inherit;
	outline: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}
</style>
