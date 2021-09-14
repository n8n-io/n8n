import N8nFormInput from './FormInput.vue';
import { action } from '@storybook/addon-actions';

export default {
	title: 'Modules/FormInput',
	component: N8nFormInput,
	argTypes: {
	},
};

const methods = {
	onInput: action('input'),
	onFocus: action('focus'),
	onChange: action('change'),
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nFormInput,
	},
	template: '<n8n-form-input v-bind="$props" v-model="val" @input="onInput" @change="onChange" @focus="onFocus" />',
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
