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
	'AssistantLoadingMessage',
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

	describe('collapseToolMessages', () => {
		const MessageWrapperMock = vi.fn(() => ({
			template: '<div data-testid="message-wrapper-mock"></div>',
		}));
		const stubsWithCustomMessageWrapper = {
			...Object.fromEntries(stubs.map((stub) => [stub, true])),
			MessageWrapper: MessageWrapperMock,
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
			return render(AskAssistantChat, {
				global: { stubs: stubsWithCustomMessageWrapper },
				props: {
					user: { firstName: 'Kobi', lastName: 'Dog' },
					messages,
					...extraProps,
				},
			});
		};

		const renderWithDirectives = (messages: ChatUI.AssistantMessage[], extraProps = {}) => {
			MessageWrapperMock.mockClear();
			return render(AskAssistantChat, {
				global: {
					directives: { n8nHtml },
					stubs: stubsWithCustomMessageWrapper,
				},
				props: {
					user: { firstName: 'Kobi', lastName: 'Dog' },
					messages,
					...extraProps,
				},
			});
		};

		const getMessageWrapperProps = (callIndex = 0): MessageWrapperProps => {
			const mockCall = MessageWrapperMock.mock.calls[callIndex];
			expect(mockCall).toBeDefined();
			return (mockCall as unknown as [props: MessageWrapperProps])[0];
		};

		const expectMessageWrapperCalledTimes = (times: number) => {
			expect(MessageWrapperMock).toHaveBeenCalledTimes(times);
		};

		const expectToolMessage = (
			props: MessageWrapperProps,
			expectedProps: Partial<ChatUI.ToolMessage & { id: string; read?: boolean }>,
		) => {
			expect(props.message).toEqual(expect.objectContaining(expectedProps));
		};

		it('should not collapse single tool message', () => {
			const message = createToolMessage({
				id: '1',
				displayTitle: 'Search Results',
				updates: [{ type: 'output', data: { result: 'Found 10 items' } }],
			});

			renderWithMessages([message]);

			expectMessageWrapperCalledTimes(1);
			const props = getMessageWrapperProps();

			expectToolMessage(props, {
				...message,
				read: true,
			});
		});

		it('should collapse consecutive tool messages with same toolName', () => {
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

			expectMessageWrapperCalledTimes(1);
			const props = getMessageWrapperProps();

			expectToolMessage(props, {
				id: '3',
				role: 'assistant',
				type: 'tool',
				toolName: 'search',
				status: 'running',
				displayTitle: 'Still searching...',
				customDisplayTitle: 'Custom Search Title',
				updates: [
					{ type: 'progress', data: { status: 'Initializing search' } },
					{ type: 'progress', data: { status: 'Processing results' } },
					{ type: 'output', data: { result: 'Found 10 items' } },
				],
				read: true,
			});
		});

		it('should collapse tool messages with same toolName with hidden messages in between', () => {
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
					id: '2',
					status: 'running',
					displayTitle: 'Still searching...',
					customDisplayTitle: 'Custom Search Title',
					updates: [{ type: 'progress', data: { status: 'Processing results' } }],
				}),
				{
					id: 'test',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '',
				},
				createToolMessage({
					id: '3',
					status: 'completed',
					displayTitle: 'Search Complete',
					updates: [{ type: 'output', data: { result: 'Found 10 items' } }],
				}),
			];

			renderWithMessages(messages);

			expectMessageWrapperCalledTimes(1);
			const props = getMessageWrapperProps();

			expectToolMessage(props, {
				id: '3',
				role: 'assistant',
				type: 'tool',
				toolName: 'search',
				status: 'running',
				displayTitle: 'Still searching...',
				customDisplayTitle: 'Custom Search Title',
				updates: [
					{ type: 'progress', data: { status: 'Initializing search' } },
					{ type: 'progress', data: { status: 'Processing results' } },
					{ type: 'output', data: { result: 'Found 10 items' } },
				],
				read: true,
			});
		});

		it('should not collapse tool messages with different toolNames', () => {
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

			expectMessageWrapperCalledTimes(2);

			const firstProps = getMessageWrapperProps(0);
			expectToolMessage(firstProps, {
				id: '1',
				toolName: 'search',
				status: 'completed',
				displayTitle: 'Search Results',
			});

			const secondProps = getMessageWrapperProps(1);
			expectToolMessage(secondProps, {
				id: '2',
				toolName: 'fetch',
				status: 'completed',
				displayTitle: 'Data Fetched',
			});
		});

		it('should collapse completed and error statuses', () => {
			const messages = [
				createToolMessage({
					id: '1',
					status: 'completed',
					displayTitle: 'Search Complete',
					updates: [{ type: 'output', data: { result: 'Found some items' } }],
				}),
				createToolMessage({
					id: '2',
					status: 'error',
					displayTitle: 'Search error',
					customDisplayTitle: 'Custom Running Title',
					updates: [{ type: 'progress', data: { status: 'Processing more results' } }],
				}),
				createToolMessage({
					id: '3',
					status: 'completed',
					displayTitle: 'Final Search Complete',
					updates: [{ type: 'output', data: { result: 'All done' } }],
				}),
			];

			renderWithMessages(messages);

			expectMessageWrapperCalledTimes(1);
			const props = getMessageWrapperProps();

			expectToolMessage(props, {
				id: '3',
				status: 'error',
				displayTitle: 'Search error',
				customDisplayTitle: undefined,
				updates: [
					{ type: 'output', data: { result: 'Found some items' } },
					{ type: 'progress', data: { status: 'Processing more results' } },
					{ type: 'output', data: { result: 'All done' } },
				],
			});
		});

		it('should collapse running, completed and error statuses into running', () => {
			const messages = [
				createToolMessage({
					id: '1',
					status: 'running',
					displayTitle: 'Search Running',
					customDisplayTitle: 'Custom Search Title',
					updates: [{ type: 'output', data: { result: 'Found some items' } }],
				}),
				createToolMessage({
					id: '2',
					status: 'error',
					displayTitle: 'Search error',
					customDisplayTitle: 'Custom Error Title',
					updates: [{ type: 'progress', data: { status: 'Processing more results' } }],
				}),
				createToolMessage({
					id: '3',
					status: 'completed',
					displayTitle: 'Final Search Complete',
					updates: [{ type: 'output', data: { result: 'All done' } }],
				}),
			];

			renderWithMessages(messages);

			expectMessageWrapperCalledTimes(1);
			const props = getMessageWrapperProps();

			expectToolMessage(props, {
				id: '3',
				role: 'assistant',
				type: 'tool',
				toolName: 'search',
				status: 'running',
				displayTitle: 'Search Running',
				customDisplayTitle: 'Custom Search Title',
				updates: [
					{ type: 'output', data: { result: 'Found some items' } },
					{ type: 'progress', data: { status: 'Processing more results' } },
					{ type: 'output', data: { result: 'All done' } },
				],
				read: true,
			});
		});

		it('should preserve running status when collapsing messages with running status', () => {
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
					displayTitle: 'Still searching...',
					customDisplayTitle: 'Custom Running Title',
					updates: [{ type: 'progress', data: { status: 'Processing more results' } }],
				}),
				createToolMessage({
					id: '3',
					status: 'completed',
					displayTitle: 'Final Search Complete',
					updates: [{ type: 'output', data: { result: 'All done' } }],
				}),
			];

			renderWithMessages(messages);

			expectMessageWrapperCalledTimes(1);
			const props = getMessageWrapperProps();

			expectToolMessage(props, {
				id: '3',
				status: 'running',
				displayTitle: 'Still searching...',
				customDisplayTitle: 'Custom Running Title',
				updates: [
					{ type: 'output', data: { result: 'Found some items' } },
					{ type: 'progress', data: { status: 'Processing more results' } },
					{ type: 'output', data: { result: 'All done' } },
				],
			});
		});

		it('should combine all updates from collapsed messages', () => {
			const messages = [
				createToolMessage({
					id: '1',
					status: 'running',
					displayTitle: 'Searching...',
					updates: [
						{ type: 'progress', data: { status: 'Starting search' } },
						{ type: 'input', data: { query: 'test query' } },
					],
				}),
				createToolMessage({
					id: '2',
					status: 'completed',
					displayTitle: 'Search Complete',
					updates: [
						{ type: 'progress', data: { status: 'Processing results' } },
						{ type: 'output', data: { result: 'Found 10 items' } },
					],
				}),
			];

			renderWithMessages(messages);

			expectMessageWrapperCalledTimes(1);
			const props = getMessageWrapperProps();

			const toolMessage = props.message as ChatUI.ToolMessage;
			expect(toolMessage.status).toEqual('running');
			expect(toolMessage.updates).toEqual([
				{ type: 'progress', data: { status: 'Starting search' } },
				{ type: 'input', data: { query: 'test query' } },
				{ type: 'progress', data: { status: 'Processing results' } },
				{ type: 'output', data: { result: 'Found 10 items' } },
			]);
		});

		it('should not collapse tool messages separated by non-tool messages', () => {
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

			expectMessageWrapperCalledTimes(3);

			const firstProps = getMessageWrapperProps(0);
			expectToolMessage(firstProps, {
				id: '1',
				type: 'tool',
				toolName: 'search',
				displayTitle: 'First Search',
			});

			const secondProps = getMessageWrapperProps(1);
			expect(secondProps.message).toEqual(
				expect.objectContaining({
					id: '2',
					type: 'text',
					content: 'Here are the search results',
				}),
			);

			const thirdProps = getMessageWrapperProps(2);
			expectToolMessage(thirdProps, {
				id: '3',
				type: 'tool',
				toolName: 'search',
				displayTitle: 'Second Search',
			});
		});

		it('should handle customDisplayTitle correctly for running status', () => {
			const messages = [
				createToolMessage({
					id: '1',
					status: 'completed',
					displayTitle: 'Search Complete',
					customDisplayTitle: 'Should be ignored for completed',
					updates: [{ type: 'output', data: { result: 'Found items' } }],
				}),
				createToolMessage({
					id: '2',
					status: 'running',
					displayTitle: 'Searching...',
					customDisplayTitle: 'Custom Running Title',
					updates: [{ type: 'progress', data: { status: 'In progress' } }],
				}),
			];

			renderWithMessages(messages);

			expectMessageWrapperCalledTimes(1);
			const props = getMessageWrapperProps();

			expectToolMessage(props, {
				status: 'running',
				displayTitle: 'Searching...',
				customDisplayTitle: 'Custom Running Title',
			});
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

			expectMessageWrapperCalledTimes(3);

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
			expectToolMessage(secondProps, {
				id: '3',
				role: 'assistant',
				type: 'tool',
				toolName: 'search',
				status: 'running',
				updates: [
					{ type: 'progress', data: { status: 'Starting' } },
					{ type: 'output', data: { result: 'Found results' } },
				],
			});

			const thirdProps = getMessageWrapperProps(2);
			expect(thirdProps.message).toEqual(
				expect.objectContaining({
					id: '4',
					role: 'assistant',
					type: 'text',
					content: 'Here are your search results',
				}),
			);
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
