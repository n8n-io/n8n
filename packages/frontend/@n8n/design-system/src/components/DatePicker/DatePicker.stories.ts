import type { Meta, StoryObj } from '@storybook/vue3-vite';

import DatePicker from './DatePicker.vue';

const meta = {
	component: DatePicker,
	title: 'Components v2/DatePicker',
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHiddenInputs: Story = {
	args: {
		hideInputs: true,
	},
};

export const GermanLocale: Story = {
	args: {
		locale: 'de-DE',
	},
};

export const BritishLocale: Story = {
	args: {
		locale: 'en-GB',
	},
};
