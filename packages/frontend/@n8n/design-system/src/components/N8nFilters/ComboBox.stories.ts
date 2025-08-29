import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import ComboBox from './ComboBox.vue';

const meta: Meta<typeof ComboBox> = {
	title: 'Components/ComboBox',
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
	args: {},
};

export const WithManyOptions: Story = {
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
};
