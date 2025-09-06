<script lang="ts" setup>
// Use the non connected components to acheive this, Calendar, DateField and TimeField

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
} from 'reka-ui';
import { onMounted, ref } from 'vue';
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

const dateFieldRoot = ref<InstanceType<typeof DateFieldRoot>>();

// Stop all keyboard events from bubbling up to the dropdown
function stopKeyboardPropagation(e: KeyboardEvent) {
	if (e.key === 'Escape') return;
	e.stopPropagation();
}

onMounted(() => {
	// Focus the first segment after a small delay to ensure DOM is ready
	setTimeout(() => {
		const firstSegment = dateFieldRoot.value?.$el?.querySelector('.dateFieldSegment');
		if (firstSegment) {
			firstSegment.focus();
		}
	}, 100);
});
</script>

<template>
	<div
		@keydown="stopKeyboardPropagation"
		@keyup="stopKeyboardPropagation"
		class="datePickerContainer"
	>
		<DateFieldRoot v-slot="{ segments }" class="datePickerRoot" ref="dateFieldRoot">
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
		<CalendarRoot v-slot="{ weekDays, grid }" class="datePickerCalendar">
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
	</div>
</template>

<style lang="scss" scoped>
@use 'Filters.scss';
</style>
