<script lang="ts" setup>
// Use the non connected components to acheive this, Calendar, DateField and TimeField

import {
	DateFieldInput,
	DateFieldRoot,
	FocusScope,
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
import { onMounted, useTemplateRef } from 'vue';

const fieldRef = useTemplateRef('fieldRef');

onMounted(() => {
	// get first input and focus it
	const firstInput = fieldRef.value?.$el.querySelector('input');
	fieldRef.value?.setFocusedElement(firstInput);
});
</script>

<template>
	<FocusScope trapped loop>
		<div class="datePickerContainer">
			<DateFieldRoot v-slot="{ segments }" class="datePickerRoot" ref="fieldRef">
				<div class="datePickerField">
					<template v-for="item in segments" :key="item.part">
						<DateFieldInput
							v-if="item.part === 'literal'"
							:part="item.part"
							class="dateFieldLiteral"
						>
							{{ item.value }}
						</DateFieldInput>
						<DateFieldInput v-else :part="item.part" class="dateFieldSegment">
							{{ item.value }}
						</DateFieldInput>
					</template>
				</div>
			</DateFieldRoot>
			<CalendarRoot v-slot="{ weekDays, grid }" class="datePickerCalendar">
				<CalendarHeader class="datePickerHeader">
					<CalendarPrev class="datePickerNavButton" />
					<CalendarHeading />
					<CalendarNext class="datePickerNavButton" />
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
	</FocusScope>
</template>

<style lang="scss" scoped>
@use 'Filters.scss';
</style>
