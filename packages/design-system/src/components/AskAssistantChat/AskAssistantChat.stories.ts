import AskAssistantChat from './AskAssistantChat.vue';
import type { StoryFn } from '@storybook/vue3';
import type { ChatUI } from '../../types/assistant';

export default {
	title: 'Assistant/AskAssistantChat',
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
			read: false,
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
					text: 'Give me another solution',
				},
				{
					type: 'resolved',
					text: 'All good',
				},
			],
			read: false,
		},
		{
			id: '2',
			type: 'text',
			role: 'user',
			content: 'Give it to me **ignore this markdown**',
			read: false,
		},
		{
			id: '2',
			type: 'block',
			role: 'assistant',
			title: 'Credential doesn’t have correct permissions to send a message',
			content:
				'Solution steps:\n1. Lorem ipsum dolor sit amet, consectetur **adipiscing** elit. Proin id nulla placerat, tristique ex at, euismod dui.\n2. Copy this into somewhere\n3. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui.\n4. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui. \n Testing more code \n - Unordered item 1 \n - Unordered item 2',
			read: false,
		},
		{
			id: '2',
			type: 'code-diff',
			role: 'assistant',
			description: 'Short solution with min height',
			codeDiff:
				'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can be named is not the eternal name.\n+The door of all subtleties!',
			quickReplies: [
				{
					type: 'new-suggestion',
					text: 'Give me another solution',
				},
				{
					type: 'resolved',
					text: 'All good',
				},
			],
			suggestionId: 'test',
			read: false,
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
			read: false,
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
			read: false,
		},
	]),
	streaming: true,
};

export const SummaryContentStreaming = Template.bind({});
SummaryContentStreaming.args = {
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
			read: false,
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
			read: false,
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
			read: false,
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
			read: false,
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
			read: false,
		},
		{
			id: '123',
			role: 'assistant',
			type: 'event',
			eventName: 'end-session',
			read: false,
		},
	]),
};

export const AssistantThinkingChat = Template.bind({});
AssistantThinkingChat.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	loadingMessage: 'Thinking...',
};

export const WithCodeSnippet = Template.bind({});
WithCodeSnippet.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '58575953',
			type: 'text',
			role: 'assistant',
			content:
				'To filter every other item in the Code node, you can use the following JavaScript code snippet. This code will iterate through the incoming items and only pass through every other item.',
			codeSnippet:
				"node.on('input', function(msg) {\n  if (msg.seed) { dummyjson.seed = msg.seed; }\n  try {\n      var value = dummyjson.parse(node.template, {mockdata: msg});\n      if (node.syntax === 'json') {\n          try { value = JSON.parse(value); }\n          catch(e) { node.error(RED._('datagen.errors.json-error')); }\n      }\n      if (node.fieldType === 'msg') {\n          RED.util.setMessageProperty(msg,node.field,value);\n      }\n      else if (node.fieldType === 'flow') {\n          node.context().flow.set(node.field,value);\n      }\n      else if (node.fieldType === 'global') {\n          node.context().global.set(node.field,value);\n      }\n      node.send(msg);\n  }\n  catch(e) {",
			read: true,
		},
	]),
};
