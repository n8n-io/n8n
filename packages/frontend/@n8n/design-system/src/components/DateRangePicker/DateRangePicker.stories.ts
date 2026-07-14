import { today } from '@internationalized/date';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nButton from '../N8nButton';
import DateRangePicker from './DateRangePicker.vue';
import { formatDateRangeValue, formatDateValue } from './datePicker.utils';

const meta = {
	component: DateRangePicker,
	title: 'Experimental/DateRangePicker',
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FormattedTrigger: Story = {
	render: () => ({
		components: { DateRangePicker, N8nButton },
		setup() {
			const range = ref({
				start: today('UTC').subtract({ days: 7 }),
				end: today('UTC'),
			});

			return { range, formatDateRangeValue };
		},
		template: `
			<DateRangePicker v-model="range" locale="en-GB">
				<template #trigger>
					<N8nButton variant="subtle" icon="calendar">
						{{ formatDateRangeValue(range, { locale: 'en-GB' }) || 'Select range' }}
					</N8nButton>
				</template>
			</DateRangePicker>
		`,
	}),
};

export const SingleDateSelection: Story = {
	render: () => ({
		components: { DateRangePicker, N8nButton },
		setup() {
			const range = ref({
				start: today('UTC'),
				end: today('UTC'),
			});

			return { range, formatDateValue };
		},
		template: `
			<DateRangePicker v-model="range" single locale="en-GB">
				<template #trigger>
					<N8nButton variant="subtle" icon="calendar">
						{{ formatDateValue(range.start, { locale: 'en-GB' }) || 'Select date' }}
					</N8nButton>
				</template>
			</DateRangePicker>
		`,
	}),
};
