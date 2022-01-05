import N8nInputNumber from './InputNumber.vue';
import { action } from '@storybook/addon-actions';

export default {
	title: 'Atoms/Input Number',
	component: N8nInputNumber,
	argTypes: {
		placeholder: {
			control: 'text',
		},
		disabled: {
			control: {
				type: 'boolean',
			},
		},
		controls: {
			control: {
				type: 'boolean',
			},
		},
		precision: {
			control: {
				type: 'number',
			},
		},
		min: {
			control: {
				type: 'number',
			},
		},
		max: {
			control: {
				type: 'number',
			},
		},
		step: {
			control: {
				type: 'number',
			},
		},
		title: {
			control: 'text',
		},
	},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const methods = {
	onInput: action('input'),
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nInputNumber,
	},
	template: '<n8n-input-number v-bind="$props" v-model="val" @input="onInput" />',
	data() {
		return {
			val: null,
		};
	},
	methods,
});

export const Input = Template.bind({});
Input.args = {
	placeholder: 'placeholder...',
	controls: false,
};

const ManyTemplate = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nInputNumber,
	},
	template:
		'<div> <n8n-input-number style="margin-bottom:10px" v-bind="$props" v-model="val" @input="onInput" /> <n8n-input-number style="margin-bottom:10px" v-bind="$props" size="medium" v-model="val" @input="onInput" /> <n8n-input-number style="margin-bottom:10px" v-bind="$props" size="small" v-model="val" @input="onInput" /> <n8n-input-number style="margin-bottom:10px" v-bind="$props" v-model="val" size="mini" @input="onInput" /> </div>',
	methods,
	data() {
		return {
			val: '',
		};
	},
});

export const Sizes = ManyTemplate.bind({});
Sizes.args = {
	placeholder: 'placeholder...',
	controls: false,
};

