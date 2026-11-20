import type { StoryFn } from '@storybook/vue3-vite';

import BlinkingCursor from './BlinkingCursor.vue';

export default {
	title: 'Areas/Assistant/BlinkingCursor',
	component: BlinkingCursor,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		BlinkingCursor,
	},
	template: '<blinking-cursor v-bind="args" />',
});

export const Default = Template.bind({});
