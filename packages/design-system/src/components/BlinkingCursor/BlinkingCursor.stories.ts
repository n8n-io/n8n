import BlinkingCursor from './BlinkingCursor.vue';
import type { StoryFn } from '@storybook/vue3';

export default {
	title: 'Assistant/BlinkingCursor',
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

export const Cursor = Template.bind({});
