import type { StoryFn } from '@storybook/vue3-vite';

import AskAssistantChat from './AskAssistantChat.vue';
import type { ChatUI, WorkflowSuggestion } from '../../types/assistant';

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
	template: '<div style="width:380px; height:500px"><ask-assistant-chat v-bind="args" /></div>',
	methods,
});

export const DefaultPlaceholderChat = Template.bind({});
DefaultPlaceholderChat.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
};

const mockSuggestions: WorkflowSuggestion[] = [
	{
		id: 'invoice-pipeline',
		summary: 'Invoice processing pipeline',
		prompt:
			'Create an invoice parsing workflow using n8n forms. Extract key information and store in Airtable.',
	},
	{
		id: 'ai-news-digest',
		summary: 'Daily AI news digest',
		prompt:
			'Create a workflow that fetches the latest AI news every morning at 8 AM and sends a summary via Telegram.',
	},
	{
		id: 'rag-assistant',
		summary: 'RAG knowledge assistant',
		prompt:
			'Build a pipeline that accepts PDF files, chunks documents, and creates a chatbot that can answer questions.',
	},
];

export const WithSuggestions = Template.bind({});
WithSuggestions.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	suggestions: mockSuggestions,
	creditsQuota: 100,
	creditsRemaining: 75,
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

export const ToolMessageStates = Template.bind({});
ToolMessageStates.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '127',
			type: 'tool',
			role: 'assistant',
			toolName: 'search_files',
			toolCallId: 'call_456',
			status: 'completed',
			displayTitle: 'Search Files',
			updates: [],
			read: false,
		},
		{
			id: '128',
			type: 'tool',
			role: 'assistant',
			toolName: 'database_query',
			toolCallId: 'call_789',
			status: 'error',
			displayTitle: 'Database Query',
			updates: [],
			read: false,
		},
		{
			id: '129',
			type: 'tool',
			role: 'assistant',
			toolName: 'code_tool',
			toolCallId: 'call_123',
			status: 'running',
			displayTitle: 'Code Tool',
			updates: [],
			read: false,
		},
	]),
};

const SEARCH_FILES_TOOL_CALL_COMPLETED: ChatUI.AssistantMessage = {
	id: '128',
	type: 'tool',
	role: 'assistant',
	toolName: 'search_files',
	toolCallId: 'call_456',
	status: 'completed',
	displayTitle: 'Searching files',
	customDisplayTitle: 'Searching for Reddit node',
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
				files: ['/src/components/Button.vue', '/src/components/Modal.vue', '/src/views/Home.vue'],
				count: 3,
			},
			timestamp: new Date().toISOString(),
		},
	],
	read: false,
};

const SEARCH_FILES_TOOL_CALL_COMPLETED_2: ChatUI.AssistantMessage = {
	...SEARCH_FILES_TOOL_CALL_COMPLETED,
	displayTitle: 'Searching nodes',
	customDisplayTitle: 'Searching for Spotify node',
};

const SEARCH_FILES_TOOL_CALL_RUNNING: ChatUI.AssistantMessage = {
	...SEARCH_FILES_TOOL_CALL_COMPLETED,
	status: 'running',
	customDisplayTitle: 'Searching for Open AI nodes',
};

const SEARCH_FILES_TOOL_CALL_RUNNING_2: ChatUI.AssistantMessage = {
	...SEARCH_FILES_TOOL_CALL_COMPLETED,
	status: 'running',
	customDisplayTitle: 'Searching for Slack node',
};

const SEARCH_FILES_TOOL_CALL_ERROR: ChatUI.AssistantMessage = {
	...SEARCH_FILES_TOOL_CALL_COMPLETED,
	status: 'error',
	customDisplayTitle: 'Searching for Power node',
};

const SEARCH_FILES_TOOL_CALL_ERROR_2: ChatUI.AssistantMessage = {
	...SEARCH_FILES_TOOL_CALL_COMPLETED,
	status: 'error',
	customDisplayTitle: 'Searching for n8n node',
};

function getMessage(content: string): ChatUI.AssistantMessage {
	return {
		id: '130',
		type: 'text',
		role: 'user',
		content,
		read: true,
	};
}

export const ToolMessageMultiple = Template.bind({});
ToolMessageMultiple.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		getMessage('Collapse multiple consecutive completed tool calls into one'),
		SEARCH_FILES_TOOL_CALL_COMPLETED,
		SEARCH_FILES_TOOL_CALL_COMPLETED_2,
		getMessage('Collapse multiple consecutive completed and running tool calls into one'),
		SEARCH_FILES_TOOL_CALL_COMPLETED,
		SEARCH_FILES_TOOL_CALL_RUNNING,
		SEARCH_FILES_TOOL_CALL_RUNNING_2,
		getMessage('Collapse multiple consecutive error and running tool calls into running'),
		SEARCH_FILES_TOOL_CALL_ERROR,
		SEARCH_FILES_TOOL_CALL_RUNNING,
		getMessage('Collapse multiple consecutive error and completed tool calls into completed'),
		SEARCH_FILES_TOOL_CALL_ERROR,
		SEARCH_FILES_TOOL_CALL_COMPLETED,
		getMessage('Collapse multiple consecutive running tool calls into one running'),
		SEARCH_FILES_TOOL_CALL_RUNNING,
		SEARCH_FILES_TOOL_CALL_RUNNING_2,
		getMessage('Collapse multiple consecutive error tool calls into one error'),
		SEARCH_FILES_TOOL_CALL_ERROR,
		SEARCH_FILES_TOOL_CALL_ERROR_2,
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

export const ToolCallsWithThinking = Template.bind({});
ToolCallsWithThinking.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: 'msg-1',
			type: 'text',
			role: 'user',
			content: 'Can you help me process some data?',
			read: true,
		},
		{
			id: 'msg-2',
			type: 'text',
			role: 'assistant',
			content: "Of course I'd be happy to help you!",
			read: true,
		},
		{
			id: 'tool-1',
			type: 'tool',
			role: 'assistant',
			toolName: 'code_tool',
			toolCallId: 'call_code_1',
			status: 'completed',
			displayTitle: 'Code Tool',
			updates: [],
			read: true,
		},
		{
			id: 'tool-2',
			type: 'tool',
			role: 'assistant',
			toolName: 'web_search',
			toolCallId: 'call_web_1',
			status: 'completed',
			displayTitle: 'Web Search',
			updates: [],
			read: true,
		},
		{
			id: 'tool-3',
			type: 'tool',
			role: 'assistant',
			toolName: 'calculator',
			toolCallId: 'call_calc_1',
			status: 'completed',
			displayTitle: 'Calculator',
			updates: [],
			read: true,
		},
	]),
	loadingMessage: 'Thinking...',
	streaming: true,
};

export const CompletedToolCallsWithSummary = Template.bind({});
CompletedToolCallsWithSummary.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: 'msg-1',
			type: 'text',
			role: 'user',
			content: 'Can you help me build a workflow?',
			read: true,
		},
		{
			id: 'msg-2',
			type: 'text',
			role: 'assistant',
			content: "Of course I'd be happy to help you!",
			read: true,
		},
		{
			id: 'tool-1',
			type: 'tool',
			role: 'assistant',
			toolName: 'code_tool',
			toolCallId: 'call_code_1',
			status: 'completed',
			displayTitle: 'Code Tool',
			updates: [],
			read: true,
		},
		{
			id: 'tool-2',
			type: 'tool',
			role: 'assistant',
			toolName: 'web_search',
			toolCallId: 'call_web_1',
			status: 'completed',
			displayTitle: 'Web Search',
			updates: [],
			read: true,
		},
		{
			id: 'tool-3',
			type: 'tool',
			role: 'assistant',
			toolName: 'calculator',
			toolCallId: 'call_calc_1',
			status: 'completed',
			displayTitle: 'Calculator',
			updates: [],
			read: true,
		},
		{
			id: 'tool-4',
			type: 'tool',
			role: 'assistant',
			toolName: 'builder',
			toolCallId: 'call_builder_1',
			status: 'completed',
			displayTitle: 'Builder',
			updates: [],
			read: true,
		},
		{
			id: 'msg-3',
			type: 'text',
			role: 'assistant',
			content: `#### 📝 What's been completed
• Code Tool ran
• Web Search executed
• Calculator calculated
• Builder built`,
			read: false,
		},
	]),
};

export const TaskAborted = Template.bind({});
TaskAborted.args = {
	messages: [
		{
			id: 'user-msg',
			type: 'text',
			role: 'user',
			content: 'Create a workflow to process emails',
			read: true,
		},
		{
			id: 'tool-1',
			type: 'tool',
			role: 'assistant',
			toolName: 'workflow_builder',
			toolCallId: 'call_builder_1',
			status: 'running',
			displayTitle: 'Building Workflow',
			updates: [],
			read: true,
		},
		{
			id: 'abort-msg',
			type: 'text',
			role: 'assistant',
			content: 'Task aborted',
			read: true,
		},
	],
};

export const ScrollbarWithManyMessages = Template.bind({});
ScrollbarWithManyMessages.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages: getMessages([
		{
			id: '1',
			type: 'text',
			role: 'user',
			content: 'Hey, can you help me with a workflow?',
			read: true,
		},
		{
			id: '2',
			type: 'text',
			role: 'assistant',
			content:
				"Of course! I'd be happy to help you create a workflow. What would you like to build?",
			read: true,
		},
		{
			id: '3',
			type: 'text',
			role: 'user',
			content: 'I need to connect Slack to Google Sheets',
			read: true,
		},
		{
			id: '4',
			type: 'text',
			role: 'assistant',
			content:
				"Great! I can help you set up a workflow that connects Slack to Google Sheets. Here's what we'll need to do:",
			read: true,
		},
		{
			id: '5',
			type: 'block',
			role: 'assistant',
			title: 'Steps to connect Slack and Google Sheets',
			content: `1. Add a Slack Trigger node to your workflow
2. Configure it to listen for specific events (like new messages in a channel)
3. Add a Google Sheets node
4. Set up authentication for both services
5. Map the data from Slack to your Google Sheets columns`,
			read: true,
		},
		{
			id: '6',
			type: 'text',
			role: 'user',
			content: 'That sounds good. Can you show me how to set up the Slack trigger?',
			read: true,
		},
		{
			id: '7',
			type: 'text',
			role: 'assistant',
			content: "Here's how to set up the Slack Trigger node:",
			read: true,
		},
		{
			id: '8',
			type: 'block',
			role: 'assistant',
			title: 'Slack Trigger Configuration',
			content: `**Event Type**: Choose the event you want to monitor (e.g., "New Message Posted to Channel")

**Channel**: Select the Slack channel you want to watch

**Credentials**: You'll need to authenticate with Slack by:
- Creating a Slack app
- Adding the necessary OAuth scopes
- Installing the app to your workspace

Once configured, the trigger will activate whenever the specified event occurs.`,
			read: true,
		},
		{
			id: '9',
			type: 'text',
			role: 'user',
			content: 'What about the Google Sheets part?',
			read: true,
		},
		{
			id: '10',
			type: 'text',
			role: 'assistant',
			content:
				'For Google Sheets, you\'ll want to use the "Append" operation to add new rows. Here\'s the configuration:',
			read: true,
		},
		{
			id: '11',
			type: 'code-diff',
			role: 'assistant',
			description: 'Example data mapping from Slack to Google Sheets',
			codeDiff: `@@ -1,3 +1,10 @@
+// Map Slack message data to Google Sheets columns
+{
+  "Timestamp": "{{ $json.ts }}",
+  "User": "{{ $json.user }}",
+  "Channel": "{{ $json.channel }}",
+  "Message": "{{ $json.text }}",
+  "Thread": "{{ $json.thread_ts }}"
+}`,
			suggestionId: 'sheets-mapping',
			read: true,
		},
		{
			id: '12',
			type: 'text',
			role: 'user',
			content: 'Perfect! How do I handle errors?',
			read: true,
		},
		{
			id: '13',
			type: 'text',
			role: 'assistant',
			content: 'Good thinking! Let me check for error handling best practices in your workflow.',
			read: true,
		},
		{
			id: '14',
			type: 'tool',
			role: 'assistant',
			toolName: 'analyze_workflow',
			toolCallId: 'call_analyze_123',
			status: 'completed',
			displayTitle: 'Analyzing Workflow',
			customDisplayTitle: 'Checking for error handling patterns',
			updates: [
				{
					type: 'input',
					data: {
						workflowId: 'slack-to-sheets',
						checkType: 'error-handling',
					},
					timestamp: new Date().toISOString(),
				},
				{
					type: 'progress',
					data: { message: 'Scanning workflow nodes...' },
					timestamp: new Date().toISOString(),
				},
				{
					type: 'progress',
					data: { message: 'Checking for Error Trigger nodes...' },
					timestamp: new Date().toISOString(),
				},
				{
					type: 'output',
					data: {
						recommendations: [
							'Add Error Trigger node',
							'Configure retry logic for API calls',
							'Add try/catch blocks in Code nodes',
						],
						currentErrorHandling: 'None detected',
					},
					timestamp: new Date().toISOString(),
				},
			],
			read: true,
		},
		{
			id: '15',
			type: 'text',
			role: 'user',
			content: 'Thanks! Can you show me the complete workflow?',
			read: true,
		},
		{
			id: '16',
			type: 'text',
			role: 'assistant',
			content: "Here's what your complete workflow will look like:",
			read: true,
		},
		{
			id: '17',
			type: 'block',
			role: 'assistant',
			title: 'Complete Workflow Structure',
			content: `**Nodes in Order**:

1. **Slack Trigger** → Listens for new messages
2. **Function Node** → Formats the data
3. **Google Sheets** → Appends the row
4. **Error Trigger** → Catches any errors
5. **Slack Node** → Sends error notifications (if needed)

**Connections**:
- Main flow: Slack Trigger → Function → Google Sheets
- Error flow: Error Trigger → Slack notification

This structure ensures data flows smoothly and errors are handled gracefully.`,
			read: true,
			showRating: true,
			ratingStyle: 'minimal',
			showFeedback: true,
		},
	]),
};
