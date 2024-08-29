import AssistantLoadingMessage from './AssistantLoadingMessage.vue';
import type { StoryFn } from '@storybook/vue3';

export default {
	title: 'Assistant/AskAssistantLoadingMessage',
	component: AssistantLoadingMessage,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		AssistantLoadingMessage,
	},
	template: '<AssistantLoadingMessage v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {
	message: 'Thinking...',
};
