<script lang="ts" setup>
import { getLocalTimeZone, today } from '@internationalized/date';
import type { DateValue } from '@internationalized/date';
import {
	DatePickerCalendar,
	DatePickerCell,
	DatePickerCellTrigger,
	DatePickerContent,
	DatePickerGrid,
	DatePickerGridBody,
	DatePickerGridHead,
	DatePickerGridRow,
	DatePickerHeadCell,
	DatePickerHeader,
	DatePickerHeading,
	DatePickerNext,
	DatePickerPrev,
	DatePickerRoot,
	DatePickerTrigger,
	FocusScope,
	useForwardPropsEmits,
} from 'reka-ui';
import { ref, toRef, watch } from 'vue';

import Button from '../N8nButton/Button.vue';
import IconButton from '../N8nIconButton';
import N8nDatePickerField from './DatePickerField.vue';
import type { N8nDatePickerProps, N8nDatePickerRootEmits } from './index';

const props = withDefaults(defineProps<N8nDatePickerProps>(), {
	weekStartsOn: 1,
	weekdayFormat: 'narrow',
	fixedWeeks: true,
	hourCycle: 24,
});

const emit = defineEmits<N8nDatePickerRootEmits>();

defineSlots<{
	presets?: {};
	trigger?: {};
}>();

const initialDate = today(getLocalTimeZone());
const placeholder = ref<DateValue>(initialDate);
const modelValue = ref<DateValue | undefined>(props.modelValue);
const open = ref(props.open ?? false);

watch(toRef(props, 'modelValue'), (v) => {
	modelValue.value = v;
});
watch(modelValue, (v) => {
	emit('update:modelValue', v as DateValue);
});
watch(toRef(props, 'open'), (v) => {
	open.value = v ?? false;
});
watch(open, (v) => {
	emit('update:open', v);
});

const forwarded = useForwardPropsEmits(props, emit);

function goToToday() {
	const todayDate = today(getLocalTimeZone());
	placeholder.value = todayDate;
	modelValue.value = todayDate;
}

function clearValue() {
	modelValue.value = undefined;
	open.value = false;
}

function onContentKeydown(event: KeyboardEvent) {
	if (event.key === 't' || event.key === 'T') {
		const target = event.target as HTMLElement;
		if (target.hasAttribute('data-reka-date-field-segment')) return;

		event.preventDefault();
		goToToday();
	}
}
</script>

<template>
	<DatePickerRoot
		v-bind="forwarded"
		:default-value="initialDate"
		v-model="modelValue"
		v-model:placeholder="placeholder"
		v-model:open="open"
	>
		<DatePickerTrigger as-child>
			<slot name="trigger">
				<IconButton icon="calendar" type="secondary" aria-label="Open calendar" />
			</slot>
		</DatePickerTrigger>

		<DatePickerContent
			align="start"
			:side-offset="5"
			:class="$style.PopoverContent"
			@keydown="onContentKeydown"
		>
			<FocusScope as-child trapped loop>
				<DatePickerCalendar v-slot="{ weekDays, grid }" :class="$style.Calendar">
					<template v-if="!!$slots.presets">
						<div :class="$style.Presets">
							<slot name="presets" />
						</div>
					</template>
					<div>
						<div v-if="!hideInputs" :class="$style.DateFieldWrapper">
							<N8nDatePickerField :class="$style.DateField" />
							<div :class="$style.DateFieldError">Outside of allowed range</div>
						</div>

						<div :class="$style.CalendarWrapper">
							<DatePickerHeader :class="$style.CalendarHeader">
								<DatePickerHeading :class="$style.CalendarHeading" />
								<div :class="$style.CalendarHeaderActions">
									<DatePickerPrev as-child>
										<IconButton icon="chevron-left" type="highlight" size="small" />
									</DatePickerPrev>
									<Button
										type="highlight"
										size="small"
										:class="$style.TodayButton"
										@click="goToToday"
									>
										Today
									</Button>
									<DatePickerNext as-child>
										<IconButton icon="chevron-right" type="highlight" size="small" />
									</DatePickerNext>
								</div>
							</DatePickerHeader>

							<DatePickerGrid
								v-for="month in grid"
								:key="month.value.toString()"
								:class="$style.CalendarGrid"
							>
								<DatePickerGridHead>
									<DatePickerGridRow :class="$style.CalendarGridRow">
										<DatePickerHeadCell
											v-for="day in weekDays"
											:key="day"
											:class="$style.CalendarHeadCell"
										>
											{{ day }}
										</DatePickerHeadCell>
									</DatePickerGridRow>
								</DatePickerGridHead>
								<DatePickerGridBody>
									<DatePickerGridRow
										v-for="(weekDates, index) in month.rows"
										:key="`weekDate-${index}`"
										:class="$style.CalendarGridRow"
									>
										<DatePickerCell
											v-for="weekDate in weekDates"
											:key="weekDate.toString()"
											:date="weekDate"
											:class="$style.CalendarCell"
										>
											<DatePickerCellTrigger
												:day="weekDate"
												:month="month.value"
												:class="$style.CalendarCellTrigger"
											/>
										</DatePickerCell>
									</DatePickerGridRow>
								</DatePickerGridBody>
							</DatePickerGrid>
						</div>

						<div :class="$style.FooterWrapper">
							<Button type="tertiary" size="small" @click="clearValue">Clear</Button>
						</div>
					</div>
				</DatePickerCalendar>
			</FocusScope>
		</DatePickerContent>
	</DatePickerRoot>
</template>

<style lang="css" module>
.DateFieldWrapper {
	padding: var(--spacing--2xs);
	padding-bottom: 0;
}

.DateField[data-invalid] + .DateFieldError {
	display: block;
}

.DateFieldError {
	color: var(--color--danger);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	margin-top: var(--spacing--4xs);
	display: none;
}

.Calendar {
	display: flex;
}

.CalendarHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.CalendarHeaderActions {
	display: flex;
	align-items: end;
	margin-right: -4px;
}

.CalendarWrapper {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--xs);
	gap: var(--spacing--xs);
}

.CalendarGrid {
	width: 100%;
	user-select: none;
	border-collapse: collapse;
}

.CalendarGridRow {
	display: grid;
	margin-bottom: var(--spacing--4xs);
	grid-template-columns: repeat(7, minmax(0, 1fr));
	width: 100%;
}

.CalendarHeading {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	padding-left: var(--spacing--4xs);
}

.CalendarHeadCell {
	font-size: var(--font-size--2xs);
	line-height: 1rem;
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--medium);
}

.CalendarCell {
	position: relative;
	font-size: var(--font-size--sm);
	line-height: 1.25rem;
	text-align: center;
}

.CalendarCellTrigger {
	display: flex;
	position: relative;
	padding: var(--spacing--2xs);
	justify-content: center;
	align-items: center;
	border-width: var(--border-width);
	border-color: transparent;
	outline-style: none;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	line-height: normal;
	white-space: nowrap;
	background-color: transparent;
	cursor: pointer;
	color: var(--color--text);
	border-radius: var(--radius);
}

.CalendarCellTrigger[data-outside-view] {
	opacity: 0.5;
}

.CalendarCellTrigger:hover:not([data-disabled]):not([data-selected]) {
	background-color: var(--color--foreground--tint-1);
}

.CalendarCellTrigger[data-disabled] {
	cursor: not-allowed;
	color: var(--color--text--tint-1);
}

.CalendarCellTrigger:focus {
	outline: 2px solid var(--color--primary);
	z-index: 1;
}

.CalendarCellTrigger[data-unavailable] {
	color: var(--color--text--tint-2);
	text-decoration: line-through;
}

.CalendarCellTrigger[data-selected] {
	background: var(--color--primary);
	color: #fff;
	border-radius: var(--radius);
}

.CalendarCellTrigger[data-today]::before {
	content: '';
	position: absolute;
	top: 5px;
	left: 5px;
	width: var(--spacing--4xs);
	height: var(--spacing--4xs);
	border-radius: 9999px;
	background-color: var(--color--primary);
}

.FooterWrapper {
	border-top: 1px solid var(--color--foreground);
	padding: var(--spacing--2xs) var(--spacing--xs);
	display: flex;
	justify-content: flex-end;
}

.PopoverContent {
	border-radius: var(--radius);
	border: var(--border);
	background: var(--color--foreground--tint-2);
	box-shadow: 0 6px 16px 0 rgba(68, 28, 23, 0.06);
	animation-duration: 400ms;
	animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
	will-change: transform, opacity;
	z-index: 9999;
}

.PopoverContent:focus {
	box-shadow: var(--shadow);
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
