<script lang="ts" setup>
import { reactiveOmit } from '@vueuse/core';
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
import { computed, defineComponent, provide, ref, shallowRef, toRef, watch } from 'vue';

import N8nButton from '../N8nButton';
import IconButton from '../N8nIconButton';
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

	if (props.showTime) {
		if (start) {
			start = mergeDatePreservingTime(start, previous.start ?? previous.end);
		}
		if (end) {
			end = mergeDatePreservingTime(end, previous.end ?? previous.start ?? start);
		}
	}

	if (props.single && start) {
		end = start.copy();
	}

	draftRange.value = { start, end };
}

const forwarded = useForwardPropsEmits(
	reactiveOmit(props, ['modelValue', 'defaultValue']),
	(event, ...args) => {
		if (event === 'update:modelValue') {
			onDraftUpdate(args[0] as DateRange);
			return;
		}

		emit(event, ...args);
	},
);
const rekaRoot = shallowRef<DateRangePickerRekaRoot | null>(null);
const showInputs = computed(() => !props.hideInputs);
const hourCycle = computed<DatePickerHourCycle>(() => (props.hourCycle === 12 ? 12 : 24));
const effectiveGranularity = computed(() => {
	if (props.showTime) return props.granularity ?? 'minute';
	return props.granularity;
});
provide(N8N_DATE_RANGE_PICKER_CONTEXT, {
	single: toRef(props, 'single'),
	showTime: toRef(props, 'showTime'),
	hourCycle,
	rekaRoot,
});

watch(
	() => props.modelValue,
	(value) => {
		if (value === undefined) return;

		draftRange.value = copyRange(value);
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

			return;
		}

		applyOnClose.value = false;
		draftRange.value = getCommittedRange();

		if (!isEmptyDateRange(draftRange.value)) {
			const start = draftRange.value.start;
			if (start) {
				rootContext.onPlaceholderChange(start.copy());
			}
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
	},
);
</script>

<template>
	<DateRangePickerRoot
		v-bind="forwarded"
		:model-value="draftRange"
		:granularity="effectiveGranularity"
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
				<div :class="$style.PopoverInner">
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
							<div :class="$style.CalendarPageNavigation">
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
									<DateRangePickerCellTrigger
										:day="weekDate"
										:month="month.value"
										:class="$style.CalendarCellTrigger"
									/>
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
	column-gap: var(--date-range-picker--cell-gap);
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
	font-size: var(--font-size--xs);
	font-style: normal;
	line-height: normal;
	color: var(--text-color);
	border-radius: var(--radius--2xs);
	cursor: pointer;
}

.CalendarCellTrigger[data-outside-view] {
	color: var(--text-color--subtler);
}

.CalendarCellTrigger[data-disabled] {
	cursor: not-allowed;
	color: var(--text-color--subtler);
}

.CalendarCellTrigger[data-unavailable] {
	color: light-dark(var(--color--black-alpha-300), var(--color--white-alpha-300));
	text-decoration: line-through;
}

.CalendarCell:has([data-selected='true'])::before,
.CalendarCell:has([data-highlighted])::before {
	content: '';
	position: absolute;
	top: 0;
	bottom: 0;
	/* Bridge the column gap so the range fill stays continuous. */
	left: calc(var(--date-range-picker--cell-gap) / -2);
	right: calc(var(--date-range-picker--cell-gap) / -2);
	z-index: 0;
	background: var(--color--purple-100);
	border-radius: 0;
}

/* Round / clip the first cell in each row segment (not range endpoints — those half-bleed). */
.CalendarCell:has([data-selected='true']):not(
		.CalendarCell:has([data-selected='true']) + .CalendarCell:has([data-selected='true'])
	):not(:has([data-selection-start='true']:not([data-selection-end='true'])))::before,
.CalendarCell:has([data-highlighted]):not(
		.CalendarCell:has([data-highlighted]) + .CalendarCell:has([data-highlighted])
	):not(:has([data-highlighted-start='true']:not([data-highlighted-end='true'])))::before {
	left: 0;
	border-top-left-radius: var(--radius--2xs);
	border-bottom-left-radius: var(--radius--2xs);
}

/* Round / clip the last cell in each row segment (not range endpoints — those half-bleed). */
.CalendarCell:has([data-selected='true']):not(:has(+ .CalendarCell [data-selected='true'])):not(
		:has([data-selection-end='true']:not([data-selection-start='true']))
	):not(:has([data-selection-start='true']:not([data-selection-end='true'])))::before,
.CalendarCell:has([data-highlighted]):not(:has(+ .CalendarCell [data-highlighted])):not(
		:has([data-highlighted-end='true']:not([data-highlighted-start='true']))
	)::before {
	right: 0;
	border-top-right-radius: var(--radius--2xs);
	border-bottom-right-radius: var(--radius--2xs);
}

/*
 * Bleed the range band under half of the start/end cell so it meets the
 * endpoint fill across the column gap instead of stopping at the cell edge.
 * While the end date is still being chosen, start is the only `data-selected`
 * cell — the rules above explicitly skip it so this bleed can keep the gap filled.
 */
.CalendarCell:has([data-selection-start='true']:not([data-selection-end='true']))::before,
.CalendarCell:has([data-highlighted-start='true']:not([data-highlighted-end='true']))::before {
	left: 50%;
	right: calc(var(--date-range-picker--cell-gap) / -2);
	border-radius: 0;
}

.CalendarCell:has([data-selection-end='true']:not([data-selection-start='true']))::before,
.CalendarCell:has([data-highlighted-end='true']:not([data-highlighted-start='true']))::before {
	left: calc(var(--date-range-picker--cell-gap) / -2);
	right: 50%;
	border-radius: 0;
}

.CalendarCell:has([data-selection-start='true'][data-selection-end='true'])::before,
.CalendarCell:has([data-highlighted-start='true'][data-highlighted-end='true'])::before {
	display: none;
}

.CalendarCellTrigger[data-highlighted-start='true'],
.CalendarCellTrigger[data-highlighted-end='true'] {
	background-color: var(--color--purple-100);
	color: var(--text-color);
	border-radius: var(--radius--2xs);
}

.CalendarCellTrigger[data-selection-start='true'],
.CalendarCellTrigger[data-selection-end='true'] {
	background-color: var(--color--purple-500);
	color: var(--color--neutral-white);
	border-radius: var(--radius--2xs);
}

.CalendarCellTrigger[data-today]:not([data-selection-start='true']):not(
		[data-selection-end='true']
	):not([data-selected='true']) {
	color: var(--color--neutral-white);
}

/* Orange today marker sits inside the cell so the cell/hover ring stay square. */
.CalendarCellTrigger[data-today]:not([data-selection-start='true']):not(
		[data-selection-end='true']
	):not([data-selected='true'])::before {
	content: '';
	position: absolute;
	inset: var(--spacing--5xs);
	z-index: -1;
	border-radius: var(--radius--full);
	background-color: var(--color--orange-500);
	pointer-events: none;
}

/* Hover: light purple fill + purple ring (selected endpoints keep their deep fill). */
.CalendarCellTrigger:hover:not([data-disabled]):not([data-selection-start='true']):not(
		[data-selection-end='true']
	) {
	background-color: var(--color--purple-100);
	box-shadow: inset 0 0 0 2px var(--color--purple-500);
}

.CalendarCellTrigger[data-selection-start='true']:hover:not([data-disabled]),
.CalendarCellTrigger[data-selection-end='true']:hover:not([data-disabled]) {
	box-shadow: inset 0 0 0 2px var(--color--purple-500);
}

/* reka-ui marks the month placeholder with data-focused — not a selection. */
.CalendarCellTrigger[data-focused]:not(:focus-visible):not([data-selection-start='true']):not(
		[data-selection-end='true']
	):not([data-selected='true']):not([data-today]):not(:hover) {
	background-color: transparent;
	box-shadow: none;
}

.CalendarCellTrigger:focus-visible:not([data-disabled]) {
	box-shadow: inset 0 0 0 2px var(--color--purple-500);
}

.CalendarPageNavigation {
	display: contents;
}

.PopoverContent {
	--date-range-picker--cell-size: var(--spacing--xl);
	--date-range-picker--cell-gap: var(--spacing--5xs);
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
	width: calc(7 * var(--date-range-picker--cell-size) + 6 * var(--date-range-picker--cell-gap));
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
