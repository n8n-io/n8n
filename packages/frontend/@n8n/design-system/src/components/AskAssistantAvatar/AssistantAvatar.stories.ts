import type { StoryFn } from '@storybook/vue3';

import AssistantAvatar from './AssistantAvatar.vue';

export default {
	title: 'Assistant/AssistantAvatar',
	component: AssistantAvatar,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		AssistantAvatar,
	},
	template: '<AssistantAvatar v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};

export const Mini = Template.bind({});
Mini.args = {
	size: 'mini',
};
