import N8nRadioButtons from './RadioButtons.vue';

import { action } from '@storybook/addon-actions';

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
	onInput: action('input'),
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nRadioButtons,
	},
	template: `<n8n-radio-buttons v-model="val" v-bind="$props" @input="onInput">
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
