import N8nInput from './Input.vue';
import N8nIcon from '../N8nIcon';
import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue';

export default {
	title: 'Atoms/Input',
	component: N8nInput,
	argTypes: {
		type: {
			control: 'select',
			options: ['text', 'textarea', 'number', 'password', 'email'],
		},
		placeholder: {
			control: 'text',
		},
		disabled: {
			control: {
				type: 'boolean',
			},
		},
		size: {
			control: 'select',
			options: ['xlarge', 'large', 'medium', 'small', 'mini'],
		},
	},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const methods = {
	onInput: action('input'),
	onFocus: action('focus'),
	onChange: action('change'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nInput,
	},
	template:
		'<n8n-input v-bind="$props" v-model="val" @input="onInput" @change="onChange" @focus="onFocus" />',
	data() {
		return {
			val: '',
		};
	},
	methods,
});

export const Input = Template.bind({});
Input.args = {
	placeholder: 'placeholder...',
};

const ManyTemplate: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nInput,
	},
	template:
		'<div class="multi-container"> <n8n-input size="xlarge" v-bind="$props" v-model="val" @input="onInput" @change="onChange" @focus="onFocus" /> <n8n-input v-bind="$props" v-model="val" @input="onInput" @change="onChange" @focus="onFocus" /> <n8n-input v-bind="$props" size="medium" v-model="val" @input="onInput" @change="onChange" @focus="onFocus" /> <n8n-input v-bind="$props" size="small" v-model="val" @input="onInput" @change="onChange" @focus="onFocus" /> <n8n-input v-bind="$props" v-model="val" size="mini" @input="onInput" @change="onChange" @focus="onFocus" /> </div> ',
	methods,
	data() {
		return {
			val: '',
		};
	},
});

export const Text = ManyTemplate.bind({});
Text.args = {
	type: 'text',
	placeholder: 'placeholder...',
};

export const TextArea = ManyTemplate.bind({});
TextArea.args = {
	type: 'textarea',
	placeholder: 'placeholder...',
};

const WithPrefix: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nIcon,
		N8nInput,
	},
	template:
		'<n8n-input v-bind="$props" v-model="val" @input="onInput" @change="onChange" @focus="onFocus"><n8n-icon icon="clock" slot="prefix" /></n8n-input>',
	data() {
		return {
			val: '',
		};
	},
	methods,
});

export const WithPrefixIcon = WithPrefix.bind({});
WithPrefixIcon.args = {
	placeholder: 'placeholder...',
};

const WithSuffix: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nIcon,
		N8nInput,
	},
	template:
		'<n8n-input v-bind="$props" v-model="val" @input="onInput" @change="onChange" @focus="onFocus"><n8n-icon icon="clock" slot="suffix" /></n8n-input>',
	data() {
		return {
			val: '',
		};
	},
	methods,
});

export const WithSuffixIcon = WithSuffix.bind({});
WithSuffixIcon.args = {
	placeholder: 'placeholder...',
};
