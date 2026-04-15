import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nFormInput from './FormInput.vue';
import N8nFormBox from '../N8nFormBox/FormBox.vue';
import N8nFormInputs from '../N8nFormInputs/FormInputs.vue';

export default {
	title: 'Core/Form',
	component: N8nFormInput,
	argTypes: {},
	parameters: {
		backgrounds: { default: '--color--background--light-2' },
		docs: {
			description: {
				component: 'A collection of form field patterns for capturing and validating user input.',
			},
		},
	},
};

const methods = {
	onUpdateModelValue: action('update:modelValue'),
	onFocus: action('focus'),
	onChange: action('change'),
	onSubmit: action('submit'),
	onFormChange: action('form-change'),
	onFormBoxSubmit: action('formbox-submit'),
	onFormBoxUpdate: action('formbox-update'),
};

const SingleFieldTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nFormInput,
	},
	template: `
		<div style="max-width: 420px;">
			<n8n-form-input
				v-bind="args"
				v-model="val"
				@update:modelValue="onUpdateModelValue"
				@change="onChange"
				@focus="onFocus"
			/>
		</div>
	`,
	methods,
	data() {
		return {
			val: '',
		};
	},
});

export const SingleField = SingleFieldTemplate.bind({});
SingleField.args = {
	label: 'Label',
	placeholder: 'placeholder',
};

const SchemaDrivenTemplate: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: {
		N8nFormInputs,
	},
	template:
		'<div style="max-width: 420px;"><n8n-form-inputs v-bind="args" @submit="onSubmit" @change="onFormChange" /></div>',
	methods,
});

export const SchemaDriven = SchemaDrivenTemplate.bind({});
SchemaDriven.args = {
	columnView: true,
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
	],
};

const FramedFormTemplate: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: {
		N8nFormBox,
	},
	template:
		'<div style="max-width: 540px;"><n8n-form-box v-bind="args" @submit="onFormBoxSubmit" @update="onFormBoxUpdate" /></div>',
	methods,
});

export const FramedForm = FramedFormTemplate.bind({});
FramedForm.args = {
	title: 'Form title',
	inputs: [
		{
			name: 'email',
			properties: {
				label: 'Your Email',
				type: 'email',
				required: true,
				validationRules: [{ name: 'VALID_EMAIL' }],
			},
		},
		{
			name: 'message',
			properties: {
				label: 'Please contact someone someday.',
				type: 'text',
			},
		},
		{
			name: 'password',
			properties: {
				label: 'Your Password',
				type: 'password',
				required: true,
				validationRules: [{ name: 'DEFAULT_PASSWORD_RULES' }],
			},
		},
	],
	buttonText: 'Action',
	redirectText: 'Go somewhere',
	redirectLink: 'https://n8n.io',
};
