import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue';
import N8nColorPicker from './ColorPicker.vue';

export default {
	title: 'Atoms/ColorPicker',
	component: N8nColorPicker,
};

const methods = {
	onChange: action('change'),
};

const DefaultTemplate: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nColorPicker,
	},
	data: () => ({
		isChecked: false,
	}),
	template:
		'<n8n-color-picker v-model="isChecked" v-bind="$props" @change="onChange"></n8n-color-picker>',
	methods,
});

export const Default = DefaultTemplate.bind({});
Default.args = {};
