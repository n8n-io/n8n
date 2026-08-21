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
		text: {
			control: 'text',
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A small pill used to mark preview or early-access surfaces.',
			},
		},
	},
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: {
		PreviewTag,
	},
	template: '<PreviewTag v-bind="args" />',
});

export const Small = Template.bind({});
Small.args = { size: 'small', text: 'Preview' };

export const Medium = Template.bind({});
Medium.args = { size: 'medium', text: 'Preview' };
