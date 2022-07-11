import N8nFormInputs from './FormInputs.vue';
import { action } from '@storybook/addon-actions';

export default {
	title: 'Modules/FormInputs',
	component: N8nFormInputs,
	argTypes: {},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const methods = {
	onInput: action('input'),
	onSubmit: action('submit'),
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nFormInputs,
	},
	template: '<n8n-form-inputs v-bind="$props" @submit="onSubmit" @input="onInput" />',
	methods,
});

export const FormInputs = Template.bind({});
FormInputs.args = {
	inputs: [
		{
			name: 'email',
			properties: {
				label: 'Your Email',
				type: 'email',
				required: true,
				initialValue: 'test@test.com',
			},
		},
		{
			name: 'password',
			properties: {
				label: 'Your Password',
				type: 'password',
				required: true,
			},
		},
		{
			name: 'nickname',
			properties: {
				label: 'Your Nickname',
				placeholder: 'Monty',
			},
		},
		{
			name: 'opts',
			properties: {
				type: 'select',
				label: 'Opts',
				options: [
					{
						label: 'Opt1',
						value: 'opt1',
					},
					{
						label: 'Opt2',
						value: 'opt2',
					},
				],
			},
		},
		{
			name: 'agree',
			properties: {
			  type: 'checkbox',
			  label: 'Signup for newsletter Signup for newsletter Signup for newsletter vSignup for newsletter Signup for newsletter Signup for newsletter Signup for newsletter Signup for newsletter Signup for newsletter Signup for newsletter v vSignup for newsletter Signup for newsletter Signup for newsletter Signup for newsletter',
			  labelSize: 'small',
			  tooltipText: 'Check this if you agree to be contacted by our marketing team Check this if you agree to be contacted by our marketing team Check this if you agree to be contacted by our marketing team Check this if you agree to be contacted by our marketing team'
			}
		  }
	],
};

