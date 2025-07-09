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

const workflowPrompt = 'Create a workflow';
describe('AskAssistantBuild', () => {
	const sessionId = faker.string.uuid();
	const renderComponent = createComponentRenderer(AskAssistantBuild);
	let builderStore: ReturnType<typeof mockedStore<typeof useBuilderStore>>;

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

		// Mock action implementations
		builderStore.initBuilderChat = vi.fn();
		builderStore.resetBuilderChat = vi.fn();
		builderStore.addAssistantMessages = vi.fn();
		builderStore.$onAction = vi.fn().mockReturnValue(vi.fn());
		builderStore.workflowPrompt = workflowPrompt;
	});

	describe('rendering', () => {
		it('should render component correctly', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('ask-assistant-chat')).toBeInTheDocument();
		});

		it('should pass correct props to AskAssistantChat component', () => {
			renderComponent();

			// Basic verification that no methods were called on mount
			expect(builderStore.initBuilderChat).not.toHaveBeenCalled();
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

			expect(builderStore.initBuilderChat).toHaveBeenCalledWith(testMessage, 'chat');
		});
	});

	describe('feedback handling', () => {
		const workflowJson = '{"nodes": [], "connections": {}}';
		beforeEach(() => {
			builderStore.chatMessages = [
				{
					id: faker.string.uuid(),
					role: 'assistant',
					type: 'workflow-generated',
					read: true,
					codeSnippet: workflowJson,
				},
				{
					id: faker.string.uuid(),
					role: 'assistant',
					type: 'rate-workflow',
					read: true,
					content: '',
				},
			];
		});

		it('should track feedback when user rates the workflow positively', async () => {
			const { findByTestId } = renderComponent();

			// Find thumbs up button in RateWorkflowMessage component
			const thumbsUpButton = await findByTestId('message-thumbs-up-button');
			thumbsUpButton.click();

			await flushPromises();

			expect(trackMock).toHaveBeenCalledWith('User rated workflow generation', {
				helpful: true,
				prompt: 'Create a workflow',
				workflow_json: workflowJson,
			});
		});

		it('should track feedback when user rates the workflow negatively', async () => {
			const { findByTestId } = renderComponent();

			// Find thumbs down button in RateWorkflowMessage component
			const thumbsDownButton = await findByTestId('message-thumbs-down-button');
			thumbsDownButton.click();

			await flushPromises();

			expect(trackMock).toHaveBeenCalledWith('User rated workflow generation', {
				helpful: false,
				prompt: 'Create a workflow',
				workflow_json: workflowJson,
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
					prompt: 'Create a workflow',
					workflow_json: workflowJson,
				}),
			);
		});
	});

	describe('new workflow generation', () => {
		it('should unsubscribe from store actions on unmount', async () => {
			const unsubscribeMock = vi.fn();
			builderStore.$onAction = vi.fn().mockReturnValue(unsubscribeMock);

			const { unmount } = renderComponent();

			// Unmount component
			unmount();

			// Should unsubscribe when component is unmounted
			expect(unsubscribeMock).toHaveBeenCalled();
		});
	});
});
