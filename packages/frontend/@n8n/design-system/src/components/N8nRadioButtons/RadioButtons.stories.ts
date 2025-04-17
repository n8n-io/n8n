import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';

import N8nRadioButtons from './RadioButtons.vue';

export default {
	title: 'Atoms/RadioButtons',
	component: N8nRadioButtons,
	argTypes: {
		size: {
			type: 'select',
			options: ['small', 'medium'],
		},
	},
	parameters: {
		backgrounds: { default: '--color-background-xlight' },
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

export const Example = Template.bind({});
Example.args = {
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
