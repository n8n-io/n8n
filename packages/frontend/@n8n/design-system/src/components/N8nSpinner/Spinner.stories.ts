import type { StoryFn } from '@storybook/vue3-vite';

import N8nSpinner from './Spinner.vue';

export default {
	title: 'Atoms/Spinner',
	component: N8nSpinner,
	argTypes: {
		size: {
			control: {
				type: 'select',
			},
			options: ['small', 'medium', 'large'],
		},
		type: {
			control: {
				type: 'select',
			},
			options: ['dots', 'ring'],
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nSpinner,
	},
	template: '<n8n-spinner v-bind="args" />',
});

export const Spinner = Template.bind({});
