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
	FocusScope,
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

.datePickerContainer {
	position: relative;
	width: 200px;
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
	max-width: 200px;
	position: relative;
	border-top: var(--border-base);
	border-color: var(--color-foreground-light);
}

.datePickerHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing-4xs);
}

.datePickerNavButton {
	display: inline-flex;
	justify-content: center;
	align-items: center;
	width: var(--spacing-l);
	height: var(--spacing-l);
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

.datePickerWrapper {
	position: relative;
	display: flex;
	flex-direction: column;
	padding: var(--spacing-4xs);
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
	height: var(--spacing-l);
	font-size: var(--font-size-3xs);
	font-weight: var(--font-weight-regular);
	color: var(--color-text-light);
	text-transform: uppercase;
}

.datePickerCell {
	position: relative;
	text-align: center;
}

:deep(.datePickerCellTrigger) {
	display: flex;
	position: relative;
	justify-content: center;
	align-items: center;
	width: var(--spacing-l);
	height: var(--spacing-l);
	border-radius: var(--border-radius-base);
	font-size: var(--font-size-2xs);
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
	outline: 1px solid var(--color-secondary);
}

:deep(.datePickerCellTrigger[data-disabled]) {
	cursor: not-allowed;
	color: var(--color-text-lighter);
	opacity: 0.5;
}

:deep(.datePickerCellTrigger[data-selected]) {
	background-color: var(--color-callout-secondary-background);
	outline: var(--border-base);
	outline-color: var(--color-callout-secondary-border);
	color: var(--color-callout-secondary-font);
	border-radius: var(--border-radius-base);
}

:deep(.datePickerCellTrigger[data-outside-view]) {
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
