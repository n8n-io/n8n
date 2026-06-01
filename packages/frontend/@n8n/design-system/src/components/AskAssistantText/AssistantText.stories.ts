import type { StoryFn } from '@storybook/vue3-vite';

import AssistantText from './AssistantText.vue';

export default {
	title: 'Assistant/AssistantText',
	component: AssistantText,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		AssistantText,
	},
	template: '<AssistantText v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {
	text: 'Ask me something!!!',
};

export const Small = Template.bind({});
Small.args = {
	text: 'Ask me something!!!',
	size: 'small',
};

export const Medium = Template.bind({});
Medium.args = {
	text: 'Ask me something!!!',
	size: 'medium',
};

export const Large = Template.bind({});
Large.args = {
	text: 'Ask me something!!!',
	size: 'large',
};
