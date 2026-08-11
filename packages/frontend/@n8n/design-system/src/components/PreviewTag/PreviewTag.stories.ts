import type { StoryFn } from '@storybook/vue3-vite';

import PreviewTag from './PreviewTag.vue';

export default {
	title: 'Core/PreviewTag',
	component: PreviewTag,
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
		PreviewTag,
	},
	template: '<PreviewTag v-bind="args" />',
});

export const Small = Template.bind({});
Small.args = { size: 'small' };

export const Medium = Template.bind({});
Medium.args = { size: 'medium' };
