import type { Meta, StoryObj } from '@storybook/vue3';
import MultiSelect from './MultiSelect.vue';

const meta: Meta<typeof MultiSelect> = {
	title: 'Filters/MultiSelect',
	component: MultiSelect,
};

export default meta;
type Story = StoryObj<typeof MultiSelect>;

export const Default: Story = {
	render: (args) => ({
		components: { MultiSelect },
		setup() {
			return { args };
		},
		template: `
			<MultiSelect
				v-bind="args"
				v-model="selectedValue"
			/>
		`,
	}),
	args: {
		items: [
			{ id: '1', name: 'Durward Reynolds', value: '1' },
			{ id: '2', name: 'Kenton Towne', value: '2' },
			{ id: '3', name: 'Therese Wunsch', value: '3' },
			{ id: 'a', name: 'Benedict Kessler', value: '4' },
			{ id: '5', name: 'Katelyn Rohan', value: '5' },
		],
	},
};
