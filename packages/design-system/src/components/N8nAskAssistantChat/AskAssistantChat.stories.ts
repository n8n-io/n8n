import AskAssistantChat from './AskAssistantChat.vue';
import type { StoryFn } from '@storybook/vue3';

export default {
	title: 'Atoms/AskAssistantChat',
	component: AskAssistantChat,
	argTypes: {},
};

const methods = {};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		AskAssistantChat,
	},
	template: '<div style="width:275px; height:100%"><ask-assistant-chat v-bind="args" /></div>',
	methods,
});

export const Chat = Template.bind({});
