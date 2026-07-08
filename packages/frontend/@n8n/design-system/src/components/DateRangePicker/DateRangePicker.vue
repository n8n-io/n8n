<script lang="ts" setup>
import {
	DateRangePickerCalendar,
	DateRangePickerCell,
	DateRangePickerCellTrigger,
	DateRangePickerContent,
	DateRangePickerGrid,
	DateRangePickerGridBody,
	DateRangePickerGridHead,
	DateRangePickerGridRow,
	DateRangePickerHeadCell,
	DateRangePickerHeader,
	DateRangePickerHeading,
	DateRangePickerNext,
	DateRangePickerPrev,
	DateRangePickerRoot,
	DateRangePickerTrigger,
	useForwardPropsEmits,
} from 'reka-ui';
import { nextTick, provide, ref } from 'vue';

import N8nButton from '../N8nButton';
import IconButton from '../N8nIconButton';
import N8nDateRangePickerCalendarWrapper from './DateRangePickerCalendarWrapper.vue';
import N8nDateRangePickerClearButton from './DateRangePickerClearButton.vue';
import N8nDateRangePickerField from './DateRangePickerField.vue';
import {
	N8N_DATE_RANGE_PICKER_ACTIVE_FIELD,
	N8N_DATE_RANGE_PICKER_SKIP_NEXT_CELL_CLICK,
} from './dateRangePicker.context';
import N8nDateRangePickerOpenHandler from './DateRangePickerOpenHandler.vue';
import N8nDateRangePickerTodayButton from './DateRangePickerTodayButton.vue';
import { formatMonthYearHeading, formatWeekdayTwoLetters } from './datePicker.utils';
import type { N8nDateRangePickerProps, N8nDateRangePickerRootEmits } from './index';

const props = withDefaults(defineProps<N8nDateRangePickerProps>(), {
	weekStartsOn: 1,
	weekdayFormat: 'short',
	fixedWeeks: true,
	hourCycle: 24,
});

const emit = defineEmits<N8nDateRangePickerRootEmits>();

defineSlots<{
	presets?: {};
	trigger?: {};
	footer?: { close: () => void };
}>();

const closePopover = () => emit('update:open', false);

const forwarded = useForwardPropsEmits(props, emit);
const activeCalendarField = ref<'start' | 'end'>('end');
const skipNextCellClick = ref(false);
provide(N8N_DATE_RANGE_PICKER_ACTIVE_FIELD, activeCalendarField);
provide(N8N_DATE_RANGE_PICKER_SKIP_NEXT_CELL_CLICK, skipNextCellClick);

function blurFocusedCalendarCell() {
	const active = document.activeElement;
	if (active instanceof HTMLElement && active.closest('[data-reka-calendar-cell-trigger]')) {
		active.blur();
	}
}

function markPageNavigation() {
	skipNextCellClick.value = true;
	nextTick(() => {
		blurFocusedCalendarCell();
	});
}
</script>

<template>
	<DateRangePickerRoot v-bind="forwarded">
		<N8nDateRangePickerOpenHandler />
		<DateRangePickerTrigger as-child>
			<slot name="trigger">
				<IconButton variant="subtle" icon="calendar" aria-label="Open calendar" />
			</slot>
		</DateRangePickerTrigger>

		<DateRangePickerContent align="start" :side-offset="5" :class="$style.PopoverContent">
			<DateRangePickerCalendar v-slot="{ weekDays, grid }" :class="$style.Calendar">
				<div :class="$style.PopoverInner" :data-active-field="activeCalendarField">
					<div v-if="!hideInputs" :class="$style.DateFieldWrapper">
						<N8nDateRangePickerField :class="$style.DateField"></N8nDateRangePickerField>
						<div :class="$style.DateFieldError">Outside of allowed range</div>
					</div>

					<DateRangePickerHeader :class="$style.CalendarHeader">
						<DateRangePickerHeading :class="$style.CalendarHeading" v-slot="{ headingValue }">
							{{
								formatMonthYearHeading(
									grid.map((month) => month.value),
									props.locale,
								) || headingValue
							}}
						</DateRangePickerHeading>
						<div :class="$style.CalendarHeaderActions">
							<N8nDateRangePickerTodayButton />
							<div :class="$style.CalendarPageNavigation" @click.capture="markPageNavigation">
								<DateRangePickerPrev as-child>
									<IconButton icon="chevron-left" variant="ghost" size="small" icon-size="large" />
								</DateRangePickerPrev>
								<DateRangePickerNext as-child>
									<IconButton icon="chevron-right" variant="ghost" size="small" icon-size="large" />
								</DateRangePickerNext>
							</div>
						</div>
					</DateRangePickerHeader>

					<N8nDateRangePickerCalendarWrapper>
						<DateRangePickerGrid
							v-for="month in grid"
							:key="month.value.toString()"
							:class="$style.CalendarGrid"
						>
							<DateRangePickerGridHead>
								<DateRangePickerGridRow :class="$style.CalendarGridRow">
									<DateRangePickerHeadCell
										v-for="day in weekDays"
										:key="day"
										:class="$style.CalendarHeadCell"
									>
										{{ formatWeekdayTwoLetters(day) }}
									</DateRangePickerHeadCell>
								</DateRangePickerGridRow>
							</DateRangePickerGridHead>
							<DateRangePickerGridBody>
								<DateRangePickerGridRow
									v-for="(weekDates, index) in month.rows"
									:key="`weekDate-${index}`"
									:class="$style.CalendarGridRow"
								>
									<DateRangePickerCell
										v-for="weekDate in weekDates"
										:key="weekDate.toString()"
										:date="weekDate"
										:class="$style.CalendarCell"
									>
										<DateRangePickerCellTrigger
											:day="weekDate"
											:month="month.value"
											:class="$style.CalendarCellTrigger"
										/>
									</DateRangePickerCell>
								</DateRangePickerGridRow>
							</DateRangePickerGridBody>
						</DateRangePickerGrid>
					</N8nDateRangePickerCalendarWrapper>

					<div v-if="!hideInputs" :class="$style.FooterWrapper">
						<slot name="footer" :close="closePopover">
							<N8nButton
								variant="subtle"
								size="small"
								label="Apply"
								:class="$style.FooterButton"
								@click="closePopover"
							/>
							<N8nDateRangePickerClearButton :class="$style.FooterButton" />
						</slot>
					</div>
				</div>
			</DateRangePickerCalendar>
		</DateRangePickerContent>
	</DateRangePickerRoot>
</template>

<style lang="css" module>
.DateFieldWrapper {
	border-bottom: 1px solid var(--color--foreground);
	width: 100%;
	padding-bottom: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
}

.DateField {
	width: 100%;
	min-width: 0;
}

.DateField[data-invalid] + .DateFieldError {
	display: block;
}

.DateFieldError {
	color: var(--color--danger);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	margin-top: 5px;
	display: none;
}

.FooterWrapper {
	border-top: 1px solid var(--color--foreground);
	width: 100%;
	padding-top: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.FooterButton {
	width: 100%;
}

.Calendar {
	display: flex;
}

.CalendarHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--2xs);
}

.CalendarHeading {
	font-weight: var(--font-weight--medium);
	font-size: var(--font-size--sm);
}

.CalendarHeaderActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.CalendarGrid {
	width: 100%;
	user-select: none;
	border-collapse: collapse;
}

.CalendarGridRow {
	display: grid;
	margin-bottom: 0.25rem;
	grid-template-columns: repeat(7, var(--date-range-picker--cell-size));
	width: fit-content;
}

.CalendarHeadCell {
	display: flex;
	width: var(--date-range-picker--cell-size);
	height: var(--date-range-picker--cell-size);
	align-items: center;
	justify-content: center;
	font-size: 0.75rem;
	line-height: 1rem;
	color: var(--color--text--tint-1);
	font-weight: 400;
}

.CalendarCell {
	position: relative;
	width: var(--date-range-picker--cell-size);
	height: var(--date-range-picker--cell-size);
	text-align: center;
}

.CalendarCellTrigger {
	display: flex;
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	position: relative;
	z-index: 1;
	padding: 0;
	justify-content: center;
	align-items: center;
	border: none;
	outline: none;
	font-weight: 400;
	white-space: nowrap;
	background-color: transparent;
	cursor: pointer;
	font-size: 14px;
	font-style: normal;
	line-height: normal;
	color: var(--color--text);
	border-radius: var(--radius--3xs);
}

.CalendarCellTrigger[data-outside-view] {
	color: var(--color--text--tint-1);
}

.CalendarCellTrigger:hover:not([data-disabled]):not([data-selection-start='true']):not(
		[data-selection-end='true']
	):not([data-selected='true']):not([data-today]) {
	background-color: var(--color--foreground--tint-1);
}

.CalendarCellTrigger[data-disabled] {
	cursor: not-allowed;
	color: var(--color--text--tint-1);
}

.CalendarCellTrigger[data-unavailable] {
	color: rgba(0, 0, 0, 0.3);
	text-decoration: line-through;
}

.CalendarCell:has([data-selected='true'])::before {
	content: '';
	position: absolute;
	inset: 0;
	z-index: 0;
	background: var(--color--foreground--tint-1);
	border-radius: 0;
}

/* Round the first selected cell in each row segment. */
.CalendarCell:has([data-selected='true']):not(
		.CalendarCell:has([data-selected='true']) + .CalendarCell:has([data-selected='true'])
	)::before {
	border-top-left-radius: var(--radius--3xs);
	border-bottom-left-radius: var(--radius--3xs);
}

/* Round the last selected cell in each row segment. */
.CalendarCell:has([data-selected='true']):not(
		:has(+ .CalendarCell [data-selected='true'])
	)::before {
	border-top-right-radius: var(--radius--3xs);
	border-bottom-right-radius: var(--radius--3xs);
}

.CalendarCellTrigger[data-selection-start='true'],
.CalendarCellTrigger[data-selection-end='true'] {
	background-color: var(--color--blue-100);
	color: var(--color--text);
	box-shadow: inset 0 0 0 2px var(--color--blue-400);
	border-radius: var(--radius--3xs);
}

.PopoverInner[data-active-field='start'] .CalendarCellTrigger[data-selection-start='true'] {
	background-color: var(--color--blue-200);
	box-shadow: inset 0 0 0 2px var(--color--blue-600);
}

.PopoverInner[data-active-field='end'] .CalendarCellTrigger[data-selection-end='true'] {
	background-color: var(--color--blue-200);
	box-shadow: inset 0 0 0 2px var(--color--blue-600);
}

.CalendarCellTrigger[data-today]:not([data-selection-start='true']):not(
		[data-selection-end='true']
	):not([data-selected='true']) {
	background-color: var(--color--primary);
	color: #fff;
	border-radius: 9999px;
	box-shadow: none;
}

/* reka-ui marks the month placeholder with data-focused — not a selection. */
.CalendarCellTrigger[data-focused]:not(:focus-visible):not([data-selection-start='true']):not(
		[data-selection-end='true']
	):not([data-selected='true']):not([data-today]) {
	background-color: transparent;
	box-shadow: none;
}

/* Keyboard-only focus — avoid styling the placeholder day after month navigation. */
.CalendarCellTrigger:focus-visible:not([data-selection-start='true']):not(
		[data-selection-end='true']
	):not([data-selected='true']):not([data-today]) {
	background-color: var(--color--foreground--tint-1);
	box-shadow: none;
}

.CalendarPageNavigation {
	display: contents;
}

.PopoverContent {
	--date-range-picker--cell-size: var(--spacing--xl);
	border-radius: 6px;
	padding: 10px;
	border: var(--border);
	background: var(--color--foreground--tint-2);
	box-shadow: 0 6px 16px 0 rgba(68, 28, 23, 0.06);
	animation-duration: 400ms;
	animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
	will-change: transform, opacity;
	width: fit-content;
	z-index: 9999;
}

.PopoverInner {
	width: calc(7 * var(--date-range-picker--cell-size));
}

.PopoverContent[data-state='open'][data-side='top'] {
	animation-name: slideDownAndFade;
}
.PopoverContent[data-state='open'][data-side='right'] {
	animation-name: slideLeftAndFade;
}
.PopoverContent[data-state='open'][data-side='bottom'] {
	animation-name: slideUpAndFade;
}
.PopoverContent[data-state='open'][data-side='left'] {
	animation-name: slideRightAndFade;
}

.Presets {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 12px;
	border-right: var(--border);
}

@keyframes slideUpAndFade {
	from {
		opacity: 0;
		transform: translateY(2px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes slideRightAndFade {
	from {
		opacity: 0;
		transform: translateX(-2px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}

@keyframes slideDownAndFade {
	from {
		opacity: 0;
		transform: translateY(-2px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes slideLeftAndFade {
	from {
		opacity: 0;
		transform: translateX(2px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}
</style>
