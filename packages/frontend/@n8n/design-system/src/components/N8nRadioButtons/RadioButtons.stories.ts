import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nRadioButtons from './RadioButtons.vue';

export default {
	title: 'Core/RadioButtons',
	component: N8nRadioButtons,
	argTypes: {
		size: {
			type: 'select',
			options: ['small', 'small-medium', 'medium'],
		},
	},
	parameters: {
		docs: {
			description: { component: 'A grouped single-choice selector using radio button options.' },
		},
		backgrounds: { default: '--color--background--light-3' },
	},
};

const methods = {
	onInput: action('update:modelValue'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nRadioButtons,
	},
	template: `<n8n-radio-buttons v-model="val" v-bind="args" @update:modelValue="onInput">
		</n8n-radio-buttons>`,
	methods,
	data() {
		return {
			val: '',
		};
	},
});

export const Default = Template.bind({});
Default.args = {
	options: [
		{
			label: 'Test',
			value: 'test',
		},
		{
			label: 'World',
			value: 'world',
		},
		{
			label: 'Hello',
			value: 'hello',
		},
	],
};

export const Sizes: StoryFn = () => ({
	components: { N8nRadioButtons },
	data() {
		return {
			val: 'test',
			options: [
				{ label: 'Test', value: 'test' },
				{ label: 'World', value: 'world' },
				{ label: 'Hello', value: 'hello' },
			],
		};
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 12px;">
			<n8n-radio-buttons v-model="val" size="small" :options="options" />
			<n8n-radio-buttons v-model="val" size="small-medium" :options="options" />
			<n8n-radio-buttons v-model="val" size="medium" :options="options" />
		</div>
	`,
});

export const Disabled = Template.bind({});
Disabled.args = {
	modelValue: 'enabled',
	options: [
		{
			label: 'Enabled',
			value: 'enabled',
		},
		{
			label: 'Disabled',
			value: 'disabled',
			disabled: true,
		},
	],
};
