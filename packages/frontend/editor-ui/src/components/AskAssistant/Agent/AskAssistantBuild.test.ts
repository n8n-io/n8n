import { describe, it, expect, vi, beforeEach } from 'vitest';
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

vi.mock('@/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: vi.fn().mockReturnValue({
		getCurrentWorkflow: vi.fn(),
		saveCurrentWorkflow: vi.fn(),
		getWorkflowDataToSave: vi.fn(),
		setDocumentTitle: vi.fn(),
		executeData: vi.fn(),
		getNodeTypes: vi.fn().mockReturnValue([]),
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

			expect(builderStore.sendChatMessage).toHaveBeenCalledWith({ text: testMessage });
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
});
