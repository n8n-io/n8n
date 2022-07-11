/* tslint:disable:variable-name */
import N8nCheckbox from "./Checkbox.vue";
import { StoryFn } from '@storybook/vue';
import { action } from '@storybook/addon-actions';

export default {
	title: 'Atoms/Checkbox',
	component: N8nCheckbox,
};

const methods = {
	onInput: action('input'),
	onFocus: action('focus'),
	onChange: action('change'),
};

const DefaultTemplate: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nCheckbox,
	},
	data: () => ({
		isChecked: false,
	}),
	template: '<n8n-checkbox v-model="isChecked" v-bind="$props" @input="onInput"></n8n-checkbox>',
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
