import AskAssistantChat from './AskAssistantChat.vue';
import type { StoryFn } from '@storybook/vue3';
import type { ChatUI } from '../../types/assistant';

export default {
	title: 'Atoms/AskAssistantChat',
	component: AskAssistantChat,
	argTypes: {},
};

function getMessages(messages: ChatUI.AssistantMessage[]): ChatUI.AssistantMessage[] {
	return messages;
}

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

export const Chat = Template.bind({});
Chat.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '1',
			type: 'text',
			role: 'assistant',
			content: 'Hi Max! Here is my top solution to fix the error in your **Transform data** node👇',
		},
		{
			id: '1',
			type: 'code-diff',
			role: 'assistant',
			description: 'Short solution description here that can spill over to two lines',
			codeDiff:
				'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can be named is not the eternal name.\nThe Nameless is the origin of Heaven and Earth;\n-The Named is the mother of all things.\n+The named is the mother of all things.\n+\nTherefore let there always be non-being,\nso we may see their subtlety,\nAnd let there always be being,\n@@ -9,3 +8,6 @@\n The two are the same,\n But after they are produced,\n they have different names.\n+They both may be called deep and profound.\n+Deeper and more profound,\n+The door of all subtleties!',
			suggestionId: 'test',
			quickReplies: [
				{
					type: 'new-suggestion',
					content: 'Give me another solution',
				},
				{
					type: 'resolved',
					content: 'All good',
				},
			],
		},
		{
			id: '2',
			type: 'text',
			role: 'user',
			content: 'Give it to me **ignore this markdown**',
		},
		{
			id: '2',
			type: 'block',
			role: 'assistant',
			title: 'Credential doesn’t have correct permissions to send a message',
			content:
				'Solution steps:\n1. Lorem ipsum dolor sit amet, consectetur **adipiscing** elit. Proin id nulla placerat, tristique ex at, euismod dui.\n2. Copy this into somewhere\n3. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui.\n4. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui. \n Testing more code \n - Unordered item 1 \n - Unordered item 2',
		},
		{
			id: '2',
			type: 'code-diff',
			role: 'assistant',
			description: 'Short solution with min height',
			// codeDiff:
			// '--- original.js\n+++ modified.js\n- cons a = 1\n+ const a = 1\n\n+for (const item of items) {\n+  item.json.myNewField = 1;\n+}\n\n+return items;',
			codeDiff:
				'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can be named is not the eternal name.\n+The door of all subtleties!',
			quickReplies: [
				{
					type: 'new-suggestion',
					content: 'Give me another solution',
				},
				{
					type: 'resolved',
					content: 'All good',
				},
			],
			suggestionId: 'test',
		},
	]),
};

export const JustSummary = Template.bind({});
JustSummary.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '123',
			role: 'assistant',
			type: 'block',
			title: 'Credential doesn’t have correct permissions to send a message',
			content:
				'Solution steps:\n1. Lorem ipsum dolor sit amet, consectetur **adipiscing** elit. Proin id nulla placerat, tristique ex at, euismod dui.\n2. Copy this into somewhere\n3. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui.\n4. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui. \n Testing more code \n - Unordered item 1 \n - Unordered item 2',
		},
	]),
};

export const SummaryTitleStreaming = Template.bind({});
SummaryTitleStreaming.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '123',
			role: 'assistant',
			type: 'block',
			title: 'Credential doesn’t have',
			content: '',
		},
	]),
	streaming: true,
};

export const SummaryContentStreaming = Template.bind({});
SummaryTitleStreaming.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '123',
			role: 'assistant',
			type: 'block',
			title: 'Credential doesn’t have correct permissions to send a message',
			content: 'Solution steps:\n1. Lorem ipsum dolor sit amet, consectetur',
		},
	]),
	streaming: true,
};

export const ErrorChat = Template.bind({});
ErrorChat.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '123',
			role: 'assistant',
			type: 'error',
			content: 'There was an error reaching the service',
		},
	]),
};

export const EmptyStreamingChat = Template.bind({});
EmptyStreamingChat.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '123',
			type: 'text',
			role: 'assistant',
			content: '',
		},
	]),
	streaming: true,
};

export const StreamingChat = Template.bind({});
StreamingChat.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '123',
			type: 'text',
			role: 'assistant',
			content: 'I am thinking through this problem',
		},
	]),
	streaming: true,
};

export const EndOfSessionChat = Template.bind({});
EndOfSessionChat.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '123',
			type: 'text',
			role: 'assistant',
			content: "Great, glad I could help! I'm here whenever you need more help.",
		},
		{
			id: '123',
			role: 'assistant',
			type: 'end-session',
		},
	]),
};
