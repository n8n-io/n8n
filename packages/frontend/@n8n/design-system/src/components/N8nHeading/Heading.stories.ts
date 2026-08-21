import type { StoryFn } from '@storybook/vue3-vite';

import N8nHeading from './Heading.vue';

export default {
	title: 'Core/Heading',
	component: N8nHeading,
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
			options: ['2xlarge', 'xlarge', 'large', 'medium', 'small'],
		},
		color: {
			control: {
				type: 'select',
			},
			options: ['primary', 'text-dark', 'text-base', 'text-light', 'text-xlight'],
		},
		bold: {
			control: 'boolean',
		},
	},

	parameters: {
		docs: {
			description: { component: 'A typographic heading component for section and page titles.' },
		},
	},
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: {
		N8nHeading,
	},
	template: '<N8nHeading v-bind="args">The quick brown fox</N8nHeading>',
});

export const Regular = Template.bind({});
Regular.args = {
	size: 'large',
	bold: false,
};

export const Bold = Template.bind({});
Bold.args = {
	size: 'large',
	bold: true,
};
