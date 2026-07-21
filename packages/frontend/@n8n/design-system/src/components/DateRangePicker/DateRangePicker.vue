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
	useForwardProps,
	type DateRange,
	type DateValue,
} from 'reka-ui';
import { nextTick, provide, ref, shallowRef, toRef, useSlots, watch, computed } from 'vue';

import N8nButton from '../N8nButton';
import IconButton from '../N8nIconButton';
import { useI18n } from '../../composables/useI18n';
import DateRangePickerDateTimeField from './DateRangePickerDateTimeField.vue';
import DateRangePickerPresets from './DateRangePickerPresets.vue';
import {
	N8N_DATE_RANGE_PICKER_CONTEXT,
	type DateRangePickerActiveField,
} from './dateRangePicker.context';
import {
	createTodayRange,
	formatMonthYearHeading,
	getTodayDateValue,
	isDateSelectable,
	isEmptyDateRange,
	mergeDatePreservingTime,
	resolveShowTimeDraftValue,
} from './datePicker.utils';
import type { N8nDateRangePickerProps, N8nDateRangePickerRootEmits } from './index';

const props = withDefaults(defineProps<N8nDateRangePickerProps>(), {
	weekStartsOn: 1,
	weekdayFormat: 'short',
	fixedWeeks: true,
	hourCycle: 24,
	hideInputs: false,
	hideToday: false,
	single: false,
	showTime: false,
	presets: undefined,
});

const emit = defineEmits<N8nDateRangePickerRootEmits>();
const { t } = useI18n();
const slots = useSlots();

defineSlots<{
	presets?: {};
	trigger?: {};
	footer?: { apply: () => void; close: () => void };
}>();

const presetsContainerRef = ref<HTMLElement | null>(null);

function hasPresetsSidebar() {
	return Boolean(slots.presets) || (props.presets?.length ?? 0) > 0;
}

function onPresetSelect(value: string | number) {
	emit('select', value);
}

function onOpenAutoFocus(event: Event) {
	if (!hasPresetsSidebar()) return;

	event.preventDefault();

	void nextTick(() => {
		const presetToFocus =
			presetsContainerRef.value?.querySelector<HTMLElement>('[tabindex="0"]') ??
			presetsContainerRef.value?.querySelector<HTMLElement>(
				'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
			);

		presetToFocus?.focus();
	});
}

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

const uncontrolledValue = shallowRef(copyRange(props.defaultValue));

const draftRange = shallowRef(getCommittedRange());

const applyOnClose = ref(false);

const isOpen = ref(props.open ?? props.defaultOpen ?? false);

const calendarPlaceholder = shallowRef<DateValue>(
	props.placeholder ??
		getTodayDateValue({
			granularity: props.showTime ? (props.granularity ?? 'minute') : props.granularity,
		}),
);

function setOpen(open: boolean) {
	isOpen.value = open;
	emit('update:open', open);
}

function applyAndClose() {
	applyOnClose.value = true;
	setOpen(false);
}

function dismissPopover() {
	applyOnClose.value = false;
	setOpen(false);
}

function goToToday() {
	const todayDate = getTodayDateValue({
		granularity: getEffectiveGranularity(),
	});

	calendarPlaceholder.value = todayDate.copy();

	if (
		!isDateSelectable(todayDate, {
			minValue: props.minValue,
			maxValue: props.maxValue,
			isDateUnavailable: props.isDateUnavailable,
		})
	) {
		return;
	}

	const { start: previousStart, end: previousEnd } = draftRange.value;
	const nextStart = props.showTime
		? mergeDatePreservingTime(todayDate, previousStart)
		: todayDate.copy();
	const nextEnd = props.showTime
		? mergeDatePreservingTime(todayDate, previousEnd ?? previousStart)
		: todayDate.copy();

	draftRange.value = { start: nextStart, end: nextEnd };

	void nextTick(() => {
		calendarPlaceholder.value = todayDate.copy();
	});
}

function onDraftUpdate(value: DateRange) {
	const previous = draftRange.value;
	let start = value.start?.copy();
	let end = value.end?.copy();

	if (props.showTime) {
		if (start) {
			start = resolveShowTimeDraftValue(start, previous.start ?? previous.end);
		}
		if (end) {
			end = resolveShowTimeDraftValue(end, previous.end ?? previous.start ?? start);
		}
	}

	if (props.single && start) {
		const nextStart = start.copy();
		// Complete immediately when the calendar already gave us a same-day range.
		if (end && nextStart.compare(end) === 0) {
			draftRange.value = { start: nextStart, end: nextStart.copy() };
			releaseFieldSelectionLock();
			return;
		}

		// reka-ui clears `endValue` on the next click while keeping the previous
		// complete range as the modelValue watcher's "prev". That watcher only
		// assigns `endValue` when prev had no end, so a one-shot { start, end }
		// update leaves endValue unset and hover shows a range preview.
		// Force an incomplete → complete transition so endValue syncs.
		draftRange.value = { start: nextStart, end: undefined };
		void nextTick(() => {
			draftRange.value = { start: nextStart.copy(), end: nextStart.copy() };
			releaseFieldSelectionLock();
		});
		return;
	}

	draftRange.value = { start, end };
	releaseFieldSelectionLock();
}

function onOpenUpdate(value: boolean) {
	isOpen.value = value;
	emit('update:open', value);
}

function onPlaceholderUpdate(date: DateValue) {
	calendarPlaceholder.value = date.copy();
	emit('update:placeholder', date);
}

function onStartValueUpdate(date: DateValue | undefined) {
	emit('update:startValue', date);
}

const forwarded = useForwardProps(
	reactiveOmit(props, [
		'modelValue',
		'defaultValue',
		'open',
		'defaultOpen',
		'placeholder',
		'defaultPlaceholder',
		'presets',
		'hideInputs',
		'hideToday',
		'single',
		'showTime',
		'hourCycle',
	]),
);

function getEffectiveGranularity() {
	if (props.showTime) return props.granularity ?? 'minute';
	return props.granularity;
}

const activeField = ref<DateRangePickerActiveField>('start');
const inputFieldFocused = ref(false);
/**
 * When set by focusing a date field, calendar clicks update that field
 * (`fixedDate`). Kept across input blur so a following day click still
 * targets the same slot (blur+commit must not clear it).
 */
const fieldSelectionLocked = ref(false);
let ignoreNextDraftSync = false;

function getSelectionActiveField(): DateRangePickerActiveField {
	if (props.single) return 'start';
	const { start, end } = draftRange.value;
	return start && !end ? 'end' : 'start';
}

function syncActiveFieldFromSelection() {
	activeField.value = getSelectionActiveField();
}

function setActiveField(field: DateRangePickerActiveField) {
	inputFieldFocused.value = true;
	activeField.value = field;
	fieldSelectionLocked.value = true;

	// Incomplete range + focusing start: promote to a same-day range so
	// `fixedDate` can retarget the next calendar click to the start slot.
	if (!props.single && field === 'start' && draftRange.value.start && !draftRange.value.end) {
		ignoreNextDraftSync = true;
		draftRange.value = {
			start: draftRange.value.start.copy(),
			end: draftRange.value.start.copy(),
		};
	}
}

function clearActiveFieldFocus() {
	inputFieldFocused.value = false;
}

function releaseFieldSelectionLock() {
	if (!fieldSelectionLocked.value || inputFieldFocused.value) return;

	fieldSelectionLocked.value = false;
	syncActiveFieldFromSelection();
}

/** Pin the opposite end so calendar clicks update the locked/focused field. */
const fixedDate = computed(() => {
	if (props.single) return undefined;
	if (!draftRange.value.start || !draftRange.value.end) return undefined;
	if (!fieldSelectionLocked.value) return undefined;
	return activeField.value === 'start' ? 'end' : 'start';
});

provide(N8N_DATE_RANGE_PICKER_CONTEXT, {
	single: toRef(props, 'single'),
	showTime: toRef(props, 'showTime'),
	hourCycle: toRef(props, 'hourCycle'),
	activeField,
	setActiveField,
	clearActiveFieldFocus,
});

watch(draftRange, () => {
	if (ignoreNextDraftSync) {
		ignoreNextDraftSync = false;
		return;
	}

	// Do not clear `fieldSelectionLocked` here — input blur commits the
	// current value and would unlock before the calendar click runs.
	if (!fieldSelectionLocked.value && !inputFieldFocused.value) {
		syncActiveFieldFromSelection();
	}
});
watch(
	() => props.modelValue,
	(value) => {
		if (value === undefined) return;

		draftRange.value = copyRange(value);
	},
);

watch(
	() => props.open,
	(value) => {
		if (value === undefined) return;
		isOpen.value = value;
	},
);

watch(isOpen, (open, wasOpen) => {
	if (!open) {
		if (wasOpen !== true) return;

		inputFieldFocused.value = false;
		fieldSelectionLocked.value = false;
		activeField.value = 'start';

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
	syncActiveFieldFromSelection();

	if (!isEmptyDateRange(draftRange.value)) {
		const start = draftRange.value.start;
		if (start) {
			calendarPlaceholder.value = start.copy();
		}
		return;
	}

	const todayRange = createTodayRange({
		granularity: getEffectiveGranularity(),
		referenceStart: draftRange.value.start,
		minValue: props.minValue,
		maxValue: props.maxValue,
		isDateUnavailable: props.isDateUnavailable,
	});

	if (!todayRange) return;

	draftRange.value = {
		start: todayRange.start.copy(),
		end: todayRange.end.copy(),
	};
	calendarPlaceholder.value = todayRange.start.copy();
	syncActiveFieldFromSelection();
});
</script>

<template>
	<DateRangePickerRoot
		v-bind="forwarded"
		:open="isOpen"
		:placeholder="calendarPlaceholder"
		:model-value="draftRange"
		:granularity="getEffectiveGranularity()"
		:fixed-date="fixedDate"
		prevent-deselect
		@update:model-value="onDraftUpdate"
		@update:open="onOpenUpdate"
		@update:placeholder="onPlaceholderUpdate"
		@update:start-value="onStartValueUpdate"
	>
		<DateRangePickerTrigger as-child>
			<slot name="trigger">
				<IconButton variant="subtle" icon="calendar" aria-label="Open calendar" />
			</slot>
		</DateRangePickerTrigger>

		<DateRangePickerContent
			align="start"
			:side-offset="5"
			:class="$style.PopoverContent"
			@open-auto-focus="onOpenAutoFocus"
		>
			<DateRangePickerCalendar v-slot="{ weekDays, grid }">
				<div :class="$style.PopoverInner">
					<div v-if="hasPresetsSidebar()" ref="presetsContainerRef" :class="$style.Presets">
						<slot name="presets">
							<DateRangePickerPresets
								v-if="presets?.length"
								:presets="presets"
								@select="onPresetSelect"
							/>
						</slot>
					</div>

					<div :class="[$style.CalendarPanel, props.single && $style.CalendarPanelSingle]">
						<div
							v-if="!hideInputs"
							:class="[
								$style.DateFields,
								(props.single || props.showTime) && $style.DateFieldsStacked,
							]"
						>
							<DateRangePickerDateTimeField
								type="start"
								:date-label="
									props.single ? t('dateRangePicker.date') : t('dateRangePicker.startDate')
								"
								:time-label="
									props.single ? t('dateRangePicker.time') : t('dateRangePicker.startTime')
								"
							/>
							<DateRangePickerDateTimeField
								v-if="!props.single"
								type="end"
								:date-label="t('dateRangePicker.endDate')"
								:time-label="t('dateRangePicker.endTime')"
							/>
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
								<N8nButton
									v-if="!hideToday"
									variant="ghost"
									size="small"
									label="Today"
									@click="goToToday"
								/>
								<div :class="$style.CalendarPageNavigation">
									<DateRangePickerPrev as-child>
										<IconButton
											icon="chevron-left"
											variant="ghost"
											size="small"
											icon-size="large"
										/>
									</DateRangePickerPrev>
									<DateRangePickerNext as-child>
										<IconButton
											icon="chevron-right"
											variant="ghost"
											size="small"
											icon-size="large"
										/>
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

						<div v-if="!hideInputs" :class="$style.FooterWrapper">
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
				</div>
			</DateRangePickerCalendar>
		</DateRangePickerContent>
	</DateRangePickerRoot>
</template>

<style lang="css" module>
.DateFields {
	display: flex;
	gap: var(--spacing--4xs);
	width: 0;
	min-width: 100%;
	margin-bottom: var(--spacing--2xs);
}

.DateFieldsStacked {
	flex-direction: column;
}

.FooterWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.FooterButton {
	width: 100%;
}

.CalendarHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
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
	width: fit-content;
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
	width: 100%;
	height: 100%;
	position: relative;
	z-index: 1;
	justify-content: center;
	align-items: center;
	font-weight: var(--font-weight--regular);
	white-space: nowrap;
	font-size: var(--font-size--xs);
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
	left: calc(var(--date-range-picker--cell-gap) / -2);
	right: calc(var(--date-range-picker--cell-gap) / -2);
	z-index: 0;
	background: var(--color--purple-100);
	border-radius: 0;
}

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
	padding: 0;
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
	display: flex;
	align-items: stretch;
	width: fit-content;
}

.CalendarPanel {
	display: flex;
	flex-direction: column;
	width: fit-content;
	padding: var(--spacing--xs);
}

/* Single-date mode should never show a range hover preview. */
.CalendarPanelSingle .CalendarCell:has([data-highlighted])::before {
	display: none;
}

.CalendarPanelSingle
	.CalendarCellTrigger[data-highlighted-start='true']:not([data-selection-start='true']):not(
		[data-selection-end='true']
	),
.CalendarPanelSingle
	.CalendarCellTrigger[data-highlighted-end='true']:not([data-selection-start='true']):not(
		[data-selection-end='true']
	) {
	background-color: transparent;
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
	flex-shrink: 0;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	border-right: var(--border);
	width: 10rem;
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
