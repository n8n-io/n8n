import type { Meta, StoryObj } from '@storybook/vue3-vite';

import DateRangePicker from './DateRangePicker.vue';

const meta = {
	component: DateRangePicker,
	title: 'Components v2/DateRangePicker',
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
