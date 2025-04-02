import type { StoryFn } from '@storybook/vue3';

import N8nHeading from './Heading.vue';

export default {
	title: 'Atoms/Heading',
	component: N8nHeading,
	argTypes: {
		size: {
			control: {
				type: 'select',
			},
			options: ['2xlarge', 'xlarge', 'large', 'medium', 'small'],
		},
		color: {
			control: {
				type: 'select',
			},
			options: ['primary', 'text-dark', 'text-base', 'text-light', 'text-xlight'],
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nHeading,
	},
	template: '<n8n-heading v-bind="args">hello world</n8n-heading>',
});

export const Heading = Template.bind({});
