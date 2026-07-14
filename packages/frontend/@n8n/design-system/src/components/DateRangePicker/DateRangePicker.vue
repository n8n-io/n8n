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
import { computed, nextTick, provide, ref, toRef } from 'vue';

import N8nButton from '../N8nButton';
import IconButton from '../N8nIconButton';
import N8nDateRangePickerCalendarWrapper from './DateRangePickerCalendarWrapper.vue';
import N8nDateRangePickerClearButton from './DateRangePickerClearButton.vue';
import N8nDateRangePickerField from './DateRangePickerField.vue';
import { N8N_DATE_RANGE_PICKER_CONTEXT } from './dateRangePicker.context';
import N8nDateRangePickerOpenHandler from './DateRangePickerOpenHandler.vue';
import N8nDateRangePickerTodayButton from './DateRangePickerTodayButton.vue';
import { formatMonthYearHeading } from './datePicker.utils';
import type { N8nDateRangePickerProps, N8nDateRangePickerRootEmits } from './index';

const props = withDefaults(defineProps<N8nDateRangePickerProps>(), {
	weekStartsOn: 1,
	weekdayFormat: 'short',
	fixedWeeks: true,
	hourCycle: 24,
	hideInputs: false,
	single: false,
	showTime: false,
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
const showInputs = computed(() => !props.hideInputs);
const effectiveGranularity = computed(() => {
	if (props.showTime) return props.granularity ?? 'minute';
	return props.granularity;
});
provide(N8N_DATE_RANGE_PICKER_CONTEXT, {
	activeField: activeCalendarField,
	skipNextCellClick,
	single: toRef(props, 'single'),
	showTime: toRef(props, 'showTime'),
});

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
	<DateRangePickerRoot v-bind="forwarded" :granularity="effectiveGranularity">
		<N8nDateRangePickerOpenHandler />
		<DateRangePickerTrigger as-child>
			<slot name="trigger">
				<IconButton variant="subtle" icon="calendar" aria-label="Open calendar" />
			</slot>
		</DateRangePickerTrigger>

		<DateRangePickerContent align="start" :side-offset="5" :class="$style.PopoverContent">
			<DateRangePickerCalendar v-slot="{ weekDays, grid }" :class="$style.Calendar">
				<div
					:class="[$style.PopoverInner, showTime && $style.PopoverInnerWithTime]"
					:data-active-field="activeCalendarField"
				>
					<div v-if="showInputs" :class="$style.DateFieldWrapper">
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
								<DateRangePickerGridRow
									:class="[$style.CalendarGridRow, $style.CalendarGridHeadRow]"
								>
									<DateRangePickerHeadCell
										v-for="day in weekDays"
										:key="day"
										:class="$style.CalendarHeadCell"
									>
										{{ day.slice(0, 2) }}
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

					<div v-if="showInputs" :class="$style.FooterWrapper">
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
	color: var(--text-color--danger);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	margin-top: var(--spacing--3xs);
	display: none;
}

.FooterWrapper {
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
	margin-bottom: var(--spacing--4xs);
	grid-template-columns: repeat(7, var(--date-range-picker--cell-size));
	width: fit-content;
}

.CalendarGridHeadRow {
	margin-bottom: 0;
}

.CalendarHeadCell {
	display: flex;
	width: var(--date-range-picker--cell-size);
	height: var(--spacing--lg);
	align-items: center;
	justify-content: center;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
	color: var(--text-color--subtler);
	font-weight: var(--font-weight--regular);
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
	font-weight: var(--font-weight--regular);
	white-space: nowrap;
	background-color: transparent;
	cursor: pointer;
	font-size: var(--font-size--xs);
	font-style: normal;
	line-height: normal;
	color: var(--text-color);
	border-radius: var(--radius--2xs);
}

.CalendarCellTrigger[data-outside-view] {
	color: var(--text-color--subtler);
}

.CalendarCellTrigger:hover:not([data-disabled]):not([data-selection-start='true']):not(
		[data-selection-end='true']
	):not([data-selected='true']):not([data-today]) {
	background-color: var(--background--hover);
}

.CalendarCellTrigger[data-disabled] {
	cursor: not-allowed;
	color: var(--text-color--subtler);
}

.CalendarCellTrigger[data-unavailable] {
	color: light-dark(var(--color--black-alpha-300), var(--color--white-alpha-300));
	text-decoration: line-through;
}

.CalendarCell:has([data-selected='true'])::before {
	content: '';
	position: absolute;
	inset: 0;
	z-index: 0;
	background: var(--background--hover);
	border-radius: 0;
}

/* Round the first selected cell in each row segment. */
.CalendarCell:has([data-selected='true']):not(
		.CalendarCell:has([data-selected='true']) + .CalendarCell:has([data-selected='true'])
	)::before {
	border-top-left-radius: var(--radius--2xs);
	border-bottom-left-radius: var(--radius--2xs);
}

/* Round the last selected cell in each row segment. */
.CalendarCell:has([data-selected='true']):not(
		:has(+ .CalendarCell [data-selected='true'])
	)::before {
	border-top-right-radius: var(--radius--2xs);
	border-bottom-right-radius: var(--radius--2xs);
}

.CalendarCellTrigger[data-selection-start='true'],
.CalendarCellTrigger[data-selection-end='true'] {
	background-color: var(--color--purple-500);
	color: var(--color--neutral-white);
	box-shadow: none;
	border-radius: var(--radius--2xs);
}

.PopoverInner[data-active-field='start'] .CalendarCellTrigger[data-selection-start='true'] {
	background-color: var(--color--purple-600);
}

.PopoverInner[data-active-field='end'] .CalendarCellTrigger[data-selection-end='true'] {
	background-color: var(--color--purple-600);
}

.CalendarCellTrigger[data-today]:not([data-selection-start='true']):not(
		[data-selection-end='true']
	):not([data-selected='true']) {
	background-color: var(--background--brand);
	color: var(--color--neutral-white);
	border-radius: var(--radius--full);
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
	background-color: var(--background--hover);
	box-shadow: none;
}

.CalendarPageNavigation {
	display: contents;
}

.PopoverContent {
	--date-range-picker--cell-size: var(--spacing--xl);
	border-radius: var(--radius--2xs);
	padding: var(--spacing--xs);
	border: var(--border);
	background: var(--background--surface);
	box-shadow: var(--shadow--sm);
	animation-duration: var(--duration--base);
	animation-timing-function: var(--easing--ease-out);
	will-change: transform, opacity;
	width: fit-content;
	z-index: 9999;
}

.PopoverInner {
	width: calc(7 * var(--date-range-picker--cell-size));
}

.PopoverInnerWithTime {
	width: max(calc(7 * var(--date-range-picker--cell-size)), 18rem);
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
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	border-right: var(--border);
}

@keyframes slideUpAndFade {
	from {
		opacity: 0;
		transform: translateY(var(--spacing--5xs));
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes slideRightAndFade {
	from {
		opacity: 0;
		transform: translateX(calc(-1 * var(--spacing--5xs)));
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}

@keyframes slideDownAndFade {
	from {
		opacity: 0;
		transform: translateY(calc(-1 * var(--spacing--5xs)));
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes slideLeftAndFade {
	from {
		opacity: 0;
		transform: translateX(var(--spacing--5xs));
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}
</style>
