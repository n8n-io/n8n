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

import N8nButton from '../N8nButton';
import IconButton from '../N8nIconButton';
import N8nDateRangePickerField from './DateRangePickerField.vue';
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
}>();

const forwarded = useForwardPropsEmits(props, emit);
</script>

<template>
	<DateRangePickerRoot v-bind="forwarded">
		<DateRangePickerTrigger as-child>
			<slot name="trigger">
				<IconButton variant="subtle" icon="calendar" aria-label="Open calendar" />
			</slot>
		</DateRangePickerTrigger>

		<DateRangePickerContent align="start" :side-offset="5" :class="$style.PopoverContent">
			<DateRangePickerCalendar v-slot="{ weekDays, grid }" :class="$style.Calendar">
				<template v-if="!!$slots.presets">
					<div :class="$style.Presets">
						<slot name="presets" />
					</div>
				</template>
				<div>
					<div :class="$style.CalendarWrapper">
						<DateRangePickerHeader :class="$style.CalendarHeader">
							<DateRangePickerPrev as-child>
								<IconButton icon="chevron-left" variant="subtle" />
							</DateRangePickerPrev>
							<DateRangePickerHeading :class="$style.CalendarHeading" />
							<DateRangePickerNext as-child>
								<IconButton icon="chevron-right" variant="subtle" />
							</DateRangePickerNext>
						</DateRangePickerHeader>

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
										{{ day }}
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
					</div>

					<div v-if="!hideInputs" :class="$style.DateFieldWrapper">
						<N8nDateRangePickerField :class="$style.DateField"></N8nDateRangePickerField>
						<div :class="$style.DateFieldError">Outside of allowed range</div>

						<N8nButton
							variant="subtle"
							label="Apply"
							class="mt-2xs"
							:class="$style.ApplyButton"
							@click="emit('update:open', false)"
						/>
					</div>
				</div>
			</DateRangePickerCalendar>
		</DateRangePickerContent>
	</DateRangePickerRoot>
</template>

<style lang="css" module>
.DateFieldWrapper {
	border-top: 1px solid var(--color--foreground);
	padding: 12px;
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

.ApplyButton {
	width: 100%;
}

.DateFieldSegment:focus {
	outline: 2px solid rgba(67, 142, 255, 1);
	border-radius: 0.25rem;
}

.Calendar {
	display: flex;
}

.CalendarHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.CalendarWrapper {
	padding: 12px;
}

.CalendarGrid {
	margin-top: 0.25rem;
	width: 100%;
	user-select: none;
	border-collapse: collapse;
}

.CalendarGridRow {
	display: grid;
	margin-bottom: 0.25rem;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	width: 100%;
}

.CalendarHeadCell {
	font-size: 0.75rem;
	line-height: 1rem;
	color: var(--color--text--tint-1);
	font-weight: 400;
}

.CalendarCell {
	position: relative;
	font-size: 0.875rem;
	line-height: 1.25rem;
	text-align: center;
}

.CalendarCellTrigger {
	display: flex;
	position: relative;
	padding: 0.5rem;
	justify-content: center;
	align-items: center;
	border-width: 1px;
	border-color: transparent;
	outline-style: none;
	font-size: 0.875rem;
	line-height: 1.25rem;
	font-weight: 400;
	white-space: nowrap;
	background-color: transparent;
	cursor: pointer;
	font-size: var(--font-size--sm);
	font-style: normal;
	font-weight: 400;
	line-height: normal;
	color: var(--color--text);
	border-radius: 4px;
}

.CalendarCellTrigger[data-outside-view] {
	opacity: 0.5;
}

.CalendarCellTrigger:hover:not([data-disabled]):not([data-selection-start='true']):not(
		[data-selection-end='true']
	) {
	background-color: var(--color--foreground--tint-1);
}

.CalendarCellTrigger[data-disabled] {
	cursor: not-allowed;
	color: var(--color--text--tint-1);
}

.CalendarCellTrigger:focus {
	outline: 2px solid rgba(67, 142, 255, 1);
	z-index: 1;
}

.CalendarCellTrigger[data-unavailable] {
	color: rgba(0, 0, 0, 0.3);
	text-decoration: line-through;
}

.CalendarCellTrigger[data-highlighted],
.CalendarCellTrigger[data-selected] {
	background: var(--color--foreground--tint-1);
	border-radius: 0;
}

.CalendarCellTrigger[data-selection-start='true'],
.CalendarCellTrigger[data-highlighted-start='true'] {
	border-top-left-radius: 4px;
	border-bottom-left-radius: 4px;
}

.CalendarCellTrigger[data-selection-end='true'],
.CalendarCellTrigger[data-highlighted-end='true'] {
	border-top-right-radius: 4px;
	border-bottom-right-radius: 4px;
}

.CalendarCellTrigger[data-selection-start='true'],
.CalendarCellTrigger[data-selection-end='true'] {
	background: var(--color--primary);
	color: #fff;
}

.CalendarCellTrigger[data-today]::before {
	content: '';
	position: absolute;
	top: 5px;
	left: 5px;
	width: 0.25rem;
	height: 0.25rem;
	border-radius: 9999px;
	background-color: var(--color--primary);
}

.PopoverContent {
	border-radius: 4px;
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
