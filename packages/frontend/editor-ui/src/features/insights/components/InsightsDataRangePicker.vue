<script lang="ts" setup>
import { getLocalTimeZone, isToday } from '@internationalized/date';
import type {
	DateRange,
	DateValue,
	N8nDateRangePickerProps,
	N8nDateRangePickerRootEmits,
} from '@n8n/design-system';
import { N8nButton, N8nDateRangePicker, N8nIcon } from '@n8n/design-system';
import dateformat from 'dateformat';
import { computed, ref, shallowRef, watch } from 'vue';

const DATE_FORMAT_DAY_MONTH_YEAR = 'd mmm, yyyy';
const DATE_FORMAT_DAY_MONTH = 'd mmm';

type Props = Pick<N8nDateRangePickerProps, 'maxValue' | 'minValue'>;
const props = defineProps<
	Required<Props> & {
		modelValue: {
			start: DateValue;
			end: DateValue;
		};
		presets: Array<{ value: number; label: string; disabled?: boolean }>;
	}
>();
const emit = defineEmits<N8nDateRangePickerRootEmits>();

function isBeforeOrSame(dateToCompare: DateValue, referenceDate: DateValue): boolean {
	return dateToCompare.compare(referenceDate) <= 0;
}

function isAfterOrSame(dateToCompare: DateValue, referenceDate: DateValue) {
	return dateToCompare.compare(referenceDate) >= 0;
}

function isEqual(dateToCompare?: DateValue, referenceDate?: DateValue) {
	if (!dateToCompare || !referenceDate) return false;
	return dateToCompare.compare(referenceDate) === 0;
}

function isValidDateRange({ start, end }: DateRange) {
	if (!start) return false;
	if (!end) return false;

	return isBeforeOrSame(end, props.maxValue) && isAfterOrSame(start, props.minValue);
}

const range = shallowRef<N8nDateRangePickerProps['modelValue']>({
	start: props.modelValue.start?.copy(),
	end: props.modelValue.end?.copy(),
});

function syncWithParentValue() {
	if (
		!isEqual(range.value?.start, props.modelValue.start) ||
		!isEqual(range.value?.end, props.modelValue.end)
	) {
		range.value = {
			start: props.modelValue.start?.copy(),
			end: props.modelValue.end?.copy(),
		};
	}
}

function syncData(isOpen: boolean) {
	if (isOpen) {
		syncWithParentValue();
		return;
	}

	const normalizedRange: DateRange = {
		start: range.value?.start?.copy(),
		end: range.value?.end?.copy() ?? range.value?.start?.copy(),
	};

	if (!isValidDateRange(normalizedRange)) {
		console.error('Invalid date range selected', normalizedRange);
		syncWithParentValue();
		return;
	}

	if (
		isEqual(normalizedRange.start, props.modelValue.start) &&
		isEqual(normalizedRange.end, props.modelValue.end)
	) {
		return;
	}
	emit('update:modelValue', normalizedRange);
}
const open = ref(false);
watch(open, syncData);

function setPresetRange(days: number) {
	range.value = {
		start: props.maxValue.copy().subtract({ days }),
		end: props.maxValue.copy(),
	};

	open.value = false;
}

const formattedRange = computed(() => {
	const { start, end } = props.modelValue;

	if (!start) return 'Select range';

	const startStr = start.toString();
	const endStr = end?.toString();

	if (!end || startStr === endStr) {
		return dateformat(startStr, DATE_FORMAT_DAY_MONTH_YEAR);
	}

	if (start.year === end.year) {
		return `${dateformat(startStr, DATE_FORMAT_DAY_MONTH)} - ${dateformat(endStr, DATE_FORMAT_DAY_MONTH_YEAR)}`;
	}

	return `${dateformat(startStr, DATE_FORMAT_DAY_MONTH_YEAR)} - ${dateformat(endStr, DATE_FORMAT_DAY_MONTH_YEAR)}`;
});

function isActiveRange(presetValue: number) {
	if (!isToday(props.modelValue.end, getLocalTimeZone())) return false;

	return props.modelValue.end.compare(props.modelValue.start) === presetValue;
}
</script>

<template>
	<N8nDateRangePicker v-model="range" v-model:open="open" :max-value :min-value>
		<template #trigger>
			<N8nButton icon="calendar" type="secondary">{{ formattedRange }}</N8nButton>
		</template>
		<template #presets>
			<N8nButton
				v-for="preset in presets"
				:key="preset.value"
				:class="$style.PresetButton"
				:type="isActiveRange(preset.value) ? 'primary' : 'secondary'"
				:disabled="preset.disabled"
				size="small"
				@click="setPresetRange(preset.value)"
			>
				{{ preset.label }}
				<N8nIcon v-if="preset.disabled" icon="lock" />
			</N8nButton>
		</template>
	</N8nDateRangePicker>
</template>

<style module>
.PresetButton {
	--button-border-color: transparent;
}
</style>
