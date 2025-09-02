import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import ComboBox from './ComboBox.vue';

const meta: Meta<typeof ComboBox> = {
	title: 'Atoms/ComboBox',
	component: ComboBox,
};

export default meta;
type Story = StoryObj<typeof ComboBox>;

export const Default: Story = {
	render: (args) => ({
		components: { ComboBox },
		setup() {
			const selectedValue = ref('');
			return { args, selectedValue };
		},
		template: `
			<ComboBox
				v-bind="args"
				v-model="selectedValue"
			/>
		`,
	}),
	args: {
		items: [
			{ id: 1, label: 'Durward Reynolds', value: '1' },
			{ id: 2, label: 'Kenton Towne', value: '2' },
			{ id: 3, label: 'Therese Wunsch', value: '3' },
			{ id: 4, label: 'Benedict Kessler', value: '4' },
			{ id: 5, label: 'Katelyn Rohan', value: '5' },
		],
	},
};
