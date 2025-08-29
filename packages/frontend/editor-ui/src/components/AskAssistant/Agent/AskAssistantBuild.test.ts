import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Mock workflow saving first before any other imports
const saveCurrentWorkflowMock = vi.hoisted(() => vi.fn());
vi.mock('@/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: vi.fn().mockReturnValue({
		saveCurrentWorkflow: saveCurrentWorkflowMock,
		getWorkflowDataToSave: vi.fn(),
		setDocumentTitle: vi.fn(),
		executeData: vi.fn(),
		getNodeTypes: vi.fn().mockReturnValue([]),
	}),
}));

import { createComponentRenderer } from '@/__tests__/render';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { fireEvent } from '@testing-library/vue';

import { faker } from '@faker-js/faker';

import AskAssistantBuild from './AskAssistantBuild.vue';
import { useBuilderStore } from '@/stores/builder.store';
import { mockedStore } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { INodeUi } from '@/Interface';

vi.mock('@/event-bus', () => ({
	nodeViewEventBus: {
		emit: vi.fn(),
	},
}));

// Mock telemetry
const trackMock = vi.fn();
vi.mock('@/composables/useTelemetry', () => ({
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
		builderStore.workflowMessages = [];
		builderStore.toolMessages = [];
		builderStore.workflowPrompt = workflowPrompt;
		builderStore.trackingSessionId = 'app_session_id';

		workflowsStore.workflowId = 'abc123';
	});

	describe('rendering', () => {
		it('should render component correctly', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('ask-assistant-chat')).toBeInTheDocument();
		});

		it('should pass correct props to AskAssistantChat component', () => {
			renderComponent();

			// Basic verification that no methods were called on mount
			expect(builderStore.sendChatMessage).not.toHaveBeenCalled();
			expect(builderStore.addAssistantMessages).not.toHaveBeenCalled();
		});
	});

	describe('user message handling', () => {
		it('should initialize builder chat when a user sends a message', async () => {
			const { getByTestId } = renderComponent();

			const testMessage = 'Create a workflow to send emails';

			// Type message into the chat input
			const chatInput = getByTestId('chat-input');
			await fireEvent.update(chatInput, testMessage);

			// Click the send button
			const sendButton = getByTestId('send-message-button');
			sendButton.click();

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
							ratingStyle: 'regular',
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
			workflowsStore.isNewWorkflow = false;

			const { findByTestId } = renderComponent();

			// Send initial message to start generation
			const testMessage = 'Create a workflow to send emails';
			const chatInput = await findByTestId('chat-input');
			await fireEvent.update(chatInput, testMessage);
			const sendButton = await findByTestId('send-message-button');
			await fireEvent.click(sendButton);

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
							type: 'n8n-nodes-base.start',
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
							type: 'n8n-nodes-base.start',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});
			workflowsStore.isNewWorkflow = false;

			const { findByTestId } = renderComponent();

			// Send message to modify existing workflow
			const testMessage = 'Add an HTTP node';
			const chatInput = await findByTestId('chat-input');
			await fireEvent.update(chatInput, testMessage);
			const sendButton = await findByTestId('send-message-button');
			await fireEvent.click(sendButton);

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
							type: 'n8n-nodes-base.start',
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
			workflowsStore.isNewWorkflow = false;

			const { findByTestId } = renderComponent();

			// Send initial message
			const testMessage = 'Create a workflow';
			const chatInput = await findByTestId('chat-input');
			await fireEvent.update(chatInput, testMessage);
			const sendButton = await findByTestId('send-message-button');
			await fireEvent.click(sendButton);

			// The component should have set initialGeneration to true since workflow was empty
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
							type: 'n8n-nodes-base.start',
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
			workflowsStore.isNewWorkflow = false;

			const { findByTestId } = renderComponent();

			// Send initial message
			const testMessage = 'Create a workflow';
			const chatInput = await findByTestId('chat-input');
			await fireEvent.update(chatInput, testMessage);
			const sendButton = await findByTestId('send-message-button');
			await fireEvent.click(sendButton);

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
							type: 'n8n-nodes-base.start',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});

			// User cancels generation - this adds a "[Task aborted]" message
			builderStore.$patch({
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: testMessage },
					{ id: '2', role: 'assistant', type: 'text', content: '[Task aborted]' },
				],
			});

			// Simulate streaming ends after cancellation
			builderStore.$patch({ streaming: false });
			await flushPromises();

			// Verify workflow was NOT saved despite having nodes because generation was cancelled
			expect(saveCurrentWorkflowMock).not.toHaveBeenCalled();
		});

		it('should save new workflow before sending first message', async () => {
			// Setup: new workflow
			workflowsStore.isNewWorkflow = true;
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });

			const { findByTestId } = renderComponent();

			// Send initial message
			const testMessage = 'Create a workflow';
			const chatInput = await findByTestId('chat-input');
			await fireEvent.update(chatInput, testMessage);
			const sendButton = await findByTestId('send-message-button');
			await fireEvent.click(sendButton);

			await flushPromises();

			// Verify workflow was saved to get ID for session
			expect(saveCurrentWorkflowMock).toHaveBeenCalledTimes(1);
		});

		it('should work when opening existing AI builder session', async () => {
			// Setup: existing workflow with AI session
			workflowsStore.workflowId = 'existing-id';
			workflowsStore.isNewWorkflow = false;
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });

			// Simulate existing AI session messages
			builderStore.$patch({
				chatMessages: [
					{ id: '1', role: 'user', type: 'text', content: 'Previous message' },
					{ id: '2', role: 'assistant', type: 'text', content: 'Previous response' },
				],
			});

			const { findByTestId } = renderComponent();

			// Send new message in existing session
			const testMessage = 'Add email nodes';
			const chatInput = await findByTestId('chat-input');
			await fireEvent.update(chatInput, testMessage);
			const sendButton = await findByTestId('send-message-button');
			await fireEvent.click(sendButton);

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
							type: 'n8n-nodes-base.start',
							position: [0, 0],
							typeVersion: 1,
							parameters: {},
						} as INodeUi,
					],
					connections: {},
				},
			});
			workflowsStore.isNewWorkflow = false;

			const { findByTestId } = renderComponent();

			// User manually deletes all nodes (simulated by clearing workflow)
			workflowsStore.$patch({ workflow: { nodes: [], connections: {} } });
			await flushPromises();

			// Send message to generate new workflow
			const testMessage = 'Create a new workflow';
			const chatInput = await findByTestId('chat-input');
			await fireEvent.update(chatInput, testMessage);
			const sendButton = await findByTestId('send-message-button');
			await fireEvent.click(sendButton);

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
							type: 'n8n-nodes-base.start',
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
			workflowsStore.isNewWorkflow = false;

			const { findByTestId } = renderComponent();

			// Send message
			const testMessage = 'Create a workflow';
			const chatInput = await findByTestId('chat-input');
			await fireEvent.update(chatInput, testMessage);
			const sendButton = await findByTestId('send-message-button');
			await fireEvent.click(sendButton);

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
			workflowsStore.isNewWorkflow = false;

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
							type: 'n8n-nodes-base.start',
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
			workflowsStore.isNewWorkflow = false;

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
							type: 'n8n-nodes-base.start',
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
			workflowsStore.isNewWorkflow = false;

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
							type: 'n8n-nodes-base.start',
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
					{ id: '2', role: 'assistant', type: 'text', content: '[Task aborted]' },
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
			workflowsStore.isNewWorkflow = false;

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
							type: 'n8n-nodes-base.start',
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
});
