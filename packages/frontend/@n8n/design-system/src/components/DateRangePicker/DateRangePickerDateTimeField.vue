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

const rootContext = injectDateRangePickerRootContext();
const { single, showTime, hourCycle, activeField, setActiveField, clearActiveFieldFocus } =
	useDateRangePickerContext();

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

const dateText = ref('');
const timeText = ref('');
const editingDate = ref(false);
const editingTime = ref(false);

const fieldValue = computed(() =>
	props.type === 'start' ? rootContext.modelValue.value.start : rootContext.modelValue.value.end,
);

const isActive = computed(() => {
	if (single.value) return true;
	return activeField.value === props.type;
});

function syncDateText() {
	dateText.value = formatDateValue(fieldValue.value, formatOptions.value);
}

function syncTimeText() {
	timeText.value = formatTimeValue(fieldValue.value, hourCycle.value);
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

function commitValue(nextValue: DateValue): boolean {
	const result = resolveFieldValueCommit({
		field: props.type,
		value: nextValue,
		range: rootContext.modelValue.value,
		single: single.value,
		selectionOptions: {
			minValue: rootContext.minValue.value,
			maxValue: rootContext.maxValue.value,
			isDateUnavailable: rootContext.isDateUnavailable,
		},
	});

	if (!result.ok) return false;

	const current = rootContext.modelValue.value;
	const nextStart = result.range.start;
	const nextEnd = result.range.end;
	const startUnchanged =
		(!current.start && !nextStart) ||
		(Boolean(current.start && nextStart) && current.start?.compare(nextStart) === 0);
	const endUnchanged =
		(!current.end && !nextEnd) ||
		(Boolean(current.end && nextEnd) && current.end?.compare(nextEnd) === 0);

	if (startUnchanged && endUnchanged) return true;

	rootContext.onDateChange(result.range);
	return true;
}

function commitDate() {
	const trimmed = dateText.value.trim();
	if (!trimmed) {
		syncDateText();
		return;
	}

	const parsed = parseDateValue(trimmed, formatOptions.value);
	if (!parsed) {
		syncDateText();
		return;
	}

	const nextValue = showTime.value ? mergeDatePreservingTime(parsed, fieldValue.value) : parsed;
	if (!commitValue(nextValue)) {
		syncDateText();
	}
}

function commitTime() {
	const current = fieldValue.value;
	const trimmed = timeText.value.trim();
	if (!current || !trimmed) {
		syncTimeText();
		return;
	}

	const parsedTime = parseTimeValue(trimmed, hourCycle.value);
	if (!parsedTime) {
		syncTimeText();
		return;
	}

	if (!commitValue(toDateTimeValue(current, parsedTime))) {
		syncTimeText();
	}
}

function onDateFocus() {
	editingDate.value = true;
	setActiveField(props.type);
}

function onDateBlur() {
	editingDate.value = false;
	clearActiveFieldFocus();
	commitDate();
}

function onTimeFocus() {
	editingTime.value = true;
	setActiveField(props.type);
}

function onTimeBlur() {
	editingTime.value = false;
	clearActiveFieldFocus();
	commitTime();
}
</script>

<template>
	<div :class="$style.DateField">
		<div
			:class="[
				$style.DateFieldGroup,
				showTime && $style.DateFieldGroupJoined,
				isActive && $style.DateFieldGroupActive,
			]"
		>
			<input
				v-model="dateText"
				type="text"
				:class="$style.FieldInput"
				:placeholder="getDateValuePlaceholder(formatOptions)"
				:aria-label="dateLabel"
				@focus="onDateFocus"
				@blur="onDateBlur"
			/>
			<input
				v-if="showTime"
				v-model="timeText"
				type="text"
				:class="$style.FieldInput"
				:placeholder="getTimeValuePlaceholder(hourCycle)"
				:aria-label="timeLabel"
				@focus="onTimeFocus"
				@blur="onTimeBlur"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.DateField {
	position: relative;
	min-width: 0;
}

.DateFieldGroup {
	--input--height: var(--height--md);
	--input--radius: var(--radius--3xs);
	--input--font-size: var(--font-size--xs);
	--input--padding: var(--spacing--2xs);
	--input--color--background: light-dark(var(--color--neutral-white), var(--color--neutral-950));
	--input--border-color: var(--border-color);
	--input--border-color--hover: var(--border-color--strong);
	--input--border-color--focus: var(--focus--border-color);
	--joined--border-shadow: inset 0 0 0 1px var(--input--border-color);

	display: flex;
	min-width: 0;
	gap: var(--spacing--4xs);
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

.DateFieldGroupActive {
	--joined--border-shadow: inset 0 0 0 1px var(--input--border-color--focus);

	&:hover:not(:focus-within) {
		--joined--border-shadow: inset 0 0 0 1px var(--input--border-color--focus);
	}

	&:not(:focus-within) {
		@include focus.focus-ring;
	}
}

.DateFieldGroupJoined {
	position: relative;
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

.FieldInput {
	width: 100%;
	padding: 0 var(--input--padding);
	border: none;
	background: transparent;
	outline: none;

	&::placeholder {
		color: var(--text-color--subtler);
	}
}
</style>
