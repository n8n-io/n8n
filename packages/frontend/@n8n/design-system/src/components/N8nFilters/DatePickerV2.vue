<script lang="ts" setup>
// Use the non connected components to achieve this, Calendar, DateField and TimeField

import { getLocalTimeZone, parseDate, type DateValue } from '@internationalized/date';
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
	SwitchRoot,
	SwitchThumb,
	TimeFieldRoot,
	TimeFieldInput,
} from 'reka-ui';
import { ref, computed, useTemplateRef } from 'vue';

import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

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
	return undefined;
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

function stopKeyboardPropagation(e: KeyboardEvent) {
	// Check if the event originated from the month field
	const target = e.target as HTMLElement;
	if (target?.id === 'month' && e.key === 'ArrowLeft') {
		return; // Don't stop propagation
	}

	// Stop propagation for everything else except Escape
	if (e.key === 'Escape') return;
	e.stopPropagation();
}

// Focus management - focus the first segment when mounted
const dateFieldRoot = useTemplateRef('dateFieldRoot');
defineExpose({
	focusInto: () => {
		if (dateFieldRoot.value) {
			const firstSegment = dateFieldRoot.value.$el.querySelector('.dateFieldSegment');
			if (firstSegment instanceof HTMLElement) {
				firstSegment.focus();
			}
		}
	},
});

const includeTime = ref(false);
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
		<div class="TimeContainer">
			<label class="Label" for="include-time">
				<N8nText size="small" color="text-base">Include time</N8nText>
			</label>
			<SwitchRoot id="include-time" v-model="includeTime" class="SwitchRoot">
				<SwitchThumb class="SwitchThumb" />
			</SwitchRoot>
		</div>
		<div v-if="includeTime" class="">
			<TimeFieldRoot
				id="time-field"
				v-slot="{ segments }"
				granularity="second"
				class="datePickerField"
			>
				<template v-for="item in segments" :key="item.part">
					<TimeFieldInput v-if="item.part === 'literal'" :part="item.part" class="dateFieldLiteral">
						{{ item.value }}
					</TimeFieldInput>
					<TimeFieldInput v-else :part="item.part" class="dateFieldSegment">
						{{ item.value }}
					</TimeFieldInput>
				</template>
			</TimeFieldRoot>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use 'Filters.scss';

.SwitchRoot {
	width: 36px;
	height: 18px;
	border-radius: 9999px;
	position: relative;
	background-color: var(--color-foreground-dark);
	-webkit-tap-highlight-color: rgba(0, 0, 0, 0);
}
.SwitchRoot:focus-visible {
	box-shadow: 0 0 0 2px var(--color-secondary);
}
.SwitchRoot[data-state='checked'] {
	background-color: var(--color-success);
}

.SwitchThumb {
	display: block;
	width: 16px;
	height: 16px;
	background-color: var(--color-background-light);
	border-radius: 9999px;
	transition: transform 100ms;
	transform: translateX(1px);
	will-change: transform;
}
.SwitchThumb[data-state='checked'] {
	transform: translateX(19px);
}

.TimeContainer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 4px;
	padding: 8px;
	border-top: var(--border-base);
	border-color: var(--color-foreground-light);
}
</style>
