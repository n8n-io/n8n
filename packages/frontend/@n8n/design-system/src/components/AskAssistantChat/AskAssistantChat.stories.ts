import type { StoryFn } from '@storybook/vue3';

import AskAssistantChat from './AskAssistantChat.vue';
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
	template: '<div style="width:275px; height:500px"><ask-assistant-chat v-bind="args" /></div>',
	methods,
});

const TemplateWithInputPlaceholder: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		AskAssistantChat,
	},
	template: `
		<div style="width:275px; height:500px">
			<ask-assistant-chat v-bind="args" >
				<template #inputPlaceholder>
					<button>Click me</button>
				</template>
			</ask-assistant-chat>
		</div>
	`,
	methods,
});

export const DefaultPlaceholderChat = Template.bind({});
DefaultPlaceholderChat.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
};

export const InputPlaceholderChat = TemplateWithInputPlaceholder.bind({});
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
			title: "Credential doesn't have correct permissions to send a message",
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
			title: "Credential doesn't have correct permissions to send a message",
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
			title: "Credential doesn't have",
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
			title: "Credential doesn't have correct permissions to send a message",
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

export const RichTextMessage = Template.bind({});
RichTextMessage.args = {
	user: {
		firstName: 'Kobi',
		lastName: 'Dog',
	},
	messages: getMessages([
		{
			id: '29083188',
			role: 'user',
			type: 'text',
			content: 'Hey',
			read: true,
		},
		{
			id: '29083188',
			type: 'text',
			role: 'assistant',
			content: 'Hello Kobi! How can I assist you with n8n today?',
			read: true,
		},
		{
			id: '21514129',
			role: 'user',
			type: 'text',
			content: 'Can you show me a message example with paragraphs, lists and links?',
			read: true,
		},
		{
			id: '21514129',
			type: 'text',
			role: 'assistant',
			content:
				"Sure: \n\nTo connect your Slack account to n8n, follow these steps:\n\n1. Open your [Slack API Apps](https://api.slack.com/apps) page.\n2. Select **Create New App > From scratch**.\n3. Enter an **App Name**.\n4. Select the **Workspace** where you'll be developing your app.\n5. Select **Create App**.\n6. In **Basic Information**, open the **App Credentials** section.\n7. Copy the **Client ID** and **Client Secret**. Paste these into the corresponding fields in n8n.\n8. In **Basic Information > Building Apps for Slack**, select **Add features and functionality**.\n9. Select **Permissions**.\n10. In the **Redirect URLs** section, select **Add New Redirect URL**.\n\nFor more details, you can refer to the [Slack API Quickstart](https://api.slack.com/quickstart) and the [Installing with OAuth](https://api.slack.com/authentication/oauth-v2) documentation.",
			codeSnippet: '',
			read: true,
		},
		{
			id: '86572001',
			role: 'user',
			type: 'text',
			content: 'Can you show me an example of a table?',
			read: true,
		},
		{
			id: '86572001',
			type: 'text',
			role: 'assistant',
			content:
				'Sure, here it is:\n\n| **Scope name** | **Notes** |\n| --- | --- |\n| `channels:read` | |\n| `channels:write` | Not available as a bot token scope |\n| `stars:read`| Not available as a bot token scope |\n| `stars:write` | Not available as a bot token scope |\n| `users.profile:write` | Not available as a bot token scope |\n| `users:read` | |',
			read: true,
		},
		{
			id: '86572001',
			role: 'user',
			type: 'text',
			content: 'Thanks, can you send me another one with more columns?',
			read: true,
		},
		{
			id: '86572001',
			type: 'text',
			role: 'assistant',
			content:
				'Yup:\n\n| **Scope name** | **Notes** | **One More Column** |\n| --- | --- | --- |\n| `channels:read` | | Something else |\n| `channels:write` | Not available as a bot token scope | Something else |\n| `stars:read`| Not available as a bot token scope |\n| `stars:write` | Not available as a bot token scope |\n| `users.profile:write` | Not available as a bot token scope |\n| `users:read` | |',
			read: true,
		},
		{
			id: '2556642',
			role: 'user',
			type: 'text',
			content: 'Great',
			read: true,
		},
		{
			id: '2556642',
			type: 'text',
			role: 'assistant',
			content:
				"I'm glad you found the information helpful! If you have any more questions about n8n or need further assistance, feel free to ask.",
			read: true,
		},
		{
			id: '2556642',
			type: 'text',
			role: 'assistant',
			content: 'Did this answer solve your question?',
			quickReplies: [
				{
					text: 'Yes, thanks',
					type: 'all-good',
					isFeedback: true,
				},
				{
					text: 'No, I am still stuck',
					type: 'still-stuck',
					isFeedback: true,
				},
			],
			read: true,
		},
	]),
};

export const TextMessageWithRegularRating = Template.bind({});
TextMessageWithRegularRating.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '127',
			type: 'text',
			role: 'assistant',
			content:
				"I've generated a workflow that automatically processes your CSV files and sends email notifications. The workflow includes error handling and data validation steps.",
			read: false,
			showRating: true,
			ratingStyle: 'regular',
			showFeedback: true,
		},
	]),
};

export const TextMessageWithMinimalRating = Template.bind({});
TextMessageWithMinimalRating.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '128',
			type: 'text',
			role: 'assistant',
			content:
				"Here's a quick tip: You can use the Code node to transform data between different formats.",
			read: false,
			showRating: true,
			ratingStyle: 'minimal',
			showFeedback: true,
		},
	]),
};

export const MultipleMessagesWithRatings = Template.bind({});
MultipleMessagesWithRatings.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '129',
			type: 'text',
			role: 'user',
			content: 'Can you help me create a workflow for processing webhooks?',
			read: true,
		},
		{
			id: '130',
			type: 'text',
			role: 'assistant',
			content: "I'll help you create a webhook processing workflow. Here are the steps:",
			read: true,
			showRating: true,
			ratingStyle: 'minimal',
			showFeedback: true,
		},
		{
			id: '131',
			type: 'text',
			role: 'assistant',
			content: `Follow these steps:
1. Add a Webhook node to receive incoming data
2. Use a Switch node to route based on webhook type
3. Add data transformation with a Code node
4. Store results in your database`,
			read: true,
		},
		{
			id: '132',
			type: 'text',
			role: 'assistant',
			content:
				'This workflow will handle incoming webhooks efficiently and store the processed data.',
			read: false,
			showRating: true,
			ratingStyle: 'regular',
			showFeedback: true,
		},
	]),
};

export const CodeDiffWithMinimalRating = Template.bind({});
CodeDiffWithMinimalRating.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '133',
			type: 'code-diff',
			role: 'assistant',
			description: 'Fix the error handling in your code',
			codeDiff:
				'@@ -1,3 +1,8 @@\\n const data = await fetchData();\\n-return data;\\n+\\n+if (!data || data.error) {\\n+  throw new Error(data?.error || "Failed to fetch data");\\n+}\\n+\\n+return data;',
			suggestionId: 'fix_error_handling',
			read: false,
			showRating: true,
			ratingStyle: 'minimal',
			showFeedback: true,
		},
	]),
};

export const ToolMessageRunning = Template.bind({});
ToolMessageRunning.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '127',
			type: 'tool',
			role: 'assistant',
			toolName: 'code_tool',
			toolCallId: 'call_123',
			status: 'running',
			updates: [
				{
					type: 'progress',
					data: { message: 'Analyzing the codebase structure...' },
					timestamp: new Date().toISOString(),
				},
				{
					type: 'input',
					data: {
						query: 'Find all Vue components in the project',
						path: '/src/components',
					},
					timestamp: new Date().toISOString(),
				},
			],
			read: false,
		},
	]),
};

export const ToolMessageCompleted = Template.bind({});
ToolMessageCompleted.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '128',
			type: 'tool',
			role: 'assistant',
			toolName: 'search_files',
			toolCallId: 'call_456',
			status: 'completed',
			updates: [
				{
					type: 'input',
					data: {
						pattern: '*.vue',
						directory: '/src',
					},
					timestamp: new Date().toISOString(),
				},
				{
					type: 'progress',
					data: { message: 'Searching for Vue files...' },
					timestamp: new Date().toISOString(),
				},
				{
					type: 'output',
					data: {
						files: [
							'/src/components/Button.vue',
							'/src/components/Modal.vue',
							'/src/views/Home.vue',
						],
						count: 3,
					},
					timestamp: new Date().toISOString(),
				},
			],
			read: false,
		},
	]),
};

export const ToolMessageError = Template.bind({});
ToolMessageError.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '129',
			type: 'tool',
			role: 'assistant',
			toolName: 'database_query',
			toolCallId: 'call_789',
			status: 'error',
			updates: [
				{
					type: 'input',
					data: {
						query: 'SELECT * FROM users WHERE id = 123',
						database: 'production',
					},
					timestamp: new Date().toISOString(),
				},
				{
					type: 'progress',
					data: { message: 'Connecting to database...' },
					timestamp: new Date().toISOString(),
				},
				{
					type: 'error',
					data: {
						error: 'Connection timeout',
						details: 'Failed to connect to database after 30 seconds',
					},
					timestamp: new Date().toISOString(),
				},
			],
			read: false,
		},
	]),
};

export const MixedMessagesWithTools = Template.bind({});
MixedMessagesWithTools.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '130',
			type: 'text',
			role: 'user',
			content: 'Can you help me analyze my workflow?',
			read: true,
		},
		{
			id: '131',
			type: 'text',
			role: 'assistant',
			content: "I'll analyze your workflow now. Let me search for the relevant files.",
			read: true,
		},
		{
			id: '132',
			type: 'tool',
			role: 'assistant',
			toolName: 'search_workflow_files',
			toolCallId: 'call_999',
			status: 'completed',
			updates: [
				{
					type: 'input',
					data: {
						workflowId: 'wf_123',
						includeNodes: true,
					},
					timestamp: new Date().toISOString(),
				},
				{
					type: 'progress',
					data: { message: 'Loading workflow configuration...' },
					timestamp: new Date().toISOString(),
				},
				{
					type: 'progress',
					data: { message: 'Analyzing node connections...' },
					timestamp: new Date().toISOString(),
				},
				{
					type: 'output',
					data: {
						nodes: 5,
						connections: 8,
						issues: ['Missing error handling in HTTP node', 'Unused variable in Code node'],
					},
					timestamp: new Date().toISOString(),
				},
			],
			read: true,
		},
		{
			id: '133',
			type: 'text',
			role: 'assistant',
			content: 'I found some issues in your workflow. Here are my recommendations:',
			read: true,
		},
		{
			id: '134',
			type: 'code-diff',
			role: 'assistant',
			description: 'Add error handling to your HTTP node',
			codeDiff:
				// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
				'@@ -1,3 +1,8 @@\n const response = await $http.request(options);\n-return response.data;\n+\n+if (response.status !== 200) {\n+  throw new Error(`HTTP request failed with status ${response.status}`);\n+}\n+\n+return response.data;',
			suggestionId: 'fix_http_error',
			read: false,
		},
	]),
};
