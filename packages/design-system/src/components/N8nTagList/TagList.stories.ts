import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';

import N8nTagList from './TagList.vue';

export default {
	title: 'Modules/TagList',
	component: N8nTagList,
	argTypes: {},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const methods = {
	onChange: action('change'),
	onSubmit: action('submit'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nTagList,
	},
	template: '<n8n-tag-list v-bind="args" />',
	methods,
});

export const TagList = Template.bind({});
TagList.args = {
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
		{
			name: 'agree',
			properties: {
				type: 'checkbox',
				label:
					'Signup for newsletter and somebody from our marketing team will get in touch with you as soon as possible. You will not spam you, just want to send you some love every now and then ❤️',
				labelSize: 'small',
				tooltipText: 'Check this if you agree to be contacted by our marketing team',
			},
		},
		{
			name: 'activate',
			properties: {
				type: 'toggle',
				label: 'Activated',
				activeColor: '#13ce66',
				inactiveColor: '#8899AA',
				tooltipText: 'Check this if you agree to be contacted by our marketing team',
			},
		},
	],
};
