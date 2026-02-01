import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nFormInput from './FormInput.vue';

export default {
	title: 'Modules/FormInput',
	component: N8nFormInput,
	argTypes: {},
};

const methods = {
	onUpdateModelValue: action('update:modelValue'),
	onFocus: action('focus'),
	onChange: action('change'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nFormInput,
	},
	template: `
		<n8n-form-input v-bind="args" v-model="val" @update:modelValue="onUpdateModelValue" @change="onChange" @focus="onFocus" />
	`,
	methods,
	data() {
		return {
			val: '',
		};
	},
});

export const FormInput = Template.bind({});
FormInput.args = {
	label: 'Label',
	placeholder: 'placeholder',
};
