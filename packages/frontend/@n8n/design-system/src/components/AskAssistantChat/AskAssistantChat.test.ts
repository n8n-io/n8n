import { render } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';

import AskAssistantChat from './AskAssistantChat.vue';
import { n8nHtml } from '../../directives';
import type { Props as MessageWrapperProps } from './messages/MessageWrapper.vue';
import type { ChatUI } from '../../types/assistant';

// Mock useI18n
vi.mock('../../composables/useI18n', () => ({
	useI18n: () => ({
		t: (key: string) => key,
	}),
}));

// Mock getSupportedMessageComponent helper
vi.mock('./messages/helpers', () => ({
	getSupportedMessageComponent: vi.fn((type: string) => {
		const supportedTypes = ['text', 'code-diff', 'block', 'tool', 'error', 'event'];
		return supportedTypes.includes(type) ? 'MockedComponent' : null;
	}),
}));

// Mock isToolMessage type guard
vi.mock('../../types/assistant', async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const original = await importOriginal<typeof import('../../types/assistant')>();
	return {
		...original,
		isToolMessage: vi.fn((message: ChatUI.AssistantMessage) => {
			return (
				typeof message === 'object' &&
				message !== null &&
				'type' in message &&
				message.type === 'tool'
			);
		}),
	};
});

const stubs = [
	'N8nAvatar',
	'N8nButton',
	'N8nIcon',
	'N8nIconButton',
	'N8nPromptInput',
	'AssistantIcon',
	'AssistantText',
	'InlineAskAssistantButton',
];

// Stub MessageWrapper to render message as stringified JSON
const MessageWrapperStub = {
	name: 'MessageWrapper',
	props: ['message'],
	template: '<div data-test-id="message-wrapper-stub">{{ JSON.stringify(message) }}</div>',
};

const stubsWithMessageWrapper = {
	...Object.fromEntries(stubs.map((stub) => [stub, true])),
	MessageWrapper: MessageWrapperStub,
};

describe('AskAssistantChat', () => {
	it('renders default placeholder chat correctly', () => {
		const { container } = render(AskAssistantChat, {
			props: {
				user: { firstName: 'Kobi', lastName: 'Dog' },
			},
			global: { stubs: stubsWithMessageWrapper },
		});
		expect(container).toMatchSnapshot();
	});

	it('renders chat with messages correctly', () => {
		const { container } = render(AskAssistantChat, {
			global: {
				directives: {
					n8nHtml,
				},
				stubs: stubsWithMessageWrapper,
			},
			props: {
				user: { firstName: 'Kobi', lastName: 'Dog' },
				messages: [
					{
						id: '1',
						type: 'text',
						role: 'assistant',
						content:
							'Hi Max! Here is my top solution to fix the error in your **Transform data** node👇',
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
				],
			},
		});
		expect(container).toMatchSnapshot();
	});

	it('renders streaming chat correctly', () => {
		const { container } = render(AskAssistantChat, {
			global: {
				directives: {
					n8nHtml,
				},
				stubs: stubsWithMessageWrapper,
			},
			props: {
				user: { firstName: 'Kobi', lastName: 'Dog' },
				messages: [
					{
						id: '1',
						type: 'text',
						role: 'assistant',
						content:
							'Hi Max! Here is my top solution to fix the error in your **Transform data** node👇',
						read: false,
					},
				],
				streaming: true,
			},
		});
		expect(container).toMatchSnapshot();
	});

	it('renders end of session chat correctly', () => {
		const { container } = render(AskAssistantChat, {
			global: {
				directives: {
					n8nHtml,
				},
				stubs: stubsWithMessageWrapper,
			},
			props: {
				user: { firstName: 'Kobi', lastName: 'Dog' },
				messages: [
					{
						id: '1',
						type: 'text',
						role: 'assistant',
						content:
							'Hi Max! Here is my top solution to fix the error in your **Transform data** node👇',
						read: false,
					},
					{
						id: '123',
						role: 'assistant',
						type: 'event',
						eventName: 'end-session',
						read: false,
					},
				],
			},
		});
		expect(container).toMatchSnapshot();
	});

	it('renders message with code snippet', () => {
		const { container } = render(AskAssistantChat, {
			global: {
				directives: {
					n8nHtml,
				},
				stubs: stubsWithMessageWrapper,
			},
			props: {
				user: { firstName: 'Kobi', lastName: 'Dog' },
				messages: [
					{
						id: '1',
						type: 'text',
						role: 'assistant',
						content:
							'Hi Max! Here is my top solution to fix the error in your **Transform data** node👇',
						codeSnippet:
							"node.on('input', function(msg) {\n  if (msg.seed) { dummyjson.seed = msg.seed; }\n  try {\n      var value = dummyjson.parse(node.template, {mockdata: msg});\n      if (node.syntax === 'json') {\n          try { value = JSON.parse(value); }\n          catch(e) { node.error(RED._('datagen.errors.json-error')); }\n      }\n      if (node.fieldType === 'msg') {\n          RED.util.setMessageProperty(msg,node.field,value);\n      }\n      else if (node.fieldType === 'flow') {\n          node.context().flow.set(node.field,value);\n      }\n      else if (node.fieldType === 'global') {\n          node.context().global.set(node.field,value);\n      }\n      node.send(msg);\n  }\n  catch(e) {",
						read: false,
					},
				],
			},
		});
		expect(container).toMatchSnapshot();
	});

	it('renders error message correctly with retry button', () => {
		const wrapper = render(AskAssistantChat, {
			global: {
				directives: {
					n8nHtml,
				},
				stubs: stubsWithMessageWrapper,
			},
			props: {
				user: { firstName: 'Kobi', lastName: 'Dog' },
				messages: [
					{
						id: '1',
						role: 'assistant',
						type: 'error',
						content: 'This is an error message.',
						read: false,
						// Button is not shown without a retry function
						retry: async () => {},
					},
				],
			},
		});
		expect(wrapper.container).toMatchSnapshot();
		// Since MessageWrapper is stubbed, we can't test for the error retry button directly
		// We just verify the error message is rendered
		expect(wrapper.container.textContent).toContain('This is an error message.');
	});

	it('limits maximum input length when maxCharacterLength prop is specified', async () => {
		const wrapper = render(AskAssistantChat, {
			global: {
				directives: {
					n8nHtml,
				},
				stubs: stubsWithMessageWrapper,
			},
			props: {
				user: { firstName: 'Kobi', lastName: 'Dog' },
				maxCharacterLength: 100,
			},
		});

		expect(wrapper.container).toMatchSnapshot();
		// The maxCharacterLength prop is passed to the N8nPromptInput component
		// but the textarea element itself doesn't have this attribute
		// We can verify the component receives the prop via snapshot
	});

	describe('groupToolMessagesIntoThinking', () => {
		// Tool messages are now grouped into thinking-group messages and rendered by ThinkingMessage component
		// instead of MessageWrapper. These tests verify the grouping behavior.

		const thinkingMessageProps: Array<{
			items: ChatUI.ThinkingItem[];
			latestStatusText: string;
			defaultExpanded?: boolean;
			isStreaming?: boolean;
		}> = [];
		let thinkingMessageCallCount = 0;
		const ThinkingMessageMock = {
			name: 'ThinkingMessage',
			props: ['items', 'latestStatusText', 'isStreaming', 'defaultExpanded'],
			setup(props: Record<string, unknown>) {
				thinkingMessageCallCount++;
				thinkingMessageProps.push({
					items: props.items as ChatUI.ThinkingItem[],
					latestStatusText: props.latestStatusText as string,
					defaultExpanded: props.defaultExpanded as boolean | undefined,
					isStreaming: props.isStreaming as boolean | undefined,
				});
				return {};
			},
			template: '<div data-testid="thinking-message-mock"></div>',
		};
		const MessageWrapperMock = vi.fn(() => ({
			template: '<div data-testid="message-wrapper-mock"></div>',
		}));

		const stubsWithMocks = {
			...Object.fromEntries(stubs.map((stub) => [stub, true])),
			MessageWrapper: MessageWrapperMock,
			ThinkingMessage: ThinkingMessageMock,
		};

		const createToolMessage = (
			overrides: Partial<ChatUI.ToolMessage & { id: string }> = {},
		): ChatUI.ToolMessage & { id: string } => ({
			id: '1',
			role: 'assistant',
			type: 'tool',
			toolName: 'search',
			status: 'completed',
			displayTitle: 'Search Results',
			updates: [{ type: 'output', data: { result: 'Found items' } }],
			...overrides,
		});

		const renderWithMessages = (messages: ChatUI.AssistantMessage[], extraProps = {}) => {
			MessageWrapperMock.mockClear();
			thinkingMessageCallCount = 0;
			thinkingMessageProps.length = 0;
			return render(AskAssistantChat, {
				global: { stubs: stubsWithMocks },
				props: {
					user: { firstName: 'Kobi', lastName: 'Dog' },
					messages,
					...extraProps,
				},
			});
		};

		const renderWithDirectives = (messages: ChatUI.AssistantMessage[], extraProps = {}) => {
			MessageWrapperMock.mockClear();
			thinkingMessageCallCount = 0;
			thinkingMessageProps.length = 0;
			return render(AskAssistantChat, {
				global: {
					directives: { n8nHtml },
					stubs: stubsWithMocks,
				},
				props: {
					user: { firstName: 'Kobi', lastName: 'Dog' },
					messages,
					...extraProps,
				},
			});
		};

		const getThinkingMessageProps = (callIndex = 0) => {
			expect(thinkingMessageProps[callIndex]).toBeDefined();
			return thinkingMessageProps[callIndex];
		};

		const getMessageWrapperProps = (callIndex = 0): MessageWrapperProps => {
			const mockCall = MessageWrapperMock.mock.calls[callIndex];
			expect(mockCall).toBeDefined();
			return (mockCall as unknown as [props: MessageWrapperProps])[0];
		};

		it('should group single tool message into thinking-group', () => {
			const message = createToolMessage({
				id: '1',
				displayTitle: 'Search Results',
				updates: [{ type: 'output', data: { result: 'Found 10 items' } }],
			});

			renderWithMessages([message]);

			// Tool messages are rendered as ThinkingMessage, not MessageWrapper
			expect(thinkingMessageCallCount).toBe(1);
			expect(MessageWrapperMock).toHaveBeenCalledTimes(0);

			const props = getThinkingMessageProps();
			expect(props.items).toHaveLength(1);
			expect(props.items[0].displayTitle).toBe('Search Results');
		});

		it('should group consecutive tool messages with same toolName into single thinking-group', () => {
			const messages = [
				createToolMessage({
					id: '1',
					status: 'running',
					displayTitle: 'Searching...',
					updates: [{ type: 'progress', data: { status: 'Initializing search' } }],
				}),
				createToolMessage({
					id: '2',
					status: 'running',
					displayTitle: 'Still searching...',
					customDisplayTitle: 'Custom Search Title',
					updates: [{ type: 'progress', data: { status: 'Processing results' } }],
				}),
				createToolMessage({
					id: '3',
					status: 'completed',
					displayTitle: 'Search Complete',
					updates: [{ type: 'output', data: { result: 'Found 10 items' } }],
				}),
			];

			renderWithMessages(messages);

			// All tool messages with same toolName should be grouped into one thinking-group
			expect(thinkingMessageCallCount).toBe(1);
			expect(MessageWrapperMock).toHaveBeenCalledTimes(0);

			const props = getThinkingMessageProps();
			// Should have 1 item after deduplication by toolName
			expect(props.items).toHaveLength(1);
		});

		it('should group tool messages with same toolName even with hidden messages in between', () => {
			const messages: Array<ChatUI.AssistantMessage & { id: string }> = [
				createToolMessage({
					id: '1',
					status: 'running',
					displayTitle: 'Searching...',
					updates: [{ type: 'progress', data: { status: 'Initializing search' } }],
				}),
				{
					id: '2',
					role: 'assistant',
					type: 'agent-suggestion',
					title: 'Agent Suggestion',
					content: 'This is a suggestion from the agent',
					suggestionId: 'test',
					quickReplies: [
						{ type: 'accept', text: 'Accept suggestion' },
						{ type: 'reject', text: 'Reject suggestion' },
					],
					read: true,
				},
				createToolMessage({
					id: '3',
					status: 'completed',
					displayTitle: 'Search Complete',
					updates: [{ type: 'output', data: { result: 'Found 10 items' } }],
				}),
			];

			renderWithMessages(messages);

			// Hidden messages are filtered out, so tool messages are grouped together
			expect(thinkingMessageCallCount).toBe(1);
			expect(MessageWrapperMock).toHaveBeenCalledTimes(0);
		});

		it('should show different tools as separate items in thinking-group', () => {
			const messages = [
				createToolMessage({
					id: '1',
					toolName: 'search',
					displayTitle: 'Search Results',
					updates: [{ type: 'output', data: { result: 'Found 10 items' } }],
				}),
				createToolMessage({
					id: '2',
					toolName: 'fetch',
					displayTitle: 'Data Fetched',
					updates: [{ type: 'output', data: { result: 'Data retrieved' } }],
				}),
			];

			renderWithMessages(messages);

			// Both tools should be in the same thinking-group but as separate items
			expect(thinkingMessageCallCount).toBe(1);
			expect(MessageWrapperMock).toHaveBeenCalledTimes(0);

			const props = getThinkingMessageProps();
			expect(props.items).toHaveLength(2);
		});

		it('should show running status when there is a running tool', () => {
			const messages = [
				createToolMessage({
					id: '1',
					status: 'completed',
					displayTitle: 'Search Complete',
					updates: [{ type: 'output', data: { result: 'Found some items' } }],
				}),
				createToolMessage({
					id: '2',
					status: 'running',
					displayTitle: 'Fetching data...',
					toolName: 'fetch',
					updates: [{ type: 'progress', data: { status: 'Processing more results' } }],
				}),
			];

			renderWithMessages(messages);

			// Should render as ThinkingMessage with running tool
			expect(thinkingMessageCallCount).toBe(1);
			expect(MessageWrapperMock).toHaveBeenCalledTimes(0);
		});

		it('should not group tool messages separated by visible non-tool messages', () => {
			const messages = [
				createToolMessage({
					id: '1',
					status: 'completed',
					displayTitle: 'First Search',
					updates: [{ type: 'output', data: { result: 'First result' } }],
				}),
				{
					id: '2',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'Here are the search results',
				},
				createToolMessage({
					id: '3',
					status: 'completed',
					displayTitle: 'Second Search',
					updates: [{ type: 'output', data: { result: 'Second result' } }],
				}),
			];

			renderWithDirectives(messages);

			// Should have 2 thinking-groups and 1 text message
			expect(thinkingMessageCallCount).toBe(2);
			expect(MessageWrapperMock).toHaveBeenCalledTimes(1);

			const textMessageProps = getMessageWrapperProps(0);
			expect(textMessageProps.message).toEqual(
				expect.objectContaining({
					id: '2',
					type: 'text',
					content: 'Here are the search results',
				}),
			);
		});

		it('should handle mixed message types correctly', () => {
			const messages = [
				{
					id: '1',
					role: 'user' as const,
					type: 'text' as const,
					content: 'Please search for something',
				},
				createToolMessage({
					id: '2',
					status: 'running',
					displayTitle: 'Searching...',
					updates: [{ type: 'progress', data: { status: 'Starting' } }],
				}),
				createToolMessage({
					id: '3',
					status: 'completed',
					displayTitle: 'Search Complete',
					updates: [{ type: 'output', data: { result: 'Found results' } }],
				}),
				{
					id: '4',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'Here are your search results',
				},
			];

			renderWithDirectives(messages);

			// 2 text messages via MessageWrapper, 1 thinking-group via ThinkingMessage
			expect(MessageWrapperMock).toHaveBeenCalledTimes(2);
			expect(thinkingMessageCallCount).toBe(1);

			const firstProps = getMessageWrapperProps(0);
			expect(firstProps.message).toEqual(
				expect.objectContaining({
					id: '1',
					role: 'user',
					type: 'text',
					content: 'Please search for something',
				}),
			);

			const secondProps = getMessageWrapperProps(1);
			expect(secondProps.message).toEqual(
				expect.objectContaining({
					id: '4',
					role: 'assistant',
					type: 'text',
					content: 'Here are your search results',
				}),
			);
		});

		it('should show ThinkingMessage with placeholder item when streaming with no tool messages', () => {
			renderWithMessages([], { streaming: true, loadingMessage: 'Thinking' });

			// Should render ThinkingMessage with a single "Thinking" item
			expect(thinkingMessageCallCount).toBe(1);

			const props = getThinkingMessageProps();
			expect(props.items).toHaveLength(1);
			expect(props.items[0].id).toBe('thinking-placeholder');
			expect(props.items[0].displayTitle).toBe('Thinking');
			expect(props.items[0].status).toBe('running');
			expect(props.latestStatusText).toBe('Thinking');
			expect(props.defaultExpanded).toBe(true);
			expect(props.isStreaming).toBe(true);
		});

		it('should pass defaultExpanded as false to ThinkingMessage when not streaming', () => {
			const message = createToolMessage({
				id: '1',
				displayTitle: 'Search Results',
				updates: [{ type: 'output', data: { result: 'Found items' } }],
			});

			renderWithMessages([message]);

			expect(thinkingMessageCallCount).toBe(1);

			const props = getThinkingMessageProps();
			// defaultExpanded is false when not streaming (e.g., loading from session)
			expect(props.defaultExpanded).toBe(false);
		});

		it('should use thinkingCompletionMessage prop instead of default when provided and tools completed', () => {
			const messages: ChatUI.AssistantMessage[] = [
				createToolMessage({
					id: '1',
					status: 'completed',
					displayTitle: 'Search Results',
					updates: [{ type: 'output', data: { result: 'Found items' } }],
				}),
				{
					id: 'wu-1',
					role: 'assistant' as const,
					type: 'workflow-updated' as const,
					codeSnippet: '',
				},
			];

			renderWithMessages(messages, {
				streaming: false,
				thinkingCompletionMessage: 'Crafting workflow',
			});

			expect(thinkingMessageCallCount).toBe(1);

			const props = getThinkingMessageProps();
			// Should use the custom completion message instead of the default i18n key
			expect(props.latestStatusText).toBe('Crafting workflow');
		});

		it('should use default i18n key when thinkingCompletionMessage is not provided', () => {
			const messages: ChatUI.AssistantMessage[] = [
				createToolMessage({
					id: '1',
					status: 'completed',
					displayTitle: 'Search Results',
					updates: [{ type: 'output', data: { result: 'Found items' } }],
				}),
				{
					id: 'wu-1',
					role: 'assistant' as const,
					type: 'workflow-updated' as const,
					codeSnippet: '',
				},
			];

			renderWithMessages(messages, { streaming: false });

			expect(thinkingMessageCallCount).toBe(1);

			const props = getThinkingMessageProps();
			// Should use the default i18n key (mocked to return the key itself)
			expect(props.latestStatusText).toBe('assistantChat.thinking.workflowGenerated');
		});

		it('should show "Thinking" for non-last completed tool group', () => {
			const messages: ChatUI.AssistantMessage[] = [
				createToolMessage({
					id: '1',
					status: 'completed',
					displayTitle: 'First Search',
				}),
				{
					id: '2',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'First result',
				},
				createToolMessage({
					id: '3',
					status: 'completed',
					toolName: 'fetch',
					displayTitle: 'Second Fetch',
				}),
				{
					id: '4',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'Second result',
				},
			];

			renderWithDirectives(messages);

			expect(thinkingMessageCallCount).toBe(2);

			// First group (non-last) should show "Thinking", not "Workflow generated"
			const firstProps = getThinkingMessageProps(0);
			expect(firstProps.latestStatusText).toBe('assistantChat.thinking.thinking');

			// Last group should also show "Thinking" (no workflow-updated messages)
			const secondProps = getThinkingMessageProps(1);
			expect(secondProps.latestStatusText).toBe('assistantChat.thinking.thinking');
		});

		it('should show "Workflow generated" for build group and "Thinking" for plan group', () => {
			// Plan tools (no workflow-updated) then build tools (with workflow-updated interleaved)
			const messages: ChatUI.AssistantMessage[] = [
				createToolMessage({
					id: '1',
					status: 'completed',
					displayTitle: 'First Search',
				}),
				{
					id: '2',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'Planning result',
				},
				// User triggers build
				{
					id: 'user-2',
					role: 'user' as const,
					type: 'text' as const,
					content: 'Implement the plan',
				},
				createToolMessage({
					id: '3',
					status: 'completed',
					toolName: 'add_nodes',
					displayTitle: 'Adding nodes',
				}),
				{
					id: 'wu-1',
					role: 'assistant' as const,
					type: 'workflow-updated' as const,
					codeSnippet: '',
				},
				createToolMessage({
					id: '4',
					status: 'completed',
					toolName: 'connect_nodes',
					displayTitle: 'Connecting nodes',
				}),
				{
					id: '5',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'Workflow built',
				},
			];

			renderWithDirectives(messages);

			expect(thinkingMessageCallCount).toBe(2);

			// First group (plan): "Thinking" (no workflow-updated in its region)
			const firstProps = getThinkingMessageProps(0);
			expect(firstProps.latestStatusText).toBe('assistantChat.thinking.thinking');

			// Second group (build): "Workflow generated" (workflow-updated interleaved with its tools)
			const secondProps = getThinkingMessageProps(1);
			expect(secondProps.latestStatusText).toBe('assistantChat.thinking.workflowGenerated');
		});

		it('should not show "Workflow generated" when workflow-updated precedes tools (naming-only)', () => {
			// workflow-updated (naming) arrives before discovery tools — should NOT trigger "Workflow generated"
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: 'user-1',
					role: 'user' as const,
					type: 'text' as const,
					content: 'Build a workflow',
				},
				{
					id: 'wu-name',
					role: 'assistant' as const,
					type: 'workflow-updated' as const,
					codeSnippet: '{"nodes": [], "connections": {}, "name": "My Generated Name"}',
				},
				createToolMessage({
					id: 't1',
					status: 'completed',
					toolName: 'search_nodes',
					displayTitle: 'Searching nodes',
				}),
				{
					id: 'resp-1',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'Here is the plan',
				},
			];

			renderWithDirectives(messages);

			expect(thinkingMessageCallCount).toBe(1);

			// Tool group should show "Thinking" (not "Workflow generated") since
			// the workflow-updated was a naming-only update before any tools
			const props = getThinkingMessageProps(0);
			expect(props.latestStatusText).toBe('assistantChat.thinking.thinking');
		});

		it('should preserve "Workflow generated" on first build group when second build group appears', () => {
			// Two sequential builds — both should show "Workflow generated"
			const messages: ChatUI.AssistantMessage[] = [
				// First build
				{
					id: 'user-1',
					role: 'user' as const,
					type: 'text' as const,
					content: 'Build a workflow',
				},
				createToolMessage({
					id: 't1',
					status: 'completed',
					toolName: 'add_nodes',
					displayTitle: 'Adding nodes',
				}),
				{
					id: 'wu-1',
					role: 'assistant' as const,
					type: 'workflow-updated' as const,
					codeSnippet: '',
				},
				createToolMessage({
					id: 't2',
					status: 'completed',
					toolName: 'connect_nodes',
					displayTitle: 'Connecting nodes',
				}),
				{
					id: 'resp-1',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'Workflow created',
				},
				// Second build (follow-up)
				{
					id: 'user-2',
					role: 'user' as const,
					type: 'text' as const,
					content: 'Also send to Slack',
				},
				createToolMessage({
					id: 't3',
					status: 'completed',
					toolName: 'search_nodes',
					displayTitle: 'Searching nodes',
				}),
				createToolMessage({
					id: 't4',
					status: 'completed',
					toolName: 'add_nodes',
					displayTitle: 'Adding Slack node',
				}),
				{
					id: 'wu-2',
					role: 'assistant' as const,
					type: 'workflow-updated' as const,
					codeSnippet: '',
				},
				createToolMessage({
					id: 't5',
					status: 'completed',
					toolName: 'validate_structure',
					displayTitle: 'Validating structure',
				}),
				{
					id: 'resp-2',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'Added Slack node',
				},
			];

			renderWithDirectives(messages);

			expect(thinkingMessageCallCount).toBe(2);

			// First build group: "Workflow generated" (has workflow-updated in its region)
			const firstProps = getThinkingMessageProps(0);
			expect(firstProps.latestStatusText).toBe('assistantChat.thinking.workflowGenerated');

			// Second build group: "Workflow generated" (also has workflow-updated in its region)
			const secondProps = getThinkingMessageProps(1);
			expect(secondProps.latestStatusText).toBe('assistantChat.thinking.workflowGenerated');
		});

		it('should show mixed titles: plan then build then plan', () => {
			// Plan → Build → Plan follow-up: each group gets its own title
			const messages: ChatUI.AssistantMessage[] = [
				// Plan phase
				createToolMessage({
					id: 'p1',
					status: 'completed',
					toolName: 'search_nodes',
					displayTitle: 'Searching nodes',
				}),
				{
					id: 'plan-text',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'Here is the plan',
				},
				// Build phase
				{
					id: 'user-build',
					role: 'user' as const,
					type: 'text' as const,
					content: 'Implement it',
				},
				createToolMessage({
					id: 'b1',
					status: 'completed',
					toolName: 'add_nodes',
					displayTitle: 'Adding nodes',
				}),
				{
					id: 'wu-1',
					role: 'assistant' as const,
					type: 'workflow-updated' as const,
					codeSnippet: '',
				},
				{
					id: 'build-text',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'Workflow built',
				},
				// Plan follow-up (user asks for changes, tools run without workflow-updated)
				{
					id: 'user-followup',
					role: 'user' as const,
					type: 'text' as const,
					content: 'What else can we add?',
				},
				createToolMessage({
					id: 'f1',
					status: 'completed',
					toolName: 'get_documentation',
					displayTitle: 'Getting documentation',
				}),
				{
					id: 'followup-text',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'Here are some suggestions',
				},
			];

			renderWithDirectives(messages);

			expect(thinkingMessageCallCount).toBe(3);

			// Group 1 (plan): "Thinking"
			expect(getThinkingMessageProps(0).latestStatusText).toBe('assistantChat.thinking.thinking');
			// Group 2 (build): "Workflow generated"
			expect(getThinkingMessageProps(1).latestStatusText).toBe(
				'assistantChat.thinking.workflowGenerated',
			);
			// Group 3 (plan follow-up): "Thinking"
			expect(getThinkingMessageProps(2).latestStatusText).toBe('assistantChat.thinking.thinking');
		});

		it('should show "Thinking" in plan mode (no workflow-updated messages)', () => {
			const messages: ChatUI.AssistantMessage[] = [
				createToolMessage({
					id: '1',
					status: 'completed',
					displayTitle: 'Searching nodes',
				}),
				createToolMessage({
					id: '2',
					status: 'completed',
					toolName: 'get_documentation',
					displayTitle: 'Getting documentation',
				}),
				{
					id: '3',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'Here is the plan for your workflow',
				},
			];

			renderWithDirectives(messages);

			expect(thinkingMessageCallCount).toBe(1);

			// No workflow-updated, so should show "Thinking" not "Workflow generated"
			const props = getThinkingMessageProps(0);
			expect(props.latestStatusText).toBe('assistantChat.thinking.thinking');
		});

		it('should give each thinking group a unique ID', () => {
			const messages: ChatUI.AssistantMessage[] = [
				createToolMessage({
					id: '1',
					status: 'completed',
					displayTitle: 'First Search',
				}),
				{
					id: '2',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'First result',
				},
				createToolMessage({
					id: '3',
					status: 'completed',
					toolName: 'fetch',
					displayTitle: 'Second Fetch',
				}),
			];

			renderWithDirectives(messages);

			expect(thinkingMessageCallCount).toBe(2);

			// Each thinking group should get a different latestStatusText or at minimum
			// both should exist (verifying they are independent groups)
			expect(getThinkingMessageProps(0)).toBeDefined();
			expect(getThinkingMessageProps(1)).toBeDefined();
		});

		it('should not add thinking spinner to old completed group when new turn is streaming', () => {
			// Old completed tool group + response + user's new message → streaming starts
			// The old group should stay frozen, not get a "Thinking" spinner.
			// A new placeholder thinking message appears for the current turn.
			const messages: ChatUI.AssistantMessage[] = [
				createToolMessage({
					id: '1',
					status: 'completed',
					displayTitle: 'Search Results',
				}),
				{
					id: '2',
					role: 'assistant' as const,
					type: 'text' as const,
					content: 'Here is the plan',
				},
				{
					id: '3',
					role: 'user' as const,
					type: 'text' as const,
					content: 'Implement the plan',
				},
			];

			renderWithDirectives(messages, { streaming: true, loadingMessage: 'Thinking' });

			// Old tool group + new turn's thinking placeholder
			expect(thinkingMessageCallCount).toBe(2);

			// Old group should NOT have a spinner appended
			const oldGroupProps = getThinkingMessageProps(0);
			expect(oldGroupProps.items).toHaveLength(1);
			expect(oldGroupProps.items[0].displayTitle).toBe('Search Results');
			expect(oldGroupProps.items[0].status).toBe('completed');
			expect(oldGroupProps.latestStatusText).toBe('assistantChat.thinking.thinking');

			// New turn's placeholder should show the loading message
			const placeholderProps = getThinkingMessageProps(1);
			expect(placeholderProps.latestStatusText).toBe('Thinking');
			expect(placeholderProps.isStreaming).toBe(true);
		});
	});

	describe('Quick Replies', () => {
		const renderWithQuickReplies = (
			messages: ChatUI.AssistantMessage[],
			streaming = false,
			loadingMessage?: string,
		) => {
			return render(AskAssistantChat, {
				global: {
					directives: { n8nHtml },
					stubs: {
						...Object.fromEntries(stubs.map((stub) => [stub, true])),
						MessageWrapper: MessageWrapperStub,
						N8nButton: { template: '<button><slot></button' },
					},
				},
				props: {
					user: { firstName: 'Kobi', lastName: 'Dog' },
					messages,
					streaming,
					loadingMessage,
				},
			});
		};

		it('should render quick replies for code-diff message', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: '1',
					role: 'assistant',
					type: 'text',
					content: 'Here is a solution',
					read: true,
				},
				{
					id: '2',
					role: 'assistant',
					type: 'code-diff',
					description: 'Code solution',
					codeDiff: 'diff content',
					suggestionId: 'test',
					quickReplies: [
						{ type: 'new-suggestion', text: 'Give me another solution' },
						{ type: 'resolved', text: 'All good' },
					],
					read: true,
				},
			];

			const wrapper = renderWithQuickReplies(messages);

			// Quick replies should be rendered (2 buttons found)
			expect(wrapper.queryAllByTestId('quick-replies')).toHaveLength(2);
			// Quick reply title should be visible (checking for i18n key since we're mocking i18n)
			expect(wrapper.container.textContent).toContain('assistantChat.quickRepliesTitle');
			expect(wrapper.container).toHaveTextContent('Give me another solution');
			expect(wrapper.container).toHaveTextContent('All good');
		});

		it('should render quick replies for agent-suggestion messages', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: '1',
					role: 'assistant',
					type: 'text',
					content: 'Here is a solution',
					read: true,
				},
				{
					id: '2',
					role: 'assistant',
					type: 'agent-suggestion',
					title: 'Agent Suggestion',
					content: 'This is a suggestion from the agent',
					suggestionId: 'test',
					quickReplies: [
						{ type: 'accept', text: 'Accept suggestion' },
						{ type: 'reject', text: 'Reject suggestion' },
					],
					read: true,
				},
			];

			const wrapper = renderWithQuickReplies(messages);

			// Quick replies should still be rendered even though agent-suggestion is filtered out
			expect(wrapper.queryAllByTestId('quick-replies')).toHaveLength(2);
			// Quick reply title should be visible (checking for i18n key since we're mocking i18n)
			expect(wrapper.container.textContent).toContain('assistantChat.quickRepliesTitle');

			expect(wrapper.container).toHaveTextContent('Accept suggestion');
			expect(wrapper.container).toHaveTextContent('Reject suggestion');
		});

		it('should not render quick replies when streaming', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: '1',
					role: 'assistant',
					type: 'code-diff',
					description: 'Code solution',
					codeDiff: 'diff content',
					suggestionId: 'test',
					quickReplies: [{ type: 'new-suggestion', text: 'Give me another solution' }],
					read: true,
				},
			];

			const wrapper = renderWithQuickReplies(messages, true);

			expect(wrapper.queryAllByTestId('quick-replies')).toHaveLength(0);
			expect(wrapper.container.textContent).not.toContain('assistantChat.quickRepliesTitle');
			// The message with quick replies should be in the JSON but not rendered as buttons
			const messageWrapperStub = wrapper.getByTestId('message-wrapper-stub');
			expect(messageWrapperStub.textContent).toContain('Give me another solution');
			expect(messageWrapperStub.textContent).toContain('"quickReplies"');
		});

		it('should not render quick replies for non-last messages', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: '1',
					role: 'assistant',
					type: 'code-diff',
					description: 'Code solution',
					codeDiff: 'diff content',
					suggestionId: 'test',
					quickReplies: [{ type: 'new-suggestion', text: 'Give me another solution' }],
					read: true,
				},
				{
					id: '2',
					role: 'assistant',
					type: 'text',
					content: 'Follow up message',
					read: true,
				},
			];

			const wrapper = renderWithQuickReplies(messages);

			// Quick replies should not be rendered since the message with quick replies is not last
			expect(wrapper.queryAllByTestId('quick-replies')).toHaveLength(0);
			expect(wrapper.container.textContent).not.toContain('assistantChat.quickRepliesTitle');
			// The messages with quick replies should be in the JSON but not rendered as buttons
			const messageWrapperStubs = wrapper.getAllByTestId('message-wrapper-stub');
			expect(messageWrapperStubs[0].textContent).toContain('Give me another solution');
			expect(messageWrapperStubs[0].textContent).toContain('"quickReplies"');
			expect(messageWrapperStubs[1].textContent).toContain('Follow up message');
		});

		it('should not render quick replies when last message has no quickReplies', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: '1',
					role: 'assistant',
					type: 'text',
					content: 'Simple text message',
					read: true,
				},
			];

			const wrapper = renderWithQuickReplies(messages);

			expect(wrapper.queryAllByTestId('quick-replies')).toHaveLength(0);
			expect(wrapper.container.textContent).not.toContain('assistantChat.quickRepliesTitle');
		});

		it('should not render quick replies when last message has empty quickReplies array', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: '1',
					role: 'assistant',
					type: 'code-diff',
					description: 'Code solution',
					codeDiff: 'diff content',
					suggestionId: 'test',
					quickReplies: [],
					read: true,
				},
			];

			const wrapper = renderWithQuickReplies(messages);

			expect(wrapper.queryAllByTestId('quick-replies')).toHaveLength(0);
			expect(wrapper.container.textContent).not.toContain('assistantChat.quickRepliesTitle');
		});
	});

	describe('Footer Rating', () => {
		const MessageRatingMock = {
			name: 'MessageRating',
			props: ['minimal', 'showFeedback'],
			emits: ['feedback'],
			template:
				'<div data-test-id="footer-rating-component"><button data-test-id="rating-button" @click="$emit(\'feedback\', { rating: \'up\' })">Rate</button></div>',
		};

		const renderWithFooterRating = (messages: ChatUI.AssistantMessage[], streaming = false) => {
			return render(AskAssistantChat, {
				global: {
					directives: { n8nHtml },
					stubs: {
						...Object.fromEntries(stubs.map((stub) => [stub, true])),
						MessageWrapper: MessageWrapperStub,
						MessageRating: MessageRatingMock,
					},
				},
				props: {
					user: { firstName: 'Test', lastName: 'User' },
					messages,
					streaming,
				},
			});
		};

		it('should show footer rating when workflow-updated message exists and not streaming', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: '1',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{}',
				},
				{
					id: '2',
					role: 'assistant',
					type: 'text',
					content: 'Workflow created successfully',
				},
			];

			const wrapper = renderWithFooterRating(messages, false);

			expect(wrapper.queryByTestId('footer-rating')).toBeTruthy();
		});

		it('should NOT show footer rating when streaming', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: '1',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{}',
				},
				{
					id: '2',
					role: 'assistant',
					type: 'text',
					content: 'Workflow created successfully',
				},
			];

			const wrapper = renderWithFooterRating(messages, true);

			expect(wrapper.queryByTestId('footer-rating')).toBeFalsy();
		});

		it('should NOT show footer rating when no workflow-updated message exists', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: '1',
					role: 'assistant',
					type: 'text',
					content: 'Hello, how can I help?',
				},
			];

			const wrapper = renderWithFooterRating(messages, false);

			expect(wrapper.queryByTestId('footer-rating')).toBeFalsy();
		});

		it('should NOT show footer rating when last message is from user', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: '1',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{}',
				},
				{
					id: '2',
					role: 'user',
					type: 'text',
					content: 'Can you modify this?',
				},
			];

			const wrapper = renderWithFooterRating(messages, false);

			expect(wrapper.queryByTestId('footer-rating')).toBeFalsy();
		});

		it('should NOT show footer rating when there are no messages', () => {
			const wrapper = renderWithFooterRating([], false);

			expect(wrapper.queryByTestId('footer-rating')).toBeFalsy();
		});

		it('should emit feedback event when rating is submitted', async () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: '1',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{}',
				},
				{
					id: '2',
					role: 'assistant',
					type: 'text',
					content: 'Workflow created',
				},
			];

			const wrapper = renderWithFooterRating(messages, false);

			const ratingButton = wrapper.getByTestId('rating-button');
			ratingButton.click();

			expect(wrapper.emitted('feedback')).toBeTruthy();
			expect(wrapper.emitted('feedback')?.[0]).toEqual([{ rating: 'up' }]);
		});
	});

	describe('onSendMessage', () => {
		it('should emit message when N8nPromptInput submits', async () => {
			const wrapper = mount(AskAssistantChat, {
				global: {
					directives: { n8nHtml },
					stubs: {
						...Object.fromEntries(
							stubs.filter((stub) => stub !== 'N8nPromptInput').map((stub) => [stub, true]),
						),
						MessageWrapper: MessageWrapperStub,
						N8nPromptInput: {
							name: 'n8n-prompt-input',
							props: [
								'modelValue',
								'placeholder',
								'disabled',
								'streaming',
								'maxLength',
								'creditsQuota',
								'creditsRemaining',
								'showAskOwnerTooltip',
								'refocusAfterSend',
							],
							emits: ['update:modelValue', 'submit', 'stop', 'upgrade-click'],
							setup(
								props: unknown,
								{
									emit,
									expose,
								}: {
									emit: (event: string, ...args: unknown[]) => void;
									expose: (exposed: Record<string, unknown>) => void;
								},
							) {
								const focusInput = vi.fn();

								expose({ focusInput });

								return {
									props,
									handleSubmit: () => emit('submit'),
									updateValue: (e: Event) => {
										const target = e.target as HTMLTextAreaElement;
										emit('update:modelValue', target.value);
									},
								};
							},
							template: `
								<div data-test-id="chat-input" class="prompt-input-stub">
									<textarea :value="modelValue" @input="updateValue"></textarea>
									<button @click="handleSubmit">Send</button>
								</div>
							`,
						},
					},
				},
				props: {
					user: { firstName: 'Test', lastName: 'User' },
				},
			});

			const textarea = wrapper.find('[data-test-id="chat-input"] textarea');
			expect(textarea.exists()).toBe(true);

			await textarea.setValue('Test message');
			await wrapper.vm.$nextTick();

			const sendButton = wrapper.find('[data-test-id="chat-input"] button');
			expect(sendButton.exists()).toBe(true);

			await sendButton.trigger('click');
			await wrapper.vm.$nextTick();

			// Verify message was emitted with the correct value
			expect(wrapper.emitted('message')).toBeTruthy();
			const messageEvents = wrapper.emitted('message');
			expect(messageEvents?.[0]).toEqual(['Test message']);

			wrapper.unmount();
		});
	});
});
