<script setup lang="ts">
import type { DateValue } from '@internationalized/date';
import { injectDateRangePickerRootContext } from 'reka-ui';
import { computed, ref, watch } from 'vue';

import { useI18n } from '../../composables/useI18n';
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
const { single, showTime, hourCycle } = useDateRangePickerContext();
const { t } = useI18n();

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
const inputError = ref<string | null>(null);

const fieldValue = computed(() =>
	props.type === 'start' ? rootContext.modelValue.value.start : rootContext.modelValue.value.end,
);

const isSelectingEnd = computed(() => {
	const { start, end } = rootContext.modelValue.value;
	return Boolean(start && !end);
});

const isActive = computed(() => {
	if (single.value) return true;
	return props.type === (isSelectingEnd.value ? 'end' : 'start');
});

function setError(message: string | null) {
	inputError.value = message;
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

function commitValue(nextValue: DateValue) {
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

	if (!result.ok) {
		setError(
			result.error === 'outside'
				? t('dateRangePicker.outsideRange')
				: t('dateRangePicker.invalidDate'),
		);
		return;
	}

	setError(null);
	rootContext.onDateChange(result.range);
}

function commitDate() {
	const trimmed = dateText.value.trim();
	if (!trimmed) {
		setError(null);
		syncDateText();
		return;
	}

	const parsed = parseDateValue(trimmed, formatOptions.value);
	if (!parsed) {
		setError(t('dateRangePicker.invalidDate'));
		return;
	}

	commitValue(showTime.value ? mergeDatePreservingTime(parsed, fieldValue.value) : parsed);
}

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
		setError(null);
		syncTimeText();
		return;
	}

	commitValue(toDateTimeValue(current, parsedTime));
}

function onDateFocus() {
	editingDate.value = true;
}

function onDateBlur() {
	editingDate.value = false;
	commitDate();
}

function onTimeFocus() {
	editingTime.value = true;
}

function onTimeBlur() {
	editingTime.value = false;
	commitTime();
}
</script>

<template>
	<div :class="$style.DateField">
		<div
			:class="[
				$style.DateFieldGroup,
				showTime && $style.DateFieldGroupJoined,
				inputError && $style.DateFieldGroupInvalid,
				isActive && $style.DateFieldGroupActive,
			]"
		>
			<input
				v-model="dateText"
				type="text"
				:class="$style.FieldInput"
				:placeholder="getDateValuePlaceholder(formatOptions)"
				:aria-label="dateLabel"
				:aria-invalid="inputError ? true : undefined"
				:aria-describedby="inputError ? `${type}-field-error` : undefined"
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
				:aria-invalid="inputError ? true : undefined"
				:aria-describedby="inputError ? `${type}-field-error` : undefined"
				@focus="onTimeFocus"
				@blur="onTimeBlur"
			/>
		</div>
		<div
			v-if="inputError"
			:id="`${type}-field-error`"
			:class="$style.FieldErrorTooltip"
			role="alert"
		>
			{{ inputError }}
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
	--input--border-color--invalid: var(--color--red-500);
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

.DateFieldGroupActive:not(.DateFieldGroupInvalid) {
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

.DateFieldGroupInvalid,
.DateFieldGroupInvalid:hover:not(:focus-within),
.DateFieldGroupInvalid:focus-within {
	outline: none;
	--input--color--background: var(--background--danger);
	--joined--border-shadow: inset 0 0 0 1px var(--input--border-color--invalid);
	background-color: var(--input--color--background);
}

.DateFieldGroupInvalid .FieldInput {
	color: var(--text-color--danger);
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

.FieldErrorTooltip {
	position: absolute;
	top: calc(100% + var(--spacing--4xs));
	left: 0;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: center;
	max-width: 180px;
	min-height: var(--height--sm);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border-radius: var(--radius--xs);
	background: var(--color--neutral-black);
	box-shadow: var(--shadow--sm);
	color: var(--color--neutral-100);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	text-wrap: pretty;
	overflow-wrap: anywhere;
	pointer-events: none;
}
</style>
