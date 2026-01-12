import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { defineComponent, h } from 'vue';

// Type for Vue component instance with setup state
interface VueComponentInstance {
	__vueParentComponent?: {
		setupState?: {
			onUserMessage?: (message: string) => Promise<void>;
			showAskOwnerTooltip?: boolean;
			showExecuteMessage?: boolean;
			isInputDisabled?: boolean;
			disabledTooltip?: string;
		};
	};
}

// Mock workflow saving (component no longer calls save directly, but mock is still needed)
vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: vi.fn().mockReturnValue({
		saveCurrentWorkflow: vi.fn(),
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
			'disabled',
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
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { useWorkflowAutosaveStore } from '@/app/stores/workflowAutosave.store';
import { AutoSaveState } from '@/app/constants';

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

// Mock useDocumentVisibility
let onDocumentVisibleCallback: (() => void) | null = null;
vi.mock('@/app/composables/useDocumentVisibility', () => ({
	useDocumentVisibility: () => ({
		isVisible: { value: true },
		onDocumentVisible: (callback: () => void) => {
			onDocumentVisibleCallback = callback;
		},
		onDocumentHidden: vi.fn(),
	}),
}));

const workflowPrompt = 'Create a workflow';
describe('AskAssistantBuild', () => {
	const sessionId = faker.string.uuid();
	const renderComponent = createComponentRenderer(AskAssistantBuild);
	let builderStore: ReturnType<typeof mockedStore<typeof useBuilderStore>>;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let collaborationStore: ReturnType<typeof mockedStore<typeof useCollaborationStore>>;

	beforeAll(() => {
		Element.prototype.scrollTo = vi.fn(() => {});
	});

	beforeEach(() => {
		vi.clearAllMocks();
		onDocumentVisibleCallback = null;

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
				[STORES.COLLABORATION]: {
					shouldBeReadOnly: false,
				},
				workflowAutosave: {
					autoSaveState: AutoSaveState.Idle,
					pendingAutoSave: null,
				},
			},
		});

		setActivePinia(pinia);
		builderStore = mockedStore(useBuilderStore);
		workflowsStore = mockedStore(useWorkflowsStore);
		collaborationStore = mockedStore(useCollaborationStore);

		// Mock collaboration store methods
		collaborationStore.requestWriteAccess = vi.fn();

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

		it('should disable input when autosave is scheduled', () => {
			const workflowAutosaveStore = mockedStore(useWorkflowAutosaveStore);
			workflowAutosaveStore.autoSaveState = AutoSaveState.Scheduled;

			const { container } = renderComponent();

			const vm = (container.firstElementChild as VueComponentInstance)?.__vueParentComponent;
			const isInputDisabled = vm?.setupState?.isInputDisabled;

			expect(isInputDisabled).toBe(true);
		});

		it('should disable input when autosave is in progress', () => {
			const workflowAutosaveStore = mockedStore(useWorkflowAutosaveStore);
			workflowAutosaveStore.autoSaveState = AutoSaveState.InProgress;

			const { container } = renderComponent();

			const vm = (container.firstElementChild as VueComponentInstance)?.__vueParentComponent;
			const isInputDisabled = vm?.setupState?.isInputDisabled;

			expect(isInputDisabled).toBe(true);
		});

		it('should not disable input when autosave is idle', () => {
			const workflowAutosaveStore = mockedStore(useWorkflowAutosaveStore);
			workflowAutosaveStore.autoSaveState = AutoSaveState.Idle;

			const { container } = renderComponent();

			const vm = (container.firstElementChild as VueComponentInstance)?.__vueParentComponent;
			const isInputDisabled = vm?.setupState?.isInputDisabled;

			expect(isInputDisabled).toBe(false);
		});

		it('should disable input when collaboration shouldBeReadOnly is true regardless of autosave state', () => {
			collaborationStore.shouldBeReadOnly = true;
			const workflowAutosaveStore = mockedStore(useWorkflowAutosaveStore);
			workflowAutosaveStore.autoSaveState = AutoSaveState.Idle;

			const { container } = renderComponent();

			const vm = (container.firstElementChild as VueComponentInstance)?.__vueParentComponent;
			const isInputDisabled = vm?.setupState?.isInputDisabled;

			expect(isInputDisabled).toBe(true);
		});

		it('should show autosaving tooltip when autosave is scheduled', () => {
			const workflowAutosaveStore = mockedStore(useWorkflowAutosaveStore);
			workflowAutosaveStore.autoSaveState = AutoSaveState.Scheduled;

			const { container } = renderComponent();

			const vm = (container.firstElementChild as VueComponentInstance)?.__vueParentComponent;
			const disabledTooltip = vm?.setupState?.disabledTooltip;

			expect(disabledTooltip).toBe('aiAssistant.builder.disabledTooltip.autosaving');
		});

		it('should show autosaving tooltip when autosave is in progress', () => {
			const workflowAutosaveStore = mockedStore(useWorkflowAutosaveStore);
			workflowAutosaveStore.autoSaveState = AutoSaveState.InProgress;

			const { container } = renderComponent();

			const vm = (container.firstElementChild as VueComponentInstance)?.__vueParentComponent;
			const disabledTooltip = vm?.setupState?.disabledTooltip;

			expect(disabledTooltip).toBe('aiAssistant.builder.disabledTooltip.autosaving');
		});

		it('should show read-only tooltip when collaboration shouldBeReadOnly is true', () => {
			collaborationStore.shouldBeReadOnly = true;
			const workflowAutosaveStore = mockedStore(useWorkflowAutosaveStore);
			workflowAutosaveStore.autoSaveState = AutoSaveState.Idle;

			const { container } = renderComponent();

			const vm = (container.firstElementChild as VueComponentInstance)?.__vueParentComponent;
			const disabledTooltip = vm?.setupState?.disabledTooltip;

			expect(disabledTooltip).toBe('aiAssistant.builder.disabledTooltip.readOnly');
		});

		it('should show autosaving tooltip when both autosave is in progress and collaboration is read-only', () => {
			collaborationStore.shouldBeReadOnly = true;
			const workflowAutosaveStore = mockedStore(useWorkflowAutosaveStore);
			workflowAutosaveStore.autoSaveState = AutoSaveState.InProgress;

			const { container } = renderComponent();

			const vm = (container.firstElementChild as VueComponentInstance)?.__vueParentComponent;
			const disabledTooltip = vm?.setupState?.disabledTooltip;

			// Autosaving tooltip takes priority over read-only tooltip
			expect(disabledTooltip).toBe('aiAssistant.builder.disabledTooltip.autosaving');
		});

		it('should not show any tooltip when input is not disabled', () => {
			const workflowAutosaveStore = mockedStore(useWorkflowAutosaveStore);
			workflowAutosaveStore.autoSaveState = AutoSaveState.Idle;

			const { container } = renderComponent();

			const vm = (container.firstElementChild as VueComponentInstance)?.__vueParentComponent;
			const disabledTooltip = vm?.setupState?.disabledTooltip;

			expect(disabledTooltip).toBeUndefined();
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

		it('should request write access when sending a message', async () => {
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			const { container } = renderComponent();
			const testMessage = 'Create a workflow';

			const vm = (container.firstElementChild as VueComponentInstance)?.__vueParentComponent;
			if (vm?.setupState?.onUserMessage) {
				await vm.setupState.onUserMessage(testMessage);
			}

			await flushPromises();

			expect(collaborationStore.requestWriteAccess).toHaveBeenCalled();
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

	describe('initialGeneration flag reset', () => {
		it('should reset initialGeneration flag when streaming ends and workflow has nodes', async () => {
			// Setup: empty workflow
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			renderComponent();

			// Simulate initial generation streaming starts
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

			// Verify initialGeneration is true before streaming ends
			expect(builderStore.initialGeneration).toBe(true);

			// Simulate streaming ends
			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify initialGeneration flag was reset
			expect(builderStore.initialGeneration).toBe(false);
		});

		it('should NOT reset initialGeneration flag when workflow is still empty', async () => {
			// Setup: empty workflow
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			workflowsStore.$patch({ workflowsById: { abc123: { id: 'abc123' } } });

			renderComponent();

			// Simulate initial generation streaming starts
			builderStore.$patch({ streaming: true, initialGeneration: true });
			await flushPromises();

			// Workflow remains empty (AI couldn't generate anything)
			// Do NOT add nodes

			// Simulate streaming ends
			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify initialGeneration flag was NOT reset since workflow is still empty
			expect(builderStore.initialGeneration).toBe(true);
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

	describe('document visibility handling', () => {
		it('should register onDocumentVisible callback on mount', () => {
			renderComponent();

			// Callback should be registered
			expect(onDocumentVisibleCallback).not.toBeNull();
		});

		it('should call clearDoneIndicatorTitle when document becomes visible', async () => {
			builderStore.clearDoneIndicatorTitle = vi.fn();

			renderComponent();

			await flushPromises();

			// Verify callback was registered
			expect(onDocumentVisibleCallback).not.toBeNull();

			// Simulate document becoming visible
			onDocumentVisibleCallback!();

			// Verify clearDoneIndicatorTitle was called
			expect(builderStore.clearDoneIndicatorTitle).toHaveBeenCalled();
		});
	});
});
