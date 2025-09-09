<script setup lang="ts">
import {
	DatePickerRoot,
	DatePickerField,
	DatePickerInput,
	DatePickerCalendar,
	DatePickerHeader,
	DatePickerHeading,
	DatePickerGrid,
	DatePickerGridHead,
	DatePickerGridRow,
	DatePickerGridBody,
	DatePickerCell,
	DatePickerCellTrigger,
	DatePickerHeadCell,
	DatePickerNext,
	DatePickerPrev,
} from 'reka-ui';
import { ref, watch, onMounted, nextTick } from 'vue';

import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

interface DateValue {
	name: string;
	id: string;
	value: string; // ISO date string
}

const props = withDefaults(
	defineProps<{
		placeholder?: string;
		initialValue?: DateValue | null;
		minValue?: string; // ISO date string
		maxValue?: string; // ISO date string
	}>(),
	{
		placeholder: 'Select date...',
		initialValue: null,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: DateValue | null];
}>();

const selectedDate = ref(props.initialValue || null);
const datePickerFieldRef = ref<any>(null);

watch(selectedDate, (newDate) => {
	emit('update:modelValue', newDate);
});

// Focus the date picker field when the component is mounted
onMounted(async () => {
	await nextTick();
	// Try different approaches to focus the DatePickerField
	if (datePickerFieldRef.value) {
		// Try the component's focus method first
		if (typeof datePickerFieldRef.value.focus === 'function') {
			datePickerFieldRef.value.focus();
		} else if (datePickerFieldRef.value.$el) {
			// Fallback to focusing the root element
			const rootEl = datePickerFieldRef.value.$el as HTMLElement;
			const firstSegment = rootEl.querySelector('.dateFieldSegment');
			if (firstSegment instanceof HTMLElement) {
				firstSegment.focus();
			}
		}
	}
});

function handleDateSelect(dateValue: unknown) {
	if (!dateValue) {
		selectedDate.value = null;
		return;
	}

	// Convert the date value to our DateValue format
	let dateString = '';
	if (typeof dateValue === 'string') {
		dateString = dateValue;
	} else if (dateValue && typeof dateValue === 'object' && 'toString' in dateValue) {
		dateString = (dateValue as { toString: () => string }).toString();
	} else {
		return;
	}

	const date = new Date(dateString);
	if (isNaN(date.getTime())) return;

	const isoString = date.toISOString().split('T')[0];

	selectedDate.value = {
		name: date.toLocaleDateString(),
		id: isoString,
		value: isoString,
	};
}
</script>

<template>
	<div class="datePickerContainer">
		<DatePickerRoot @update:model-value="handleDateSelect" class="datePickerRoot">
			<DatePickerField ref="datePickerFieldRef" v-slot="{ segments }" class="datePickerField">
				<template v-for="item in segments" :key="item.part">
					<DatePickerInput
						v-if="item.part === 'literal'"
						:part="item.part"
						class="dateFieldLiteral"
					>
						{{ item.value }}
					</DatePickerInput>
					<DatePickerInput v-else :part="item.part" class="dateFieldSegment" :tabindex="0">
						{{ item.value }}
					</DatePickerInput>
				</template>
			</DatePickerField>

			<DatePickerCalendar v-slot="{ weekDays, grid }" class="datePickerCalendar">
				<DatePickerHeader class="datePickerHeader">
					<DatePickerPrev class="datePickerNavButton">
						<N8nIcon icon="chevron-left" size="small" />
					</DatePickerPrev>
					<DatePickerHeading as-child v-slot="{ headingValue }">
						<N8nText size="small">{{ headingValue }}</N8nText>
					</DatePickerHeading>
					<DatePickerNext class="datePickerNavButton">
						<N8nIcon icon="chevron-right" size="small" />
					</DatePickerNext>
				</DatePickerHeader>
				<div class="datePickerWrapper">
					<DatePickerGrid
						v-for="month in grid"
						:key="month.value.toString()"
						class="datePickerGrid"
					>
						<DatePickerGridHead>
							<DatePickerGridRow class="datePickerGridRow">
								<DatePickerHeadCell v-for="day in weekDays" :key="day" class="datePickerHeadCell">
									{{ day }}
								</DatePickerHeadCell>
							</DatePickerGridRow>
						</DatePickerGridHead>
						<DatePickerGridBody>
							<DatePickerGridRow
								v-for="(weekDates, index) in month.rows"
								:key="`weekDate-${index}`"
								class="datePickerGridRow"
							>
								<DatePickerCell
									v-for="weekDate in weekDates"
									:key="weekDate.toString()"
									:date="weekDate"
									class="datePickerCell"
								>
									<DatePickerCellTrigger
										:day="weekDate"
										:month="month.value"
										class="datePickerCellTrigger"
									/>
								</DatePickerCell>
							</DatePickerGridRow>
						</DatePickerGridBody>
					</DatePickerGrid>
				</div>
			</DatePickerCalendar>
		</DatePickerRoot>
	</div>
</template>

<style lang="scss" scoped>
@use 'Filters.scss';

:deep(.datePickerCellTrigger) {
	@extend .datePickerCellTrigger;
}

:deep(.datePickerCellTrigger:hover) {
	@extend .datePickerCellTrigger;
}

:deep(.datePickerCellTrigger:focus) {
	@extend .datePickerCellTrigger;
}

:deep(.datePickerCellTrigger[data-disabled]) {
	@extend .datePickerCellTrigger;
}

:deep(.datePickerCellTrigger[data-selected]) {
	@extend .datePickerCellTrigger;
}

:deep(.datePickerCellTrigger[data-outside-view]) {
	@extend .datePickerCellTrigger;
}

:deep(.datePickerCellTrigger[data-today]:not([data-selected])) {
	@extend .datePickerCellTrigger;
}

:deep(.datePickerCellTrigger[data-unavailable]) {
	@extend .datePickerCellTrigger;
}
</style>
