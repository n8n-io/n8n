import type { StoryFn } from '@storybook/vue3-vite';

import PreviewBadge from './PreviewBadge.vue';

export default {
	title: 'Core/PreviewBadge',
	component: PreviewBadge,
	argTypes: {
		size: {
			control: 'select',
			options: ['small', 'medium'],
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PreviewBadge,
	},
	template: '<PreviewBadge v-bind="args" />',
});

export const Small = Template.bind({});
Small.args = { size: 'small' };

export const Medium = Template.bind({});
Medium.args = { size: 'medium' };
