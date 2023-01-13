import type { StoryFn } from '@storybook/vue3';
import { N8nSpinner } from './index';

export default {
	title: 'Atoms/Spinner',
	component: N8nSpinner,
	argTypes: {
		size: {
			control: {
				type: 'select',
				options: ['small', 'medium', 'large'],
			},
		},
		type: {
			control: {
				type: 'select',
				options: ['dots', 'ring'],
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nSpinner,
	},
	setup() {
		return { args };
	},
	template: '<N8nSpinner v-bind="args" />',
});

export const Spinner = Template.bind({});
