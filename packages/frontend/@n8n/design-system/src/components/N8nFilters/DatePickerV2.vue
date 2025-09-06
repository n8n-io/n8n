<script lang="ts" setup>
// Use the non connected components to achieve this, Calendar, DateField and TimeField

import {
	DateFieldInput,
	DateFieldRoot,
	CalendarCell,
	CalendarCellTrigger,
	CalendarGrid,
	CalendarGridBody,
	CalendarGridHead,
	CalendarGridRow,
	CalendarHeadCell,
	CalendarHeader,
	CalendarHeading,
	CalendarNext,
	CalendarPrev,
	CalendarRoot,
} from 'reka-ui';
import { onMounted, ref, nextTick, computed } from 'vue';
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';
import { getLocalTimeZone, parseDate, today, type DateValue } from '@internationalized/date';

interface FilterItem {
	name: string;
	id: string;
	value: string; // ISO date string
}

const props = withDefaults(
	defineProps<{
		placeholder?: string;
		initialValue?: FilterItem | null;
		minValue?: string; // ISO date string
		maxValue?: string; // ISO date string
	}>(),
	{
		placeholder: 'Select date...',
		initialValue: null,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: FilterItem | null];
}>();

// Parse initial value or use today's date
const parsedInitialDate = computed(() => {
	if (props.initialValue?.value) {
		return parseDate(props.initialValue.value);
	}
	return today(getLocalTimeZone());
});

// Core state - single source of truth
const selectedDate = ref<DateValue | undefined>(parsedInitialDate.value);

// Parse min/max constraints
const minDate = computed(() => (props.minValue ? parseDate(props.minValue) : undefined));
const maxDate = computed(() => (props.maxValue ? parseDate(props.maxValue) : undefined));

// Handle date changes from either component
function handleDateChange(newDate: DateValue | undefined) {
	selectedDate.value = newDate;

	if (newDate) {
		// Format date as ISO string for emission
		const isoString = newDate.toString();
		const formattedDisplay = newDate.toDate(getLocalTimeZone()).toLocaleDateString();

		emit('update:modelValue', {
			id: isoString,
			value: isoString,
			name: formattedDisplay,
		});
	} else {
		emit('update:modelValue', null);
	}
}

// Stop all keyboard events from bubbling up to the dropdown
function stopKeyboardPropagation(e: KeyboardEvent) {
	if (e.key === 'Escape') return;
	e.stopPropagation();
}

const dateFieldRoot = ref<any>(null);

onMounted(async () => {
	await nextTick();
	// Focus the first segment after a small delay to ensure DOM is ready
	setTimeout(() => {
		const firstSegment = dateFieldRoot.value?.$el?.querySelector('.dateFieldSegment');
		if (firstSegment) {
			firstSegment.focus();
		}
	}, 100);
});
</script>

<template>
	<div
		@keydown="stopKeyboardPropagation"
		@keyup="stopKeyboardPropagation"
		class="datePickerContainer"
	>
		<DateFieldRoot
			v-slot="{ segments }"
			class="datePickerRoot"
			ref="dateFieldRoot"
			v-model="selectedDate"
			@update:model-value="handleDateChange"
		>
			<div class="datePickerField">
				<template v-for="item in segments" :key="item.part">
					<DateFieldInput v-if="item.part === 'literal'" :part="item.part" class="dateFieldLiteral">
						{{ item.value }}
					</DateFieldInput>
					<DateFieldInput v-else :part="item.part" class="dateFieldSegment" :id="item.part">
						{{ item.value }}
					</DateFieldInput>
				</template>
			</div>
		</DateFieldRoot>
		<CalendarRoot
			v-slot="{ weekDays, grid }"
			class="datePickerCalendar"
			ref="calendarRoot"
			v-model="selectedDate"
			@update:model-value="handleDateChange"
		>
			<CalendarHeader class="datePickerHeader">
				<CalendarPrev class="datePickerNavButton">
					<N8nIcon icon="chevron-left" size="small" />
				</CalendarPrev>
				<CalendarHeading as-child v-slot="{ headingValue }">
					<N8nText size="small">{{ headingValue }}</N8nText>
				</CalendarHeading>
				<CalendarNext class="datePickerNavButton">
					<N8nIcon icon="chevron-right" size="small" />
				</CalendarNext>
			</CalendarHeader>
			<div class="datePickerWrapper">
				<CalendarGrid v-for="month in grid" :key="month.value.toString()" class="datePickerGrid">
					<CalendarGridHead>
						<CalendarGridRow class="datePickerGridRow">
							<CalendarHeadCell v-for="day in weekDays" :key="day" class="datePickerHeadCell">
								{{ day }}
							</CalendarHeadCell>
						</CalendarGridRow>
					</CalendarGridHead>
					<CalendarGridBody>
						<CalendarGridRow
							v-for="(weekDates, index) in month.rows"
							:key="`weekDate-${index}`"
							class="datePickerGridRow"
						>
							<CalendarCell
								v-for="weekDate in weekDates"
								:key="weekDate.toString()"
								:date="weekDate"
								class="datePickerCell"
							>
								<CalendarCellTrigger
									:day="weekDate"
									:month="month.value"
									class="datePickerCellTrigger"
								/>
							</CalendarCell>
						</CalendarGridRow>
					</CalendarGridBody>
				</CalendarGrid>
			</div>
		</CalendarRoot>
	</div>
</template>

<style lang="scss" scoped>
@use 'Filters.scss';
</style>
