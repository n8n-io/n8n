<script lang="ts" setup>
import { reactiveOmit } from '@vueuse/core';
import type { DateValue } from '@internationalized/date';
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
	injectDateRangePickerRootContext,
	useForwardPropsEmits,
	type DateRange,
} from 'reka-ui';
import { computed, defineComponent, nextTick, provide, ref, shallowRef, toRef, watch } from 'vue';

import N8nButton from '../N8nButton';
import IconButton from '../N8nIconButton';
import N8nDateRangePickerDayButton from './DateRangePickerDayButton.vue';
import N8nDateRangePickerField from './DateRangePickerField.vue';
import {
	N8N_DATE_RANGE_PICKER_CONTEXT,
	type DateRangePickerRekaRoot,
	useDateRangePickerContext,
} from './dateRangePicker.context';
import N8nDateRangePickerTodayButton from './DateRangePickerTodayButton.vue';
import {
	createTodayRange,
	formatMonthYearHeading,
	isEmptyDateRange,
	mergeDatePreservingTime,
	resolveDateSelection,
	type DatePickerHourCycle,
} from './datePicker.utils';
import type { N8nDateRangePickerProps, N8nDateRangePickerRootEmits } from './index';

/** Captures reka root context for the parent (must render under DateRangePickerRoot). */
const DateRangePickerRekaBridge = defineComponent({
	name: 'DateRangePickerRekaBridge',
	setup() {
		const { rekaRoot } = useDateRangePickerContext();
		rekaRoot.value = injectDateRangePickerRootContext();
		return () => null;
	},
});

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
	footer?: { apply: () => void; close: () => void };
}>();

function copyRange(range?: DateRange | null): DateRange {
	return {
		start: range?.start?.copy(),
		end: range?.end?.copy(),
	};
}

function getCommittedRange(): DateRange {
	if (props.modelValue !== undefined) {
		return copyRange(props.modelValue);
	}

	return copyRange(uncontrolledValue.value);
}

/** Uncontrolled committed value (ignored when `modelValue` is provided). */
const uncontrolledValue = shallowRef(copyRange(props.defaultValue));
/** Working selection while the popover is open — not emitted until Apply. */
const draftRange = shallowRef(getCommittedRange());
const applyOnClose = ref(false);

const closePopover = () => {
	if (rekaRoot.value) {
		rekaRoot.value.open.value = false;
	} else {
		emit('update:open', false);
	}
};

/** Commit the draft and close. */
function applyAndClose() {
	applyOnClose.value = true;
	closePopover();
}

/** Close without committing (outside click / Escape / footer close). */
function dismissPopover() {
	applyOnClose.value = false;
	closePopover();
}

function onDraftUpdate(value: DateRange) {
	const previous = draftRange.value;
	let start = value.start?.copy();
	let end = value.end?.copy();

	// Reka re-attaches the previous end when we clear it for a pending start.
	// Drop that stale end while we're awaiting the end click.
	if (
		!props.single &&
		activeCalendarField.value === 'end' &&
		start &&
		end &&
		previous.start &&
		!previous.end &&
		start.compare(previous.start) === 0
	) {
		end = undefined;
	}

	if (props.showTime) {
		if (start) {
			start = mergeDatePreservingTime(start, previous.start ?? previous.end);
		}
		if (end) {
			// Completing a range: prefer the previous end time, else the start time.
			end = mergeDatePreservingTime(end, previous.end ?? previous.start ?? start);
		}
	}

	if (props.single && start) {
		end = start.copy();
	}

	draftRange.value = { start, end };
}

/** Next calendar click always starts a new start → end → start → end cycle. */
function resetSelectionStep() {
	activeCalendarField.value = 'start';
}

const forwarded = useForwardPropsEmits(
	// Force readonly below — omit so a consumer prop can't re-enable Reka selection.
	reactiveOmit(props, ['modelValue', 'defaultValue', 'readonly']),
	(event, ...args) => {
		if (event === 'update:modelValue') {
			onDraftUpdate(args[0] as DateRange);
			return;
		}

		emit(event, ...args);
	},
);
const activeCalendarField = ref<'start' | 'end'>('start');
const skipNextCellClick = ref(false);
const rekaRoot = shallowRef<DateRangePickerRekaRoot | null>(null);
const showInputs = computed(() => !props.hideInputs);
const hourCycle = computed<DatePickerHourCycle>(() => (props.hourCycle === 12 ? 12 : 24));
const effectiveGranularity = computed(() => {
	if (props.showTime) return props.granularity ?? 'minute';
	return props.granularity;
});
/** Lets Reka paint the hover preview while a complete range is selected (selection stays ours). */
const calendarFixedDate = computed<'start' | 'end' | undefined>(() => {
	if (props.single) return undefined;
	return activeCalendarField.value === 'start' ? 'end' : 'start';
});
provide(N8N_DATE_RANGE_PICKER_CONTEXT, {
	activeField: activeCalendarField,
	single: toRef(props, 'single'),
	showTime: toRef(props, 'showTime'),
	hourCycle,
	rekaRoot,
});

watch(
	() => props.modelValue,
	(value) => {
		if (value === undefined) return;

		const next = copyRange(value);
		if (!rekaRoot.value?.open.value) {
			draftRange.value = next;
			return;
		}

		// Parent updated the value while open (e.g. presets) — keep the draft in sync.
		draftRange.value = next;
	},
);

watch(
	() => rekaRoot.value?.open.value,
	(isOpen, wasOpen) => {
		const rootContext = rekaRoot.value;
		if (!rootContext) return;

		if (!isOpen) {
			if (wasOpen !== true) return;

			if (applyOnClose.value) {
				const applied = copyRange(draftRange.value);
				if (props.modelValue === undefined) {
					uncontrolledValue.value = applied;
				}
				emit('update:modelValue', applied);
				applyOnClose.value = false;
			} else {
				draftRange.value = getCommittedRange();
			}

			resetSelectionStep();
			return;
		}

		applyOnClose.value = false;
		draftRange.value = getCommittedRange();

		if (!isEmptyDateRange(draftRange.value)) {
			const start = draftRange.value.start;
			if (start) {
				rootContext.onPlaceholderChange(start.copy());
			}
			resetSelectionStep();
			return;
		}

		const todayRange = createTodayRange({
			granularity: rootContext.granularity.value,
			referenceStart: draftRange.value.start,
			minValue: rootContext.minValue.value,
			maxValue: rootContext.maxValue.value,
			isDateUnavailable: rootContext.isDateUnavailable,
		});

		if (!todayRange) return;

		draftRange.value = {
			start: todayRange.start.copy(),
			end: todayRange.end.copy(),
		};
		rootContext.onPlaceholderChange(todayRange.start.copy());
		resetSelectionStep();
	},
);

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

function isDateDisabledOrUnavailable(date: DateValue): boolean {
	const rootContext = rekaRoot.value;
	if (!rootContext) return true;

	if (rootContext.isDateUnavailable?.(date)) return true;
	if (rootContext.minValue.value && date.compare(rootContext.minValue.value) < 0) return true;
	if (rootContext.maxValue.value && rootContext.maxValue.value.compare(date) < 0) return true;
	return false;
}

function shouldSkipPlaceholderDate(date: DateValue): boolean {
	if (!skipNextCellClick.value) return false;

	const rootContext = rekaRoot.value;
	if (!rootContext) return false;

	return date.compare(rootContext.placeholder.value) === 0;
}

function applySelection(selectedDate: DateValue) {
	const rootContext = rekaRoot.value;
	if (!rootContext) return;

	const selection = resolveDateSelection({
		selected: selectedDate,
		range: draftRange.value,
		selectionStep: activeCalendarField.value,
		single: props.single,
		preserveTime: props.showTime,
	});

	// Advance the step before model updates so onDraftUpdate can ignore stale ends.
	activeCalendarField.value = selection.nextSelectionStep;
	draftRange.value = {
		start: selection.range.start?.copy(),
		end: selection.range.end?.copy(),
	};
	rootContext.onDateChange(selection.range);
	// reka's modelValue watcher resets placeholder → start; restore after it runs.
	void nextTick(() => {
		rootContext.onPlaceholderChange(selectedDate.copy());
	});
}

function selectCalendarDay(date: DateValue) {
	if (isDateDisabledOrUnavailable(date)) return;

	if (shouldSkipPlaceholderDate(date)) {
		skipNextCellClick.value = false;
		return;
	}

	if (skipNextCellClick.value) {
		skipNextCellClick.value = false;
	}

	applySelection(date);
}

/** Keyboard nav still focuses Reka's CellTrigger — intercept Enter/Space before it. */
function handleCellKeydown(date: DateValue, event: KeyboardEvent) {
	if (event.key !== 'Enter' && event.key !== ' ') return;
	event.preventDefault();
	event.stopImmediatePropagation();
	selectCalendarDay(date);
}
</script>

<template>
	<DateRangePickerRoot
		v-bind="forwarded"
		:model-value="draftRange"
		:granularity="effectiveGranularity"
		:readonly="true"
		:fixed-date="calendarFixedDate"
		prevent-deselect
	>
		<DateRangePickerRekaBridge />
		<DateRangePickerTrigger as-child>
			<slot name="trigger">
				<IconButton variant="subtle" icon="calendar" aria-label="Open calendar" />
			</slot>
		</DateRangePickerTrigger>

		<DateRangePickerContent align="start" :side-offset="5" :class="$style.PopoverContent">
			<DateRangePickerCalendar v-slot="{ weekDays, grid }" :class="$style.Calendar">
				<div :class="$style.PopoverInner" :data-active-field="activeCalendarField">
					<div v-if="$slots.presets" :class="$style.Presets">
						<slot name="presets" />
					</div>

					<div v-if="showInputs" :class="$style.DateFieldWrapper">
						<N8nDateRangePickerField />
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

					<DateRangePickerGrid
						v-for="month in grid"
						:key="month.value.toString()"
						:class="$style.CalendarGrid"
					>
						<DateRangePickerGridHead>
							<DateRangePickerGridRow :class="[$style.CalendarGridRow, $style.CalendarGridHeadRow]">
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
									<!--
										CellTrigger is display-only (readonly + pointer-events: none).
										DayButton owns clicks/hover so Reka never resets the range and
										hover preview still updates via focusedValue.
									-->
									<div
										:class="$style.CalendarCellHitArea"
										@keydown.capture="handleCellKeydown(weekDate, $event)"
									>
										<DateRangePickerCellTrigger
											:day="weekDate"
											:month="month.value"
											:class="$style.CalendarCellTrigger"
										/>
										<N8nDateRangePickerDayButton
											:day="weekDate"
											:class="$style.CalendarCellButton"
											:disabled="isDateDisabledOrUnavailable(weekDate)"
											@select="selectCalendarDay(weekDate)"
										/>
									</div>
								</DateRangePickerCell>
							</DateRangePickerGridRow>
						</DateRangePickerGridBody>
					</DateRangePickerGrid>

					<div v-if="showInputs" :class="$style.FooterWrapper">
						<slot name="footer" :apply="applyAndClose" :close="dismissPopover">
							<N8nButton
								variant="subtle"
								size="small"
								label="Apply"
								:class="$style.FooterButton"
								@click="applyAndClose"
							/>
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
	margin-bottom: var(--spacing--2xs);
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

.CalendarCellHitArea {
	position: relative;
	width: 100%;
	height: 100%;
}

.CalendarCellButton {
	position: absolute;
	inset: 0;
	z-index: 2;
	margin: 0;
	padding: 0;
	border: none;
	border-radius: var(--radius--2xs);
	background: transparent;
	cursor: pointer;
}

.CalendarCellButton:disabled {
	cursor: not-allowed;
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
	pointer-events: none;
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
	background-color: var(--color--danger);
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
