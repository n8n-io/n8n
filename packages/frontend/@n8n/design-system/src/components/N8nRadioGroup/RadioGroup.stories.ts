import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nRadioGroup from './RadioGroup.vue';

export default {
	title: 'Modules/RadioGroup',
	component: N8nRadioGroup,
	argTypes: {
		orientation: {
			control: 'select',
			options: ['vertical', 'horizontal'],
		},
		disabled: {
			control: 'boolean',
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'An accessible vertical (or horizontal) single-choice radio list built on reka-ui. Each option supports an optional description.',
			},
		},
	},
};

const methods = {
	onUpdate: action('update:modelValue'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: { N8nRadioGroup },
	template: `<n8n-radio-group v-model="val" v-bind="args" @update:modelValue="onUpdate">
		</n8n-radio-group>`,
	methods,
	data() {
		return {
			val: 'all',
		};
	},
});

export const Default = Template.bind({});
Default.args = {
	options: [
		{ value: 'all', label: 'All' },
		{ value: 'readOnly', label: 'Read only' },
		{ value: 'custom', label: 'Custom' },
	],
};

export const WithDescriptions = Template.bind({});
WithDescriptions.args = {
	options: [
		{ value: 'all', label: 'All', description: 'Grant every available scope' },
		{ value: 'readOnly', label: 'Read only', description: 'Read and list scopes only' },
		{ value: 'custom', label: 'Custom', description: 'Pick scopes individually' },
	],
};

export const Disabled = Template.bind({});
Disabled.args = {
	disabled: true,
	options: [
		{ value: 'all', label: 'All' },
		{ value: 'readOnly', label: 'Read only' },
		{ value: 'custom', label: 'Custom' },
	],
};
