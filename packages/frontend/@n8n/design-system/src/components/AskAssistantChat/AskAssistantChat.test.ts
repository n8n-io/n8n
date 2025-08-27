import { render } from '@testing-library/vue';
import { vi } from 'vitest';

import { n8nHtml } from '@n8n/design-system/directives';

import AskAssistantChat from './AskAssistantChat.vue';
import type { Props as MessageWrapperProps } from './messages/MessageWrapper.vue';
import type { ChatUI } from '../../types/assistant';

const stubs = ['n8n-avatar', 'n8n-button', 'n8n-icon', 'n8n-icon-button'];

describe('AskAssistantChat', () => {
	it('renders default placeholder chat correctly', () => {
		const { container } = render(AskAssistantChat, {
			props: {
				user: { firstName: 'Kobi', lastName: 'Dog' },
			},
			global: { stubs },
		});
		expect(container).toMatchSnapshot();
	});

	it('renders chat with messages correctly', () => {
		const { container } = render(AskAssistantChat, {
			global: {
				directives: {
					n8nHtml,
				},
				stubs,
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
				stubs,
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
				stubs,
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
				stubs,
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
				stubs,
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
		expect(wrapper.getByTestId('error-retry-button')).toBeInTheDocument();
	});

	it('does not render retry button if no error is present', () => {
		const wrapper = render(AskAssistantChat, {
			global: {
				directives: {
					n8nHtml,
				},
				stubs,
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
			},
		});

		expect(wrapper.container).toMatchSnapshot();
		expect(wrapper.queryByTestId('error-retry-button')).not.toBeInTheDocument();
	});

	it('limits maximum input length when maxLength prop is specified', async () => {
		const wrapper = render(AskAssistantChat, {
			global: {
				directives: {
					n8nHtml,
				},
				stubs,
			},
			props: {
				user: { firstName: 'Kobi', lastName: 'Dog' },
				maxLength: 100,
			},
		});

		expect(wrapper.container).toMatchSnapshot();
		const textarea = wrapper.queryByTestId('chat-input');
		expect(textarea).toHaveAttribute('maxLength', '100');
	});

	describe('collapseToolMessages', () => {
		const MessageWrapperMock = vi.fn(() => ({
			template: '<div data-testid="message-wrapper-mock"></div>',
		}));
		const stubsWithMessageWrapper = {
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
				global: { stubs: stubsWithMessageWrapper },
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

		it('should not collapse single tool message', () => {
			const message = createToolMessage({
				id: '1',
				displayTitle: 'Search Results',
				updates: [{ type: 'output', data: { result: 'Found 10 items' } }],
			});

			renderWithMessages([message]);

			expect(MessageWrapperMock).toHaveBeenCalledTimes(1);
			const props = getMessageWrapperProps();

			// Verify the message passed to MessageWrapper
			expect(props.message).toEqual(
				expect.objectContaining({
					...message,
					read: true, // Added by normalizeMessages
				}),
			);
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

			// Should only render one MessageWrapper (collapsed)
			expect(MessageWrapperMock).toHaveBeenCalledTimes(1);
			const props = getMessageWrapperProps();

			// Verify collapsed message has combined updates and prioritizes running status
			expect(props.message).toEqual(
				expect.objectContaining({
					id: '3', // Uses last message's id
					role: 'assistant',
					type: 'tool',
					toolName: 'search',
					status: 'running', // Uses running status from messages 1 & 2
					displayTitle: 'Still searching...', // Uses last running message's displayTitle
					customDisplayTitle: 'Custom Search Title', // Preserves customDisplayTitle for running status
					updates: [
						{ type: 'progress', data: { status: 'Initializing search' } },
						{ type: 'progress', data: { status: 'Processing results' } },
						{ type: 'output', data: { result: 'Found 10 items' } },
					],
					read: true,
				}),
			);
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

			// Should render two separate MessageWrappers
			expect(MessageWrapperMock).toHaveBeenCalledTimes(2);

			// First message should remain unchanged
			const firstProps = getMessageWrapperProps(0);
			expect(firstProps.message).toEqual(
				expect.objectContaining({
					id: '1',
					toolName: 'search',
					status: 'completed',
					displayTitle: 'Search Results',
				}),
			);

			// Second message should remain unchanged
			const secondProps = getMessageWrapperProps(1);
			expect(secondProps.message).toEqual(
				expect.objectContaining({
					id: '2',
					toolName: 'fetch',
					status: 'completed',
					displayTitle: 'Data Fetched',
				}),
			);
		});

		it('should collapse completed and error statuses', () => {
			MessageWrapperMock.mockClear();

			render(AskAssistantChat, {
				global: { stubs: stubsWithMessageWrapper },
				props: {
					user: { firstName: 'Kobi', lastName: 'Dog' },
					messages: [
						{
							id: '1',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'completed',
							displayTitle: 'Search Complete',
							updates: [{ type: 'output', data: { result: 'Found some items' } }],
						},
						{
							id: '2',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'error',
							displayTitle: 'Search error',
							customDisplayTitle: 'Custom Running Title',
							updates: [{ type: 'progress', data: { status: 'Processing more results' } }],
						},
						{
							id: '3',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'completed',
							displayTitle: 'Final Search Complete',
							updates: [{ type: 'output', data: { result: 'All done' } }],
						},
					],
				},
			});

			expect(MessageWrapperMock).toHaveBeenCalledTimes(1);
			const mockCall = MessageWrapperMock.mock.calls[0];
			expect(mockCall).toBeDefined();
			const [props] = mockCall as unknown as [props: MessageWrapperProps];

			// Should use the last running message's status and titles
			expect(props.message).toEqual(
				expect.objectContaining({
					id: '3', // Uses last message's id
					status: 'error', // Uses running status from message 2
					displayTitle: 'Search error', // Uses running message's displayTitle
					customDisplayTitle: undefined,
					updates: [
						{ type: 'output', data: { result: 'Found some items' } },
						{ type: 'progress', data: { status: 'Processing more results' } },
						{ type: 'output', data: { result: 'All done' } },
					],
				}),
			);
		});

		it('should collapse running, completed and error statuses into running', () => {
			MessageWrapperMock.mockClear();

			render(AskAssistantChat, {
				global: { stubs: stubsWithMessageWrapper },
				props: {
					user: { firstName: 'Kobi', lastName: 'Dog' },
					messages: [
						{
							id: '1',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'running',
							displayTitle: 'Search Running',
							customDisplayTitle: 'Custom Search Title',
							updates: [{ type: 'output', data: { result: 'Found some items' } }],
						},
						{
							id: '2',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'error',
							displayTitle: 'Search error',
							customDisplayTitle: 'Custom Error Title',
							updates: [{ type: 'progress', data: { status: 'Processing more results' } }],
						},
						{
							id: '3',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'completed',
							displayTitle: 'Final Search Complete',
							updates: [{ type: 'output', data: { result: 'All done' } }],
						},
					],
				},
			});

			expect(MessageWrapperMock).toHaveBeenCalledTimes(1);
			const mockCall = MessageWrapperMock.mock.calls[0];
			expect(mockCall).toBeDefined();
			const [props] = mockCall as unknown as [props: MessageWrapperProps];

			// Should use the last running message's status and titles
			expect(props.message).toEqual(
				expect.objectContaining({
					id: '3', // Uses last message's id
					role: 'assistant',
					type: 'tool',
					toolName: 'search',
					status: 'running', // Uses running status
					displayTitle: 'Search Running', // Uses running message's displayTitle
					customDisplayTitle: 'Custom Search Title', // Preserves customDisplayTitle for running status
					updates: [
						{ type: 'output', data: { result: 'Found some items' } },
						{ type: 'progress', data: { status: 'Processing more results' } },
						{ type: 'output', data: { result: 'All done' } },
					],
					read: true,
				}),
			);
		});

		it('should preserve running status when collapsing messages with running status', () => {
			MessageWrapperMock.mockClear();

			render(AskAssistantChat, {
				global: { stubs: stubsWithMessageWrapper },
				props: {
					user: { firstName: 'Kobi', lastName: 'Dog' },
					messages: [
						{
							id: '1',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'completed',
							displayTitle: 'Search Complete',
							updates: [{ type: 'output', data: { result: 'Found some items' } }],
						},
						{
							id: '2',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'running',
							displayTitle: 'Still searching...',
							customDisplayTitle: 'Custom Running Title',
							updates: [{ type: 'progress', data: { status: 'Processing more results' } }],
						},
						{
							id: '3',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'completed',
							displayTitle: 'Final Search Complete',
							updates: [{ type: 'output', data: { result: 'All done' } }],
						},
					],
				},
			});

			expect(MessageWrapperMock).toHaveBeenCalledTimes(1);
			const mockCall = MessageWrapperMock.mock.calls[0];
			expect(mockCall).toBeDefined();
			const [props] = mockCall as unknown as [props: MessageWrapperProps];

			// Should use the last running message's status and titles
			expect(props.message).toEqual(
				expect.objectContaining({
					id: '3', // Uses last message's id
					status: 'running', // Uses running status from message 2
					displayTitle: 'Still searching...', // Uses running message's displayTitle
					customDisplayTitle: 'Custom Running Title', // Preserves customDisplayTitle for running status
					updates: [
						{ type: 'output', data: { result: 'Found some items' } },
						{ type: 'progress', data: { status: 'Processing more results' } },
						{ type: 'output', data: { result: 'All done' } },
					],
				}),
			);
		});

		it('should combine all updates from collapsed messages', () => {
			MessageWrapperMock.mockClear();

			render(AskAssistantChat, {
				global: { stubs: stubsWithMessageWrapper },
				props: {
					user: { firstName: 'Kobi', lastName: 'Dog' },
					messages: [
						{
							id: '1',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'running',
							displayTitle: 'Searching...',
							updates: [
								{ type: 'progress', data: { status: 'Starting search' } },
								{ type: 'input', data: { query: 'test query' } },
							],
						},
						{
							id: '2',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'completed',
							displayTitle: 'Search Complete',
							updates: [
								{ type: 'progress', data: { status: 'Processing results' } },
								{ type: 'output', data: { result: 'Found 10 items' } },
							],
						},
					],
				},
			});

			expect(MessageWrapperMock).toHaveBeenCalledTimes(1);
			const mockCall = MessageWrapperMock.mock.calls[0];
			expect(mockCall).toBeDefined();
			const [props] = mockCall as unknown as [props: { message: ChatUI.ToolMessage }];

			expect(props.message.status).toEqual('running');
			// Should combine all updates from both messages
			expect(props.message.updates).toEqual([
				{ type: 'progress', data: { status: 'Starting search' } },
				{ type: 'input', data: { query: 'test query' } },
				{ type: 'progress', data: { status: 'Processing results' } },
				{ type: 'output', data: { result: 'Found 10 items' } },
			]);
		});

		it('should not collapse tool messages separated by non-tool messages', () => {
			MessageWrapperMock.mockClear();

			render(AskAssistantChat, {
				global: {
					directives: { n8nHtml },
					stubs: stubsWithMessageWrapper,
				},
				props: {
					user: { firstName: 'Kobi', lastName: 'Dog' },
					messages: [
						{
							id: '1',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'completed',
							displayTitle: 'First Search',
							updates: [{ type: 'output', data: { result: 'First result' } }],
						},
						{
							id: '2',
							role: 'assistant',
							type: 'text',
							content: 'Here are the search results',
						},
						{
							id: '3',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'completed',
							displayTitle: 'Second Search',
							updates: [{ type: 'output', data: { result: 'Second result' } }],
						},
					],
				},
			});

			// Should render 3 MessageWrappers (tool, text, tool)
			expect(MessageWrapperMock).toHaveBeenCalledTimes(3);

			// First call should be first tool message
			const firstCall = MessageWrapperMock.mock.calls[0] as unknown as [
				props: { message: ChatUI.ToolMessage },
			];
			expect(firstCall).toBeDefined();
			expect(firstCall[0]?.message).toEqual(
				expect.objectContaining({
					id: '1',
					type: 'tool',
					toolName: 'search',
					displayTitle: 'First Search',
				}),
			);

			// Second call should be text message
			const secondCall = MessageWrapperMock.mock.calls[1] as unknown as [
				props: { message: ChatUI.ToolMessage },
			];
			expect(secondCall).toBeDefined();
			expect(secondCall[0]?.message).toEqual(
				expect.objectContaining({
					id: '2',
					type: 'text',
					content: 'Here are the search results',
				}),
			);

			// Third call should be second tool message
			const thirdCall = MessageWrapperMock.mock.calls[2] as unknown as [
				props: { message: ChatUI.ToolMessage },
			];
			expect(thirdCall).toBeDefined();
			expect(thirdCall[0]?.message).toEqual(
				expect.objectContaining({
					id: '3',
					type: 'tool',
					toolName: 'search',
					displayTitle: 'Second Search',
				}),
			);
		});

		it('should handle customDisplayTitle correctly for running status', () => {
			MessageWrapperMock.mockClear();

			render(AskAssistantChat, {
				global: { stubs: stubsWithMessageWrapper },
				props: {
					user: { firstName: 'Kobi', lastName: 'Dog' },
					messages: [
						{
							id: '1',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'completed',
							displayTitle: 'Search Complete',
							customDisplayTitle: 'Should be ignored for completed',
							updates: [{ type: 'output', data: { result: 'Found items' } }],
						},
						{
							id: '2',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'running',
							displayTitle: 'Searching...',
							customDisplayTitle: 'Custom Running Title',
							updates: [{ type: 'progress', data: { status: 'In progress' } }],
						},
					],
				},
			});

			expect(MessageWrapperMock).toHaveBeenCalledTimes(1);
			const mockCall = MessageWrapperMock.mock.calls[0];
			expect(mockCall).toBeDefined();
			const [props] = mockCall as unknown as [props: { message: ChatUI.ToolMessage }];

			// Should preserve customDisplayTitle since final status is running
			expect(props.message).toEqual(
				expect.objectContaining({
					status: 'running',
					displayTitle: 'Searching...',
					customDisplayTitle: 'Custom Running Title',
				}),
			);
		});

		it('should handle mixed message types correctly', () => {
			MessageWrapperMock.mockClear();

			render(AskAssistantChat, {
				global: {
					directives: { n8nHtml },
					stubs: stubsWithMessageWrapper,
				},
				props: {
					user: { firstName: 'Kobi', lastName: 'Dog' },
					messages: [
						{
							id: '1',
							role: 'user',
							type: 'text',
							content: 'Please search for something',
						},
						{
							id: '2',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'running',
							displayTitle: 'Searching...',
							updates: [{ type: 'progress', data: { status: 'Starting' } }],
						},
						{
							id: '3',
							role: 'assistant',
							type: 'tool',
							toolName: 'search',
							status: 'completed',
							displayTitle: 'Search Complete',
							updates: [{ type: 'output', data: { result: 'Found results' } }],
						},
						{
							id: '4',
							role: 'assistant',
							type: 'text',
							content: 'Here are your search results',
						},
					],
				},
			});

			// Should render 3 MessageWrappers: user text + collapsed tool + assistant text
			expect(MessageWrapperMock).toHaveBeenCalledTimes(3);

			// First message: user text
			const firstCall = MessageWrapperMock.mock.calls[0] as unknown as [
				props: { message: ChatUI.ToolMessage },
			];
			expect(firstCall).toBeDefined();
			expect(firstCall[0]?.message).toEqual(
				expect.objectContaining({
					id: '1',
					role: 'user',
					type: 'text',
					content: 'Please search for something',
				}),
			);

			// Second message: collapsed tool message
			const secondCall = MessageWrapperMock.mock.calls[1] as unknown as [
				props: { message: ChatUI.ToolMessage },
			];
			expect(secondCall).toBeDefined();
			expect(secondCall[0]?.message).toEqual(
				expect.objectContaining({
					id: '3', // Uses last tool message id
					role: 'assistant',
					type: 'tool',
					toolName: 'search',
					status: 'running', // Preserves running status
					updates: [
						{ type: 'progress', data: { status: 'Starting' } },
						{ type: 'output', data: { result: 'Found results' } },
					],
				}),
			);

			// Third message: assistant text
			const thirdCall = MessageWrapperMock.mock.calls[2] as unknown as [
				props: { message: ChatUI.ToolMessage },
			];
			expect(thirdCall).toBeDefined();
			expect(thirdCall[0]?.message).toEqual(
				expect.objectContaining({
					id: '4',
					role: 'assistant',
					type: 'text',
					content: 'Here are your search results',
				}),
			);
		});
	});
});
