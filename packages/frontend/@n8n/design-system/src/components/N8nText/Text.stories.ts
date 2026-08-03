import type { StoryFn } from '@storybook/vue3-vite';

import N8nText from './Text.vue';

export default {
	title: 'Core/Text',
	component: N8nText,
	argTypes: {
		step: {
			control: {
				type: 'select',
			},
			options: [undefined, '4xs', '3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
		},
		size: {
			control: {
				type: 'select',
			},
			options: ['xsmall', 'small', 'medium', 'large'],
		},
		color: {
			control: {
				type: 'select',
			},
			options: [
				'primary',
				'text-dark',
				'text-base',
				'text-light',
				'text-xlight',
				'danger',
				'success',
			],
		},
	},

	parameters: {
		docs: {
			description: { component: 'A typography component for styled body text and inline copy.' },
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nText,
	},
	template: '<n8n-text v-bind="args">hello world</n8n-text>',
});

export const Text = Template.bind({});
