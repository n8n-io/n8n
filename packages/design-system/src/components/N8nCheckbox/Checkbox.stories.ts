/* tslint:disable:variable-name */
import N8nCheckbox from "./Checkbox.vue";
import { StoryFn } from '@storybook/vue';
import { action } from '@storybook/addon-actions';

export default {
	title: 'Atoms/Checkbox',
	component: N8nCheckbox,
	argTypes: {
		checked: {
			control: null,
		},
	},
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
	template: '<n8n-checkbox v-bind="$props" @change="onChange" @focus="onFocus"></n8n-checkbox>',
	methods,
});

export const Default = DefaultTemplate.bind({});
Default.args = {
	label: 'This is a default checkbox',
	tooltipText: 'Checkbox tooltip',
	checked: true,
	disabled: false,
};
