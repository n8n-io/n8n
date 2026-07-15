<script setup lang="ts">
import { injectDateRangePickerRootContext } from 'reka-ui';
import { computed, ref, watch } from 'vue';

import DateRangePickerDateTimeField from './DateRangePickerDateTimeField.vue';
import { useDateRangePickerContext } from './dateRangePicker.context';
import { isDateRangeValid, isDateSelectable } from './datePicker.utils';

const rootContext = injectDateRangePickerRootContext();
const { activeField, single, showTime } = useDateRangePickerContext();

const OUTSIDE_RANGE_MESSAGE = 'Outside of allowed range';

const startError = ref<string | null>(null);
const endError = ref<string | null>(null);

const selectionOptions = computed(() => ({
	minValue: rootContext.minValue.value,
	maxValue: rootContext.maxValue.value,
	isDateUnavailable: rootContext.isDateUnavailable,
}));

watch(
	() => rootContext.modelValue.value,
	(range) => {
		if (single.value) {
			activeField.value = 'start';
			return;
		}

		// Only sync from range when empty — pending/complete steps are owned by
		// calendar selection (selectionStep), not inferred from start===end.
		if (!range?.start && !range?.end) {
			activeField.value = 'start';
		}
	},
	{ deep: true, immediate: true },
);

const errorMessage = computed(() => {
	if (startError.value) return startError.value;
	if (endError.value) return endError.value;

	const { start, end } = rootContext.modelValue.value;
	const options = selectionOptions.value;
	const hasInvalidDate =
		(start !== undefined && !isDateSelectable(start, options)) ||
		(end !== undefined && !isDateSelectable(end, options));

	if (hasInvalidDate || !isDateRangeValid(start, end, options)) {
		return OUTSIDE_RANGE_MESSAGE;
	}

	return null;
});
</script>

<template>
	<div :class="$style.DateFieldRoot" :data-invalid="errorMessage ? '' : undefined">
		<div :class="[$style.DateFields, (single || showTime) && $style.DateFieldsStacked]">
			<DateRangePickerDateTimeField
				type="start"
				:date-label="single ? 'Date' : 'Start date'"
				:time-label="single ? 'Time' : 'Start time'"
				@update:error="startError = $event"
			/>
			<DateRangePickerDateTimeField
				v-if="!single"
				type="end"
				date-label="End date"
				time-label="End time"
				@update:error="endError = $event"
			/>
		</div>
		<div v-if="errorMessage" :class="$style.DateFieldError" role="alert">
			{{ errorMessage }}
		</div>
	</div>
</template>

<style lang="css" module>
.DateFieldRoot {
	width: 100%;
	min-width: 0;
}

.DateFields {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--4xs);
	width: 100%;
}

.DateFieldsStacked {
	grid-template-columns: minmax(0, 1fr);
}

.DateFieldError {
	color: var(--text-color--danger);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	margin-top: var(--spacing--3xs);
}
</style>
