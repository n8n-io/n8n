import type { Meta, StoryObj } from '@storybook/vue3';

import DatePickerV2 from './DatePickerV2.vue';

const meta: Meta<typeof DatePickerV2> = {
	title: 'Filters/DatePickerV2',
	component: DatePickerV2,
};

export default meta;
type Story = StoryObj<typeof DatePickerV2>;

export const Default: Story = {
	render: (args) => ({
		components: { DatePickerV2 },
		setup() {
			return { args };
		},
		template: `
			<DatePickerV2
				v-bind="args"
				v-model="selectedValue"
			/>
		`,
	}),
	args: {},
};
