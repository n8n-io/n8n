<script setup lang="ts">
import {
	DatePickerRoot,
	DatePickerField,
	DatePickerInput,
	DatePickerTrigger,
	DatePickerContent,
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
import { ref, watch } from 'vue';

import N8nIcon from '../N8nIcon';

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

watch(selectedDate, (newDate) => {
	emit('update:modelValue', newDate);
});

function clearSelection() {
	selectedDate.value = null;
}

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
		<DatePickerRoot autofocus @update:model-value="handleDateSelect" class="datePickerRoot">
			<DatePickerField v-slot="{ segments }" class="datePickerField">
				<template v-for="item in segments" :key="item.part">
					<DatePickerInput
						v-if="item.part === 'literal'"
						:part="item.part"
						class="dateFieldLiteral"
					>
						{{ item.value }}
					</DatePickerInput>
					<DatePickerInput v-else :part="item.part" class="dateFieldSegment">
						{{ item.value }}
					</DatePickerInput>
				</template>

				<DatePickerTrigger class="datePickerTrigger">
					<N8nIcon icon="calendar" color="foreground-xdark" />
				</DatePickerTrigger>
			</DatePickerField>

			<DatePickerContent class="datePickerContent">
				<DatePickerCalendar v-slot="{ weekDays, grid }" class="datePickerCalendar">
					<DatePickerHeader class="datePickerHeader">
						<DatePickerPrev class="datePickerNavButton">
							<N8nIcon icon="chevron-left" size="small" />
						</DatePickerPrev>
						<DatePickerHeading class="datePickerHeading" />
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
			</DatePickerContent>
		</DatePickerRoot>
	</div>
</template>

<style lang="scss" scoped>
@use 'Filters.scss';

.datePickerContainer {
	position: relative;
	display: inline-flex;
	align-items: center;
	width: 200px;
	z-index: 4000;

	/* & :deep() {

	} */
}

.datePickerRoot {
	position: relative;
	width: 100%;
}

.datePickerField {
	display: inline-flex;
	align-items: center;
	justify-content: between;
	line-height: 1;
	font-size: var(--font-size-xs);
	padding: var(--spacing-2xs) var(--spacing-xs);
	width: 200px;
	background-color: var(--color-foreground-xlight);
	border-radius: var(--border-radius-base) var(--border-radius-base) 0 0;
}

.dateFieldLiteral {
	padding: var(--spacing-4xs);
	color: var(--color-foreground-base);
}

.dateFieldSegment {
	padding: var(--spacing-4xs);
	color: var(--color-text-base);
	border-radius: var(--border-radius-small);
}

.dateFieldSegment:hover {
	background-color: var(--color-foreground-light);
}

.dateFieldSegment:focus {
	background-color: var(--color-foreground-base);
	outline: none;
}

.dateFieldSegment[aria-valuetext='Empty'] {
	color: var(--color-text-light);
}

.datePickerTrigger {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing-4xs);
	margin-left: auto;
	background: none;
	border: none;
	cursor: pointer;
	border-radius: var(--border-radius-small);
}

.datePickerTrigger:hover {
	background-color: var(--color-foreground-light);
}

.datePickerTrigger:focus {
	outline: 2px solid var(--color-primary);
	outline-offset: 2px;
}

.clearButton {
	position: absolute;
	right: var(--spacing-xl);
	top: 50%;
	transform: translateY(-50%);
	background: none;
	border: none;
	padding: var(--spacing-4xs);
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--border-radius-small);
}

.clearButton:hover {
	background-color: var(--color-foreground-light);
}

.datePickerContent {
	z-index: 9999;
	position: relative;
}

.datePickerCalendar {
	display: flex;
	flex-direction: column;
	z-index: 1000;
	min-width: 280px;
	position: relative;
	border: var(--border-base);
	background-color: var(--color-foreground-xlight);
	box-shadow: var(--box-shadow-light);
	border-radius: var(--border-radius-base);
}

.datePickerHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing-s);
}

.datePickerNavButton {
	display: inline-flex;
	justify-content: center;
	align-items: center;
	width: 32px;
	height: 32px;
	border: none;
	background: none;
	cursor: pointer;
	border-radius: var(--border-radius-base);
	color: var(--color-text-base);
}

.datePickerNavButton:hover {
	background-color: var(--color-foreground-light);
	color: var(--color-text-dark);
}

.datePickerHeading {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-s);
	color: var(--color-text-dark);
}

.datePickerWrapper {
	position: relative;
	display: flex;
	flex-direction: column;
	padding-top: var(--spacing-xs);
	margin-top: var(--spacing-xs);
	border-top: var(--border-base);
	z-index: 4000;
}

.datePickerGrid {
	width: 100%;
	user-select: none;
	border-collapse: collapse;
}

.datePickerGridRow {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	gap: var(--spacing-4xs);
	margin-bottom: var(--spacing-4xs);
}

.datePickerHeadCell {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 24px;
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-regular);
	color: var(--color-text-light);
	text-transform: uppercase;
}

.datePickerCell {
	position: relative;
	font-size: var(--font-size-xs);
	text-align: center;
}

:deep(.datePickerCellTrigger) {
	display: flex;
	position: relative;
	justify-content: center;
	align-items: center;
	width: 32px;
	height: 32px;
	border: 1px solid transparent;
	border-radius: var(--border-radius-base);
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-regular);
	color: var(--color-text-base);
	background-color: transparent;
	cursor: pointer;
	white-space: nowrap;
}

:deep(.datePickerCellTrigger:hover) {
	background-color: var(--color-foreground-light);
	border-color: var(--color-foreground-dark);
}

:deep(.datePickerCellTrigger:focus) {
	outline: 2px solid var(--color-primary);
	outline-offset: 2px;
}

:deep(.datePickerCellTrigger[data-disabled]) {
	cursor: not-allowed;
	color: var(--color-text-lighter);
	opacity: 0.5;
}

:deep(.datePickerCellTrigger[data-selected]) {
	background-color: var(--color-primary);
	color: white;
	font-weight: var(--font-weight-bold);
}

:deep(.datePickerCellTrigger[data-outside-month]) {
	color: var(--color-text-lighter);
}

:deep(.datePickerCellTrigger[data-today]:not([data-selected])) {
	background-color: var(--color-foreground-base);
	font-weight: var(--font-weight-bold);
}

:deep(.datePickerCellTrigger[data-unavailable]) {
	color: var(--color-text-lighter);
	text-decoration: line-through;
	cursor: not-allowed;
}
</style>
