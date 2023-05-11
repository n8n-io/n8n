import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue';
import N8nColorPicker from './ColorPicker.vue';

export default {
	title: 'Atoms/ColorPicker',
	component: N8nColorPicker,
	argTypes: {
		disabled: {
			control: 'boolean',
		},
		size: {
			control: 'select',
			options: ['mini', 'small', 'medium', 'large'],
		},
		showAlpha: {
			control: 'boolean',
		},
		colorFormat: {
			control: 'select',
			options: ['hsl', 'hsv', 'hex', 'rgb'],
		},
		popperClass: {
			control: 'text',
		},
		predefine: {
			control: 'array',
		},
	},
};

const methods = {
	onChange: action('change'),
	onActiveChange: action('active-change'),
	onInput: action('input'),
};

const DefaultTemplate: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nColorPicker,
	},
	data: () => ({
		color: null,
	}),
	template:
		'<n8n-color-picker v-model="color" v-bind="$props" @input="onInput" @change="onChange" @active-change="onActiveChange" />',
	methods,
});

export const Default = DefaultTemplate.bind({});
Default.args = {
	disabled: false,
	size: 'medium',
	showAlpha: false,
	colorFormat: '',
	popperClass: '',
	showInput: true,
};
