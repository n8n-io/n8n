import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { defineComponent, h } from 'vue';

// Type for Vue component instance with setup state
interface VueComponentInstance {
	__vueParentComponent?: {
		setupState?: {
			onUserMessage?: (message: string) => Promise<void>;
			showAskOwnerTooltip?: boolean;
			showExecuteMessage?: boolean;
		};
	};
}

// Mock workflow saving first before any other imports
const saveCurrentWorkflowMock = vi.hoisted(() => vi.fn());
vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: vi.fn().mockReturnValue({
		saveCurrentWorkflow: saveCurrentWorkflowMock,
		getWorkflowDataToSave: vi.fn(),
		executeData: vi.fn(),
		getNodeTypes: vi.fn().mockReturnValue([]),
	}),
}));

// Mock ExecuteMessage component
vi.mock('./ExecuteMessage.vue', () => ({
	default: defineComponent({
		name: 'ExecuteMessage',
		emits: ['workflow-executed'],
		setup() {
			return () => h('div', { 'data-test-id': 'execute-message-component' }, 'Execute and refine');
		},
	}),
}));

// Mock AskAssistantChat component
vi.mock('@n8n/design-system/components/AskAssistantChat/AskAssistantChat.vue', () => ({
	default: defineComponent({
		name: 'AskAssistantChat',
		props: [
			'user',
			'messages',
			'streaming',
			'loadingMessage',
			'creditsQuota',
			'creditsRemaining',
			'showAskOwnerTooltip',
		],
		emits: ['message', 'feedback', 'stop', 'upgrade-click'],
		setup(props, { emit, expose, slots }) {
			const feedbackText = { value: '' };

			const sendMessage = (message: string) => {
				emit('message', message);
			};
			expose({ sendMessage });

			// Create a more realistic mock that includes rating buttons and slots when needed
			return () => {
				const lastMessage = props.messages?.[props.messages.length - 1];
				const showRating = lastMessage?.showRating;

				return h('div', { 'data-test-id': 'mocked-assistant-chat' }, [
					showRating
						? [
								h('button', {
									'data-test-id': 'message-thumbs-up-button',
									onClick: () => emit('feedback', { rating: 'up' }),
								}),
								h('button', {
									'data-test-id': 'message-thumbs-down-button',
									onClick: () => {
										emit('feedback', { rating: 'down' });
									},
								}),
								h('input', {
									'data-test-id': 'message-feedback-input',
									onInput: (e: Event) => {
										feedbackText.value = (e.target as HTMLInputElement).value;
									},
								}),
								h('button', {
									'data-test-id': 'message-submit-feedback-button',
									onClick: () => emit('feedback', { rating: 'down', feedback: feedbackText.value }),
								}),
							]
						: null,
					// Render messagesFooter slot if it exists
					slots.messagesFooter?.(),
				]);
			};
		},
	}),
}));

import { createComponentRenderer } from '@/__tests__/render';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { fireEvent } from '@testing-library/vue';

import { faker } from '@faker-js/faker';

import AskAssistantBuild from './AskAssistantBuild.vue';
import { useBuilderStore } from '../../builder.store';
import { mockedStore } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { INodeUi } from '@/Interface';
import { useUsersStore } from '@/features/settings/users/users.store';

const nodeViewEventBusEmitMock = vi.hoisted(() => vi.fn());
vi.mock('@/app/event-bus', () => ({
	nodeViewEventBus: {
		emit: nodeViewEventBusEmitMock,
	},
	dataPinningEventBus: {
		on: vi.fn(),
		off: vi.fn(),
		emit: vi.fn(),
	},
}));

// Mock telemetry
const trackMock = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: trackMock,
	}),
}));

// Mock i18n
vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('vue-router', () => {
	const params = {};
	const push = vi.fn();
	const replace = vi.fn();
	const resolve = vi.fn().mockImplementation(() => ({ href: '' }));
	return {
		useRoute: () => ({
			params,
		}),
		useRouter: () => ({
			push,
			replace,
			resolve,
		}),
		RouterLink: vi.fn(),
	};
});

// Mock usePageRedirectionHelper
const goToUpgradeMock = vi.fn();
vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({
		goToUpgrade: goToUpgradeMock,
	}),
}));

const workflowPrompt = 'Create a workflow';
describe('AskAssistantBuild', () => {
	const sessionId = faker.string.uuid();
	const renderComponent = createComponentRenderer(AskAssistantBuild);
	let builderStore: ReturnType<typeof mockedStore<typeof useBuilderStore>>;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	beforeAll(() => {
		Element.prototype.scrollTo = vi.fn(() => {});
	});

	beforeEach(() => {
		vi.clearAllMocks();

		const pinia = createTestingPinia({
			initialState: {
				[STORES.BUILDER]: {
					chatMessages: [],
					currentSessionId: sessionId,
					streaming: false,
					assistantThinkingMessage: undefined,
					workflowPrompt,
					creditsQuota: -1,
					creditsRemaining: 0,
				},
				[STORES.USERS]: {
					currentUser: {
						id: '1',
						firstName: 'Test',
						lastName: 'User',
						email: 'test@example.com',
					},
					isInstanceOwner: true,
				},
			},
		});

		setActivePinia(pinia);
		builderStore = mockedStore(useBuilderStore);
		workflowsStore = mockedStore(useWorkflowsStore);

		// Mock action implementations
		builderStore.sendChatMessage = vi.fn();
		builderStore.resetBuilderChat = vi.fn();
		builderStore.addAssistantMessages = vi.fn();
		builderStore.applyWorkflowUpdate = vi
			.fn()
			.mockReturnValue({ success: true, workflowData: {}, newNodeIds: [] });
		builderStore.getWorkflowSnapshot = vi.fn().mockReturnValue('{}');
		builderStore.getRunningTools = vi.fn().mockReturnValue([]);
		builderStore.workflowMessages = [];
		builderStore.toolMessages = [];
		builderStore.workflowPrompt = workflowPrompt;
		builderStore.trackingSessionId = 'app_session_id';
		workflowsStore.workflowId = 'abc123';
	});

	describe('rendering', () => {
		it('should render component correctly', () => {
			const { getByTestId } = renderComponent();
			// The wrapper div has the data-test-id, but we verify the mocked chat is rendered
			expect(getByTestId('mocked-assistant-chat')).toBeInTheDocument();
		});

		it('should pass correct props to AskAssistantChat component', () => {
			renderComponent();

			// Basic verification that no methods were called on mount
			expect(builderStore.sendChatMessage).not.toHaveBeenCalled();
			expect(builderStore.addAssistantMessages).not.toHaveBeenCalled();
		});

		it('should show ask owner tooltip when user is not instance owner', () => {
			const usersStore = mockedStore(useUsersStore);
			usersStore.isInstanceOwner = false;

			const { container } = renderComponent();

			// Get the component instance
			const vm = (container.firstElementChild as VueComponentInstance)?.__vueParentComponent;
			const showAskOwnerTooltip = vm?.setupState?.showAskOwnerTooltip;

			expect(showAskOwnerTooltip).toBe(true);
		});

		it('should not show ask owner tooltip when user is instance owner', () => {
			const usersStore = mockedStore(useUsersStore);
			usersStore.isInstanceOwner = true;

			const { container } = renderComponent();

			// Get the component instance
			const vm = (container.firstElementChild as VueComponentInstance)?.__vueParentComponent;
			const showAskOwnerTooltip = vm?.setupState?.showAskOwnerTooltip;

			expect(showAskOwnerTooltip).toBe(false);
		});
	});

	describe('user message handling', () => {
		it('should initialize builder chat when a user sends a message', async () => {
			// Mock empty workflow to ensure initialGeneration is true
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			const { container } = renderComponent();
			const testMessage = 'Create a workflow to send emails';

			// Find the component instance and directly call the onUserMessage handler
			const vm = (container.firstElementChild as VueComponentInstance)?.__vueParentComponent;
			if (vm?.setupState?.onUserMessage) {
				await vm.setupState.onUserMessage(testMessage);
			}

			await flushPromises();

			expect(builderStore.sendChatMessage).toHaveBeenCalledWith({
				initialGeneration: true,
				text: testMessage,
			});
		});
	});

	describe('feedback handling', () => {
		const workflowJson = '{"nodes": [], "connections": {}}';

		describe('when workflow-updated message exists', () => {
			beforeEach(() => {
				// Use $patch to ensure reactivity
				builderStore.$patch({
					chatMessages: [
						{
							id: faker.string.uuid(),
							role: 'assistant',
							type: 'workflow-updated',
							read: true,
							codeSnippet: workflowJson,
						},
						{
							id: faker.string.uuid(),
							role: 'assistant',
							type: 'text',
							content: 'Wat',
							read: true,
							showRating: true,
							ratingStyle: 'minimal',
						},
					],
				});
			});

			it('should track feedback when user rates the workflow positively', async () => {
				// Render component after setting up the store state
				const { findByTestId } = renderComponent();

				await flushPromises();

				// Find thumbs up button in RateWorkflowMessage component
				const thumbsUpButton = await findByTestId('message-thumbs-up-button');
				await fireEvent.click(thumbsUpButton);

				await flushPromises();

				expect(trackMock).toHaveBeenCalledWith('User rated workflow generation', {
					helpful: true,
					workflow_id: 'abc123',
					session_id: 'app_session_id',
				});
			});

			it('should track feedback when user rates the workflow negatively', async () => {
				const { findByTestId } = renderComponent();

				await flushPromises();

				// Find thumbs down button in RateWorkflowMessage component
				const thumbsDownButton = await findByTestId('message-thumbs-down-button');
				await fireEvent.click(thumbsDownButton);

				await flushPromises();

				expect(trackMock).toHaveBeenCalledWith('User rated workflow generation', {
					helpful: false,
					session_id: 'app_session_id',
					workflow_id: 'abc123',
				});
			});

			it('should track text feedback when submitted', async () => {
				const { findByTestId } = renderComponent();

				const feedbackText = 'This workflow is great but could be improved';

				// Click thumbs down to show feedback form
				const thumbsDownButton = await findByTestId('message-thumbs-down-button');
				thumbsDownButton.click();

				await flushPromises();

				// Type feedback and submit
				const feedbackInput = await findByTestId('message-feedback-input');
				await fireEvent.update(feedbackInput, feedbackText);

				const submitButton = await findByTestId('message-submit-feedback-button');
				submitButton.click();

				await flushPromises();

				expect(trackMock).toHaveBeenCalledWith(
					'User submitted workflow generation feedback',
					expect.objectContaining({
						feedback: feedbackText,
						workflow_id: 'abc123',
					}),
				);
			});
		});

		describe('when no workflow-updated message exists', () => {
			beforeEach(() => {
				builderStore.$patch({
					chatMessages: [
						{
							id: faker.string.uuid(),
							role: 'assistant',
							type: 'text',
							content: 'This is just an informational message',
							read: true,
							showRating: false,
						},
					],
				});
			});

			it('should not show rating buttons when no workflow update occurred', async () => {
				const { queryAllByTestId } = renderComponent();

				await flushPromises();

				// Rating buttons should not be present
				expect(queryAllByTestId('message-thumbs-up-button')).toHaveLength(0);
				expect(queryAllByTestId('message-thumbs-down-button')).toHaveLength(0);
			});
		});

		describe('when tools are still running', () => {
			beforeEach(() => {
				builderStore.$patch({
					chatMessages: [
						{
							id: faker.string.uuid(),
							role: 'assistant',
							type: 'tool',
							toolName: 'add_nodes',
							status: 'running',
							updates: [],
							read: true,
						},
						{
							id: faker.string.uuid(),
							role: 'assistant',
							type: 'workflow-updated',
							read: true,
							codeSnippet: workflowJson,
						},
						{
							id: faker.string.uuid(),
							role: 'assistant',
							type: 'text',
							content: 'Working on your workflow...',
							read: true,
							showRating: true,
							ratingStyle: 'minimal',
						},
					],
				});
			});

			it('should show minimal rating style when tools are still running', async () => {
				const { findByTestId } = renderComponent();

				await flushPromises();

				// Check that rating buttons exist but in minimal style
				const thumbsUpButton = await findByTestId('message-thumbs-up-button');
				expect(thumbsUpButton).toBeInTheDocument();

				// The minimal style should have icon-only buttons (no label)
				expect(thumbsUpButton.textContent).toBe('');
			});
		});
	});

	describe('workflow saving after generation', () => {
		it('should save workflow after initial generation when workflow was empty', async () => {
			// Setup: empty workflow
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			const wrapper = renderComponent();

			// Send initial message to start generation
			const testMessage = 'Create a workflow to send emails';
			const vm = (wrapper.container.firstElementChild as VueComponentInstance)
				?.__vueParentComponent;
			if (vm?.setupState?.onUserMessage) {
				await vm.setupState.onUserMessage(testMessage);
			}

			await flushPromises();

			expect(builderStore.sendChatMessage).toHaveBeenCalledWith({
				initialGeneration: true,
				text: testMessage,
			});

			// Simulate streaming starts
			builderStore.$patch({ streaming: true, initialGeneration: true });

			await flushPromises();

			// Simulate workflow update with nodes
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			// Add successful message to chat to indicate successful generation
			builderStore.$patch({
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: testMessage },
					{ id: '2', role: 'assistant', type: 'text', content: 'Workflow created successfully' },
				],
			});

			// Simulate streaming ends
			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify workflow was saved
			expect(saveCurrentWorkflowMock).toHaveBeenCalled();
		});

		it('should NOT save workflow after generation when workflow already had nodes', async () => {
			// Setup: workflow with existing nodes
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'existing',
							name: 'Existing',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			const wrapper = renderComponent();

			// Send message to modify existing workflow
			const testMessage = 'Add an HTTP node';
			const vm = (wrapper.container.firstElementChild as VueComponentInstance)
				?.__vueParentComponent;
			if (vm?.setupState?.onUserMessage) {
				await vm.setupState.onUserMessage(testMessage);
			}

			await flushPromises();

			expect(builderStore.sendChatMessage).toHaveBeenCalledWith({
				initialGeneration: false,
				text: testMessage,
			});

			// Simulate streaming starts
			builderStore.$patch({ streaming: true });
			await flushPromises();

			// Simulate workflow update with additional nodes
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'existing',
							name: 'Existing',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
						{
							id: 'node2',
							name: 'HTTP',
							type: 'n8n-nodes-base.httpRequest',
							position: [100, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			// Simulate streaming ends
			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify workflow was NOT saved
			expect(saveCurrentWorkflowMock).toHaveBeenCalledTimes(0);
		});

		it('should NOT save workflow when generation ends with error', async () => {
			// Setup: empty workflow
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			const wrapper = renderComponent();

			// Send initial message
			const testMessage = 'Create a workflow';
			const vm = (wrapper.container.firstElementChild as VueComponentInstance)
				?.__vueParentComponent;
			if (vm?.setupState?.onUserMessage) {
				await vm.setupState.onUserMessage(testMessage);
			}

			await flushPromises();

			// Simulate streaming starts
			builderStore.$patch({ streaming: true });
			await flushPromises();

			// Simulate workflow update with nodes BEFORE error occurs
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			// Simulate error message added to chat
			builderStore.$patch({
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: testMessage },
					{ id: '2', role: 'assistant', type: 'error', content: 'An error occurred' },
				],
			});

			// Simulate streaming ends with error
			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify workflow was NOT saved despite having nodes because of the error
			expect(saveCurrentWorkflowMock).not.toHaveBeenCalled();
		});

		it('should NOT save workflow when generation is cancelled', async () => {
			// Setup: empty workflow
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			const wrapper = renderComponent();

			// Send initial message
			const testMessage = 'Create a workflow';
			const vm = (wrapper.container.firstElementChild as VueComponentInstance)
				?.__vueParentComponent;
			if (vm?.setupState?.onUserMessage) {
				await vm.setupState.onUserMessage(testMessage);
			}

			// Simulate streaming starts
			builderStore.$patch({ streaming: true });
			await flushPromises();

			// Simulate workflow update with nodes BEFORE cancellation
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			// User cancels generation - this adds an aborted message
			builderStore.$patch({
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: testMessage },
					{
						id: '2',
						role: 'assistant',
						type: 'text',
						content: 'Task aborted',
						aborted: true,
					},
				],
			});

			// Simulate streaming ends after cancellation
			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify workflow was NOT saved despite having nodes because generation was cancelled
			expect(saveCurrentWorkflowMock).not.toHaveBeenCalled();
		});

		it('should work when opening existing AI builder session', async () => {
			// Setup: existing workflow with AI session
			workflowsStore.workflowId = 'existing-id';
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });

			// Simulate existing AI session messages
			builderStore.$patch({
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: 'Previous message' },
					{ id: '2', role: 'assistant', type: 'text', content: 'Previous response' },
				],
			});

			const wrapper = renderComponent();

			// Send new message in existing session
			const testMessage = 'Add email nodes';
			const vm = (wrapper.container.firstElementChild as VueComponentInstance)
				?.__vueParentComponent;
			if (vm?.setupState?.onUserMessage) {
				await vm.setupState.onUserMessage(testMessage);
			}

			// Simulate streaming starts
			builderStore.$patch({ streaming: true, initialGeneration: true });
			await flushPromises();

			// Add nodes to workflow
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'node1',
							name: 'Email',
							type: 'n8n-nodes-base.emailSend',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			// Add successful message to chat (building on existing session messages)
			builderStore.$patch({
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: 'Previous message' },
					{ id: '2', role: 'assistant', type: 'text', content: 'Previous response' },
					{ id: '3', role: 'user', type: 'text', content: testMessage },
					{ id: '4', role: 'assistant', type: 'text', content: 'Added email nodes successfully' },
				],
			});

			// Simulate streaming ends
			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify workflow was saved
			expect(saveCurrentWorkflowMock).toHaveBeenCalled();
		});

		it('should save workflow when user deletes all nodes then regenerates', async () => {
			// Setup: workflow with existing nodes
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'existing',
							name: 'Existing',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			const wrapper = renderComponent();

			// User manually deletes all nodes (simulated by clearing workflow)
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			await flushPromises();

			// Send message to generate new workflow
			const testMessage = 'Create a new workflow';
			const vm = (wrapper.container.firstElementChild as VueComponentInstance)
				?.__vueParentComponent;
			if (vm?.setupState?.onUserMessage) {
				await vm.setupState.onUserMessage(testMessage);
			}

			await flushPromises();

			expect(builderStore.sendChatMessage).toHaveBeenCalledWith({
				initialGeneration: true,
				text: testMessage,
			});

			// Simulate streaming starts
			builderStore.$patch({ streaming: true, initialGeneration: true });
			await flushPromises();

			// Add new nodes to workflow
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'new-node',
							name: 'New Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			// Add successful message to chat
			builderStore.$patch({
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: testMessage },
					{
						id: '2',
						role: 'assistant',
						type: 'text',
						content: 'New workflow created successfully',
					},
				],
			});

			// Simulate streaming ends
			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify workflow was saved after regeneration
			expect(saveCurrentWorkflowMock).toHaveBeenCalled();
		});

		it('should NOT save if workflow is still empty after generation ends', async () => {
			// Setup: empty workflow
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			const wrapper = renderComponent();

			// Send message
			const testMessage = 'Create a workflow';
			const vm = (wrapper.container.firstElementChild as VueComponentInstance)
				?.__vueParentComponent;
			if (vm?.setupState?.onUserMessage) {
				await vm.setupState.onUserMessage(testMessage);
			}

			// Simulate streaming starts
			builderStore.$patch({ streaming: true });
			await flushPromises();

			// Workflow remains empty (maybe AI couldn't generate anything)
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });

			// Simulate streaming ends
			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify workflow was NOT saved
			expect(saveCurrentWorkflowMock).not.toHaveBeenCalled();
		});
	});

	describe('canvas-initiated generation', () => {
		it('should save workflow after initial generation from canvas', async () => {
			// Setup: empty workflow
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			renderComponent();

			// Simulate canvas-initiated generation with initialGeneration flag
			builderStore.initialGeneration = true;

			// Simulate streaming starts
			builderStore.$patch({ streaming: true });
			await flushPromises();

			// Simulate workflow update with nodes
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			// Add successful message to chat
			builderStore.$patch({
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: 'Create workflow from canvas' },
					{ id: '2', role: 'assistant', type: 'text', content: 'Workflow created successfully' },
				],
			});

			// Simulate streaming ends
			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify workflow was saved
			expect(saveCurrentWorkflowMock).toHaveBeenCalled();
			// Verify initialGeneration flag was reset
			expect(builderStore.initialGeneration).toBe(false);
		});

		it('should NOT save workflow from canvas when generation fails', async () => {
			// Setup: empty workflow
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			renderComponent();

			// Simulate canvas-initiated generation with initialGeneration flag
			builderStore.initialGeneration = true;

			// Simulate streaming starts
			builderStore.$patch({ streaming: true });
			await flushPromises();

			// Simulate workflow update with nodes
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			// Add error message to chat
			builderStore.$patch({
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: 'Create workflow from canvas' },
					{ id: '2', role: 'assistant', type: 'error', content: 'Generation failed' },
				],
			});

			// Simulate streaming ends
			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify workflow was NOT saved
			expect(saveCurrentWorkflowMock).not.toHaveBeenCalled();
			// Verify initialGeneration flag was reset
			expect(builderStore.initialGeneration).toBe(false);
		});

		it('should NOT save workflow from canvas when generation is cancelled', async () => {
			// Setup: empty workflow
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			renderComponent();

			// Simulate canvas-initiated generation with initialGeneration flag
			builderStore.initialGeneration = true;

			// Simulate streaming starts
			builderStore.$patch({ streaming: true });
			await flushPromises();

			// Simulate workflow update with nodes
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			// Add cancellation message to chat
			builderStore.$patch({
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: 'Create workflow from canvas' },
					{
						id: '2',
						role: 'assistant',
						type: 'text',
						content: 'Task aborted',
						aborted: true,
					},
				],
			});

			// Simulate streaming ends
			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify workflow was NOT saved
			expect(saveCurrentWorkflowMock).not.toHaveBeenCalled();
			// Verify initialGeneration flag was reset
			expect(builderStore.initialGeneration).toBe(false);
		});

		it('should handle multiple canvas generations correctly', async () => {
			// Setup: empty workflow
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			renderComponent();

			// First canvas generation
			builderStore.initialGeneration = true;
			builderStore.$patch({ streaming: true });
			await flushPromises();

			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			builderStore.$patch({
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: 'First generation' },
					{ id: '2', role: 'assistant', type: 'text', content: 'Success' },
				],
			});

			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify first generation saved
			expect(saveCurrentWorkflowMock).toHaveBeenCalledTimes(1);
			expect(builderStore.initialGeneration).toBe(false);

			// User clears workflow manually
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });

			// Second canvas generation
			builderStore.initialGeneration = true;
			builderStore.$patch({ streaming: true });
			await flushPromises();

			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'node2',
							name: 'HTTP',
							type: 'n8n-nodes-base.httpRequest',
							position: [100, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			builderStore.$patch({
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: 'First generation' },
					{ id: '2', role: 'assistant', type: 'text', content: 'Success' },
					{ id: '3', role: 'user', type: 'text', content: 'Second generation' },
					{ id: '4', role: 'assistant', type: 'text', content: 'Success again' },
				],
			});

			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify second generation also saved
			expect(saveCurrentWorkflowMock).toHaveBeenCalledTimes(2);
			expect(builderStore.initialGeneration).toBe(false);
		});
	});

	describe('Execute and refine section visibility', () => {
		it('should hide ExecuteMessage component when there is an error after workflow update', async () => {
			// Setup: workflow with nodes
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			const { queryByTestId } = renderComponent();

			// Simulate workflow update message followed by error
			builderStore.$patch({
				streaming: false,
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: 'Create a workflow' },
					{
						id: '2',
						role: 'assistant',
						type: 'workflow-updated',
						codeSnippet: JSON.stringify({ nodes: [], connections: {} }),
					},
					{ id: '3', role: 'assistant', type: 'error', content: 'An error occurred' },
				],
			});

			await flushPromises();

			// Verify the ExecuteMessage component should NOT be rendered
			expect(queryByTestId('execute-message-component')).not.toBeInTheDocument();
		});

		it('should show ExecuteMessage component when there is NO error after workflow update', async () => {
			// Setup: workflow with nodes
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			const { queryByTestId } = renderComponent();

			// Simulate workflow update message WITHOUT error
			builderStore.$patch({
				streaming: false,
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: 'Create a workflow' },
					{
						id: '2',
						role: 'assistant',
						type: 'workflow-updated',
						codeSnippet: JSON.stringify({ nodes: [], connections: {} }),
					},
					{ id: '3', role: 'assistant', type: 'text', content: 'Workflow created successfully' },
				],
			});

			await flushPromises();

			// Verify the ExecuteMessage component SHOULD be rendered
			expect(queryByTestId('execute-message-component')).toBeInTheDocument();
		});

		it('should show ExecuteMessage component when error occurs BEFORE workflow update', async () => {
			// Setup: workflow with nodes
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			const { queryByTestId } = renderComponent();

			// Simulate error BEFORE workflow update
			builderStore.$patch({
				streaming: false,
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: 'Create a workflow' },
					{ id: '2', role: 'assistant', type: 'error', content: 'Initial error' },
					{
						id: '3',
						role: 'assistant',
						type: 'workflow-updated',
						codeSnippet: JSON.stringify({ nodes: [], connections: {} }),
					},
					{ id: '4', role: 'assistant', type: 'text', content: 'Recovered and created workflow' },
				],
			});

			await flushPromises();

			// Verify the ExecuteMessage component SHOULD be rendered because error was before workflow update
			expect(queryByTestId('execute-message-component')).toBeInTheDocument();
		});

		it('should hide ExecuteMessage component when using update_node_parameters tool followed by error', async () => {
			// Setup: workflow with nodes
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'node1',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			const { queryByTestId } = renderComponent();

			// Simulate update_node_parameters tool call followed by error
			builderStore.$patch({
				streaming: false,
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: 'Update the HTTP node parameters' },
					{
						id: '2',
						role: 'assistant',
						type: 'tool',
						toolName: 'update_node_parameters',
						status: 'completed',
						updates: [],
					},
					{ id: '3', role: 'assistant', type: 'error', content: 'Failed to update parameters' },
				],
			});

			await flushPromises();

			// Verify the ExecuteMessage component should NOT be rendered
			expect(queryByTestId('execute-message-component')).not.toBeInTheDocument();
		});

		it('should hide ExecuteMessage component when task is aborted after workflow update', async () => {
			// Setup: workflow with nodes
			workflowsStore.$patch({
				workflow: {
					nodes: [
						{
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			const { queryByTestId } = renderComponent();

			// Simulate workflow update message followed by task aborted message
			builderStore.$patch({
				streaming: false,
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: 'Create a workflow' },
					{
						id: '2',
						role: 'assistant',
						type: 'workflow-updated',
						codeSnippet: JSON.stringify({ nodes: [], connections: {} }),
					},
					{
						id: '3',
						role: 'assistant',
						type: 'text',
						content: 'Task aborted',
						aborted: true,
					},
				],
			});

			await flushPromises();

			// Verify the ExecuteMessage component should NOT be rendered
			expect(queryByTestId('execute-message-component')).not.toBeInTheDocument();
		});
	});

	describe('shouldTidyUp logic', () => {
		it('should set tidyUp to true when new nodes are added', async () => {
			const originalWorkflow = { nodes: [], connections: {} };
			const newWorkflow = {
				nodes: [
					{
						id: 'new-node-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						position: [0, 0] as [number, number],
						typeVersion: 1,
						parameters: {},
					},
				],
				connections: {},
			};

			builderStore.getWorkflowSnapshot.mockReturnValue(JSON.stringify(originalWorkflow));
			builderStore.applyWorkflowUpdate.mockReturnValue({
				success: true,
				workflowData: newWorkflow,
				newNodeIds: ['new-node-1'],
				oldNodeIds: [],
			});

			workflowsStore.$patch({ workflow: originalWorkflow });

			renderComponent();

			builderStore.$patch({ streaming: true });
			await flushPromises();

			// Trigger workflow update with new nodes
			builderStore.workflowMessages = [
				{
					id: faker.string.uuid(),
					role: 'assistant' as const,
					type: 'workflow-updated' as const,
					codeSnippet: JSON.stringify(newWorkflow),
				},
			];

			await flushPromises();

			// Verify importWorkflowData was called with tidyUp: true
			expect(nodeViewEventBusEmitMock).toHaveBeenCalledWith('importWorkflowData', {
				data: newWorkflow,
				tidyUp: true,
				nodesIdsToTidyUp: ['new-node-1'],
				regenerateIds: false,
				trackEvents: false,
			});
		});

		it('should set tidyUp to false when no new nodes are added (only parameter updates)', async () => {
			const existingWorkflow = {
				nodes: [
					{
						id: 'existing-node',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						position: [0, 0] as [number, number],
						typeVersion: 1,
						parameters: { url: 'http://old.com' },
					},
				],
				connections: {},
			};
			const updatedWorkflow = {
				nodes: [
					{
						id: 'existing-node',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						position: [0, 0] as [number, number],
						typeVersion: 1,
						parameters: { url: 'http://new.com' },
					},
				],
				connections: {},
			};

			builderStore.getWorkflowSnapshot.mockReturnValue(JSON.stringify(existingWorkflow));
			builderStore.applyWorkflowUpdate.mockReturnValue({
				success: true,
				workflowData: updatedWorkflow,
				newNodeIds: [], // No new nodes, just parameter update
				oldNodeIds: ['existing-node'],
			});

			workflowsStore.$patch({ workflow: existingWorkflow });

			renderComponent();

			builderStore.$patch({ streaming: true });
			await flushPromises();

			// Trigger workflow update without new nodes
			builderStore.workflowMessages = [
				{
					id: faker.string.uuid(),
					role: 'assistant' as const,
					type: 'workflow-updated' as const,
					codeSnippet: JSON.stringify(updatedWorkflow),
				},
			];

			await flushPromises();

			// Verify importWorkflowData was called with tidyUp: false
			expect(nodeViewEventBusEmitMock).toHaveBeenCalledWith('importWorkflowData', {
				data: updatedWorkflow,
				tidyUp: false,
				nodesIdsToTidyUp: [],
				regenerateIds: false,
				trackEvents: false,
			});
		});

		it('should keep tidyUp true once set within the same user message exchange', async () => {
			const workflow1 = { nodes: [], connections: {} };
			const workflow2 = {
				nodes: [
					{
						id: 'node-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						position: [0, 0] as [number, number],
						typeVersion: 1,
						parameters: {},
					},
				],
				connections: {},
			};
			const workflow3 = {
				nodes: [
					{
						id: 'node-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						position: [0, 0] as [number, number],
						typeVersion: 1,
						parameters: { updated: true },
					},
				],
				connections: {},
			};

			builderStore.getWorkflowSnapshot.mockReturnValue(JSON.stringify(workflow1));

			// First update adds new nodes
			builderStore.applyWorkflowUpdate
				.mockReturnValueOnce({
					success: true,
					workflowData: workflow2,
					newNodeIds: ['node-1'],
					oldNodeIds: [],
				})
				// Second update has no new nodes (just parameter change)
				.mockReturnValueOnce({
					success: true,
					workflowData: workflow3,
					newNodeIds: [],
					oldNodeIds: ['node-1'],
				});

			workflowsStore.$patch({ workflow: workflow1 });

			renderComponent();

			builderStore.$patch({ streaming: true });
			await flushPromises();

			const msgId1 = faker.string.uuid();
			const msgId2 = faker.string.uuid();

			// First workflow update (adds new nodes)
			builderStore.workflowMessages = [
				{
					id: msgId1,
					role: 'assistant' as const,
					type: 'workflow-updated' as const,
					codeSnippet: JSON.stringify(workflow2),
				},
			];

			await flushPromises();

			// First call should have tidyUp: true
			expect(nodeViewEventBusEmitMock).toHaveBeenCalledWith('importWorkflowData', {
				data: workflow2,
				tidyUp: true,
				nodesIdsToTidyUp: ['node-1'],
				regenerateIds: false,
				trackEvents: false,
			});

			nodeViewEventBusEmitMock.mockClear();

			// Second workflow update (no new nodes, just parameter update)
			builderStore.workflowMessages = [
				{
					id: msgId1,
					role: 'assistant' as const,
					type: 'workflow-updated' as const,
					codeSnippet: JSON.stringify(workflow2),
				},
				{
					id: msgId2,
					role: 'assistant' as const,
					type: 'workflow-updated' as const,
					codeSnippet: JSON.stringify(workflow3),
				},
			];

			await flushPromises();

			// Second call should still have tidyUp: true because it was set earlier
			expect(nodeViewEventBusEmitMock).toHaveBeenCalledWith('importWorkflowData', {
				data: workflow3,
				tidyUp: true,
				nodesIdsToTidyUp: [],
				regenerateIds: false,
				trackEvents: false,
			});
		});

		it('should reset shouldTidyUp flag on new user message', async () => {
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			const { container } = renderComponent();

			const workflow1 = {
				nodes: [
					{
						id: 'node-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						position: [0, 0] as [number, number],
						typeVersion: 1,
						parameters: {},
					},
				],
				connections: {},
			};

			builderStore.getWorkflowSnapshot.mockReturnValue('{}');
			builderStore.applyWorkflowUpdate.mockReturnValue({
				success: true,
				workflowData: workflow1,
				newNodeIds: ['node-1'],
				oldNodeIds: [],
			});

			// First message exchange - adds nodes
			builderStore.$patch({ streaming: true });
			await flushPromises();

			builderStore.workflowMessages = [
				{
					id: faker.string.uuid(),
					role: 'assistant' as const,
					type: 'workflow-updated' as const,
					codeSnippet: JSON.stringify(workflow1),
				},
			];

			await flushPromises();

			expect(nodeViewEventBusEmitMock).toHaveBeenCalledWith('importWorkflowData', {
				data: workflow1,
				tidyUp: true,
				nodesIdsToTidyUp: ['node-1'],
				regenerateIds: false,
				trackEvents: false,
			});

			builderStore.$patch({ streaming: false });
			await flushPromises();

			nodeViewEventBusEmitMock.mockClear();

			// Second message - user sends new message, which should reset shouldTidyUp
			const vm = (container.firstElementChild as VueComponentInstance)?.__vueParentComponent;
			if (vm?.setupState?.onUserMessage) {
				await vm.setupState.onUserMessage('Update parameters');
			}
			await flushPromises();

			// Now simulate a workflow update with no new nodes
			const workflow2 = {
				nodes: [
					{
						id: 'node-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						position: [0, 0] as [number, number],
						typeVersion: 1,
						parameters: { updated: true },
					},
				],
				connections: {},
			};

			builderStore.applyWorkflowUpdate.mockReturnValue({
				success: true,
				workflowData: workflow2,
				newNodeIds: [], // No new nodes this time
				oldNodeIds: ['node-1'],
			});

			builderStore.$patch({ streaming: true });
			await flushPromises();

			builderStore.workflowMessages = [
				{
					id: faker.string.uuid(),
					role: 'assistant' as const,
					type: 'workflow-updated' as const,
					codeSnippet: JSON.stringify(workflow2),
				},
			];

			await flushPromises();

			// shouldTidyUp should be reset, so tidyUp should be false
			expect(nodeViewEventBusEmitMock).toHaveBeenCalledWith('importWorkflowData', {
				data: workflow2,
				tidyUp: false,
				nodesIdsToTidyUp: [],
				regenerateIds: false,
				trackEvents: false,
			});
		});
	});
});
