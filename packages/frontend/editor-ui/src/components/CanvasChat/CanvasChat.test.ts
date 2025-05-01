import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { userEvent } from '@testing-library/user-event';
import { createRouter, createWebHistory } from 'vue-router';
import { computed, ref } from 'vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import CanvasChat from './CanvasChat.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestWorkflowObject } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { STORES } from '@/constants';
import { ChatOptionsSymbol, ChatSymbol } from '@n8n/chat/constants';
import { chatEventBus } from '@n8n/chat/event-buses';

import { useWorkflowsStore } from '@/stores/workflows.store';
import { useCanvasStore } from '@/stores/canvas.store';
import * as useChatMessaging from './composables/useChatMessaging';
import * as useChatTrigger from './composables/useChatTrigger';
import { useToast } from '@/composables/useToast';

import type { IExecutionResponse, INodeUi } from '@/Interface';
import type { ChatMessage } from '@n8n/chat/types';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { LOGS_PANEL_STATE } from './types/logs';

vi.mock('@/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return {
		useToast: () => {
			return {
				showMessage,
				showError,
				clearAllStickyNotifications: vi.fn(),
			};
		},
	};
});

vi.mock('@/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		isConnected: true,
	}),
}));

// Test data
const mockNodes: INodeUi[] = [
	{
		parameters: {
			options: {
				allowFileUploads: true,
			},
		},
		id: 'chat-trigger-id',
		name: 'When chat message received',
		type: '@n8n/n8n-nodes-langchain.chatTrigger',
		typeVersion: 1.1,
		position: [740, 860],
		webhookId: 'webhook-id',
	},
	{
		parameters: {},
		id: 'agent-id',
		name: 'AI Agent',
		type: '@n8n/n8n-nodes-langchain.agent',
		typeVersion: 1.7,
		position: [960, 860],
	},
];
const mockNodeTypes: INodeTypeDescription[] = [
	{
		displayName: 'AI Agent',
		name: '@n8n/n8n-nodes-langchain.agent',
		properties: [],
		defaults: {
			name: 'AI Agent',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		version: 0,
		group: [],
		description: '',
		codex: {
			subcategories: {
				AI: ['Agents'],
			},
		},
	},
];

const mockConnections = {
	'When chat message received': {
		main: [
			[
				{
					node: 'AI Agent',
					type: NodeConnectionTypes.Main,
					index: 0,
				},
			],
		],
	},
};

const mockWorkflowExecution = {
	data: {
		resultData: {
			runData: {
				'AI Agent': [
					{
						data: {
							main: [[{ json: { output: 'AI response message' } }]],
						},
					},
				],
			},
			lastNodeExecuted: 'AI Agent',
		},
	},
};

const router = createRouter({
	history: createWebHistory(),
	routes: [],
});

describe('CanvasChat', () => {
	const renderComponent = createComponentRenderer(CanvasChat, {
		global: {
			provide: {
				[ChatSymbol as symbol]: {},
				[ChatOptionsSymbol as symbol]: {},
			},
			plugins: [router],
		},
	});

	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let canvasStore: ReturnType<typeof mockedStore<typeof useCanvasStore>>;
	let nodeTypeStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		const pinia = createTestingPinia({
			initialState: {
				[STORES.WORKFLOWS]: {
					workflow: {
						nodes: mockNodes,
						connections: mockConnections,
					},
				},
				[STORES.UI]: {
					chatPanelOpen: true,
				},
			},
		});

		setActivePinia(pinia);

		workflowsStore = mockedStore(useWorkflowsStore);
		canvasStore = mockedStore(useCanvasStore);
		nodeTypeStore = mockedStore(useNodeTypesStore);

		// Setup default mocks
		workflowsStore.getCurrentWorkflow.mockReturnValue(
			createTestWorkflowObject({
				nodes: mockNodes,
				connections: mockConnections,
			}),
		);
		workflowsStore.getNodeByName.mockImplementation((name) => {
			const matchedNode = mockNodes.find((node) => node.name === name) ?? null;

			return matchedNode;
		});
		workflowsStore.logsPanelState = LOGS_PANEL_STATE.ATTACHED;
		workflowsStore.isLogsPanelOpen = true;
		workflowsStore.getWorkflowExecution = mockWorkflowExecution as unknown as IExecutionResponse;
		workflowsStore.getPastChatMessages = ['Previous message 1', 'Previous message 2'];

		nodeTypeStore.getNodeType = vi.fn().mockImplementation((nodeTypeName) => {
			return mockNodeTypes.find((node) => node.name === nodeTypeName) ?? null;
		});

		workflowsStore.runWorkflow.mockResolvedValue({ executionId: 'test-execution-issd' });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('should render chat when panel is open', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('canvas-chat')).toBeInTheDocument();
		});

		it('should not render chat when panel is closed', async () => {
			workflowsStore.logsPanelState = LOGS_PANEL_STATE.CLOSED;
			const { queryByTestId } = renderComponent();
			await waitFor(() => {
				expect(queryByTestId('canvas-chat')).not.toBeInTheDocument();
			});
		});

		it('should show correct input placeholder', async () => {
			const { findByTestId } = renderComponent();
			expect(await findByTestId('chat-input')).toBeInTheDocument();
		});
	});

	describe('message handling', () => {
		beforeEach(() => {
			vi.spyOn(chatEventBus, 'emit');
			workflowsStore.runWorkflow.mockResolvedValue({ executionId: 'test-execution-id' });
		});

		it('should send message and show response', async () => {
			const { findByTestId, findByText } = renderComponent();

			// Send message
			const input = await findByTestId('chat-input');
			await userEvent.type(input, 'Hello AI!');

			await userEvent.keyboard('{Enter}');

			// Verify message and response
			expect(await findByText('Hello AI!')).toBeInTheDocument();
			await waitFor(async () => {
				workflowsStore.getWorkflowExecution = {
					...(mockWorkflowExecution as unknown as IExecutionResponse),
					status: 'success',
				};
				expect(await findByText('AI response message')).toBeInTheDocument();
			});

			// Verify workflow execution
			expect(workflowsStore.runWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					runData: undefined,
					triggerToStartFrom: {
						name: 'When chat message received',
						data: {
							data: {
								main: [
									[
										{
											json: {
												action: 'sendMessage',
												chatInput: 'Hello AI!',
												sessionId: expect.any(String),
											},
										},
									],
								],
							},
							executionIndex: 0,
							executionStatus: 'success',
							executionTime: 0,
							source: [null],
							startTime: expect.any(Number),
						},
					},
				}),
			);
		});

		it('should show loading state during message processing', async () => {
			const { findByTestId, queryByTestId } = renderComponent();

			// Send message
			const input = await findByTestId('chat-input');
			await userEvent.type(input, 'Test message');

			// Since runWorkflow resolve is mocked, the isWorkflowRunning will be false from the first run.
			// This means that the loading state never gets a chance to appear.
			// We're forcing isWorkflowRunning to be true for the first run.
			workflowsStore.isWorkflowRunning = true;
			await userEvent.keyboard('{Enter}');

			await waitFor(() => expect(queryByTestId('chat-message-typing')).toBeInTheDocument());

			workflowsStore.isWorkflowRunning = false;
			workflowsStore.getWorkflowExecution = {
				...(mockWorkflowExecution as unknown as IExecutionResponse),
				status: 'success',
			};

			await waitFor(() => expect(queryByTestId('chat-message-typing')).not.toBeInTheDocument());
		});

		it('should handle workflow execution errors', async () => {
			workflowsStore.runWorkflow.mockRejectedValueOnce(new Error());

			const { findByTestId } = renderComponent();

			const input = await findByTestId('chat-input');
			await userEvent.type(input, 'Hello AI!');
			await userEvent.keyboard('{Enter}');

			const toast = useToast();
			expect(toast.showError).toHaveBeenCalledWith(new Error(), 'Problem running workflow');
		});
	});

	describe('session management', () => {
		const mockMessages: ChatMessage[] = [
			{
				id: '1',
				text: 'Existing message',
				sender: 'user',
			},
		];

		beforeEach(() => {
			vi.spyOn(useChatMessaging, 'useChatMessaging').mockImplementation(({ messages }) => {
				messages.value.push(...mockMessages);

				return {
					sendMessage: vi.fn(),
					previousMessageIndex: ref(0),
					isLoading: computed(() => false),
				};
			});
		});

		it('should allow copying session ID', async () => {
			const clipboardSpy = vi.fn();
			document.execCommand = clipboardSpy;
			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('chat-session-id'));
			const toast = useToast();
			expect(clipboardSpy).toHaveBeenCalledWith('copy');
			expect(toast.showMessage).toHaveBeenCalledWith({
				message: '',
				title: 'Copied to clipboard',
				type: 'success',
			});
		});

		it('should refresh session when messages exist', async () => {
			const { getByTestId } = renderComponent();

			const originalSessionId = getByTestId('chat-session-id').textContent;
			await userEvent.click(getByTestId('refresh-session-button'));

			expect(getByTestId('chat-session-id').textContent).not.toEqual(originalSessionId);
		});
	});

	describe('resize functionality', () => {
		it('should handle panel resizing', async () => {
			const { container } = renderComponent();

			const resizeWrapper = container.querySelector('.resizeWrapper');
			if (!resizeWrapper) throw new Error('Resize wrapper not found');

			await userEvent.pointer([
				{ target: resizeWrapper, coords: { clientX: 0, clientY: 0 } },
				{ coords: { clientX: 0, clientY: 100 } },
			]);

			expect(canvasStore.setPanelHeight).toHaveBeenCalled();
		});

		it('should persist resize dimensions', () => {
			const mockStorage = {
				getItem: vi.fn(),
				setItem: vi.fn(),
			};
			Object.defineProperty(window, 'localStorage', { value: mockStorage });

			renderComponent();

			expect(mockStorage.getItem).toHaveBeenCalledWith('N8N_CANVAS_CHAT_HEIGHT');
			expect(mockStorage.getItem).toHaveBeenCalledWith('N8N_CANVAS_CHAT_WIDTH');
		});
	});

	describe('file handling', () => {
		beforeEach(() => {
			vi.spyOn(useChatMessaging, 'useChatMessaging').mockReturnValue({
				sendMessage: vi.fn(),
				previousMessageIndex: ref(0),
				isLoading: computed(() => false),
			});

			workflowsStore.logsPanelState = LOGS_PANEL_STATE.ATTACHED;
			workflowsStore.allowFileUploads = true;
		});

		it('should enable file uploads when allowed by chat trigger node', async () => {
			const allowFileUploads = ref(true);
			const original = useChatTrigger.useChatTrigger;
			vi.spyOn(useChatTrigger, 'useChatTrigger').mockImplementation((...args) => ({
				...original(...args),
				allowFileUploads: computed(() => allowFileUploads.value),
			}));
			const { getByTestId } = renderComponent();

			const chatPanel = getByTestId('canvas-chat');
			expect(chatPanel).toBeInTheDocument();

			const fileInput = getByTestId('chat-attach-file-button');
			expect(fileInput).toBeInTheDocument();

			allowFileUploads.value = false;
			await waitFor(() => {
				expect(fileInput).not.toBeInTheDocument();
			});
		});
	});

	describe('message history handling', () => {
		it('should properly navigate through message history with wrap-around', async () => {
			const messages = ['Message 1', 'Message 2', 'Message 3'];
			workflowsStore.getPastChatMessages = messages;

			const { findByTestId } = renderComponent();
			const input = await findByTestId('chat-input');

			// First up should show most recent message
			await userEvent.keyboard('{ArrowUp}');
			expect(input).toHaveValue('Message 3');

			// Second up should show second most recent
			await userEvent.keyboard('{ArrowUp}');
			expect(input).toHaveValue('Message 2');

			// Third up should show oldest message
			await userEvent.keyboard('{ArrowUp}');
			expect(input).toHaveValue('Message 1');

			// Fourth up should wrap around to most recent
			await userEvent.keyboard('{ArrowUp}');
			expect(input).toHaveValue('Message 3');

			// Down arrow should go in reverse
			await userEvent.keyboard('{ArrowDown}');
			expect(input).toHaveValue('Message 1');
		});

		it('should reset message history navigation on new input', async () => {
			workflowsStore.getPastChatMessages = ['Message 1', 'Message 2'];
			const { findByTestId } = renderComponent();
			const input = await findByTestId('chat-input');

			// Navigate to oldest message
			await userEvent.keyboard('{ArrowUp}'); // Most recent
			await userEvent.keyboard('{ArrowUp}'); // Oldest
			expect(input).toHaveValue('Message 1');

			await userEvent.type(input, 'New message');
			await userEvent.keyboard('{Enter}');

			await userEvent.keyboard('{ArrowUp}');
			expect(input).toHaveValue('Message 2');
		});
	});

	describe('message reuse and repost', () => {
		const sendMessageSpy = vi.fn();
		beforeEach(() => {
			const mockMessages: ChatMessage[] = [
				{
					id: '1',
					text: 'Original message',
					sender: 'user',
				},
				{
					id: '2',
					text: 'AI response',
					sender: 'bot',
				},
			];
			vi.spyOn(useChatMessaging, 'useChatMessaging').mockImplementation(({ messages }) => {
				messages.value.push(...mockMessages);

				return {
					sendMessage: sendMessageSpy,
					previousMessageIndex: ref(0),
					isLoading: computed(() => false),
				};
			});
			workflowsStore.messages = mockMessages;
		});

		it('should repost user message with new execution', async () => {
			const { findByTestId } = renderComponent();
			const repostButton = await findByTestId('repost-message-button');

			await userEvent.click(repostButton);

			expect(sendMessageSpy).toHaveBeenCalledWith('Original message');
			expect.objectContaining({
				runData: expect.objectContaining({
					'When chat message received': expect.arrayContaining([
						expect.objectContaining({
							data: expect.objectContaining({
								main: expect.arrayContaining([
									expect.arrayContaining([
										expect.objectContaining({
											json: expect.objectContaining({
												chatInput: 'Original message',
											}),
										}),
									]),
								]),
							}),
						}),
					]),
				}),
			});
		});

		it('should show message options only for appropriate messages', async () => {
			const { findByText, container } = renderComponent();

			await findByText('Original message');
			const userMessage = container.querySelector('.chat-message-from-user');
			expect(
				userMessage?.querySelector('[data-test-id="repost-message-button"]'),
			).toBeInTheDocument();
			expect(
				userMessage?.querySelector('[data-test-id="reuse-message-button"]'),
			).toBeInTheDocument();

			await findByText('AI response');
			const botMessage = container.querySelector('.chat-message-from-bot');
			expect(
				botMessage?.querySelector('[data-test-id="repost-message-button"]'),
			).not.toBeInTheDocument();
			expect(
				botMessage?.querySelector('[data-test-id="reuse-message-button"]'),
			).not.toBeInTheDocument();
		});
	});

	describe('panel state synchronization', () => {
		it('should update canvas height when chat or logs panel state changes', async () => {
			renderComponent();

			// Toggle logs panel
			workflowsStore.isLogsPanelOpen = true;
			await waitFor(() => {
				expect(canvasStore.setPanelHeight).toHaveBeenCalled();
			});

			// Close chat panel
			workflowsStore.logsPanelState = LOGS_PANEL_STATE.CLOSED;
			await waitFor(() => {
				expect(canvasStore.setPanelHeight).toHaveBeenCalledWith(0);
			});
		});

		it('should preserve panel state across component remounts', async () => {
			const { unmount, rerender } = renderComponent();

			// Set initial state
			workflowsStore.logsPanelState = LOGS_PANEL_STATE.ATTACHED;
			workflowsStore.isLogsPanelOpen = true;

			// Unmount and remount
			unmount();
			await rerender({});

			expect(workflowsStore.logsPanelState).toBe(LOGS_PANEL_STATE.ATTACHED);
			expect(workflowsStore.isLogsPanelOpen).toBe(true);
		});
	});

	describe('keyboard shortcuts', () => {
		it('should handle Enter key with modifier to start new line', async () => {
			const { findByTestId } = renderComponent();

			const input = await findByTestId('chat-input');
			await userEvent.type(input, 'Line 1');
			await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
			await userEvent.type(input, 'Line 2');

			expect(input).toHaveValue('Line 1\nLine 2');
		});
	});
});
