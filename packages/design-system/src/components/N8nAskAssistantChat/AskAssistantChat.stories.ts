import AskAssistantChat from './AskAssistantChat.vue';
import type { StoryFn } from '@storybook/vue3';
import type { AssistantMessage } from './types';

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

export const DefaultPlaceholderChat = Template.bind({});
DefaultPlaceholderChat.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
};

const messages: AssistantMessage[] = [
	{
		type: 'text',
		role: 'assistant',
		content: 'Hi Max! Here is my top solution to fix the error in your **Transform data** node👇',
	},
	{
		type: 'code-diff',
		role: 'assistant',
		description: 'Short solution description here that can spill over to two lines',
		codeDiff:
			'--- original.js\n+++ modified.js\n- cons a = 1\n+ const a = 1\n\n+for (const item of items) {\n+  item.json.myNewField = 1;\n+}\n\n+return items;',
	},
	{
		type: 'quick-replies',
		role: 'assistant',
		options: [
			{
				type: 'new-suggestion',
				label: 'Give me another solution',
			},
			{
				type: 'resolved',
				label: 'All good',
			},
		],
	},
	{
		type: 'text',
		role: 'user',
		content: 'Give it to me **ignore this markdown**',
	},
	{
		type: 'text',
		role: 'assistant',
		title: 'Another solution',
		content:
			'Solution steps:\n1. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui.\n2. Copy this into somewhere\n3. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui.\n4. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui.',
	},
];
export const Chat = Template.bind({});
Chat.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages,
};
