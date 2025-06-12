import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';

import N8nCheckbox from './Checkbox.vue';

export default {
	title: 'Atoms/Checkbox',
	component: N8nCheckbox,
};

const methods = {
	onUpdateModelValue: action('update:modelValue'),
	onFocus: action('focus'),
	onChange: action('change'),
};

const DefaultTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nCheckbox,
	},
	data: () => ({
		isChecked: false,
	}),
	template:
		'<n8n-checkbox v-model="isChecked" v-bind="args" @update:modelValue="onUpdateModelValue"></n8n-checkbox>',
	methods,
});

export const Default = DefaultTemplate.bind({});
Default.args = {
	label: 'This is a default checkbox',
	tooltipText: 'Checkbox tooltip',
	disabled: false,
	indeterminate: false,
	size: 'small',
};
