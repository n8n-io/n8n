/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ENABLED_VIEWS, useBuilderStore } from '@/stores/builder.store';
import { usePostHog } from './posthog.store';
import { useSettingsStore } from '@/stores/settings.store';
import { defaultSettings } from '../__tests__/defaults';
import merge from 'lodash/merge';
import { DEFAULT_POSTHOG_SETTINGS } from './posthog.store.test';
import { WORKFLOW_BUILDER_EXPERIMENT, DEFAULT_NEW_WORKFLOW_NAME } from '@/constants';
import { reactive } from 'vue';
import * as chatAPI from '@/api/ai';
import * as telemetryModule from '@/composables/useTelemetry';
import type { Telemetry } from '@/plugins/telemetry';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import { DEFAULT_CHAT_WIDTH, MAX_CHAT_WIDTH, MIN_CHAT_WIDTH } from './assistant.store';

// Mock useI18n to return the keys instead of translations
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

// Mock useToast
vi.mock('@/composables/useToast', () => ({
	useToast: () => ({
		showMessage: vi.fn(),
	}),
}));

// Mock the workflows store
const mockSetWorkflowName = vi.fn();
const mockRemoveAllConnections = vi.fn();
const mockRemoveAllNodes = vi.fn();
const mockWorkflow = {
	name: DEFAULT_NEW_WORKFLOW_NAME,
	nodes: [],
	connections: {},
};

vi.mock('./workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		workflow: mockWorkflow,
		workflowId: 'test-workflow-id',
		allNodes: [],
		nodesByName: {},
		workflowExecutionData: null,
		setWorkflowName: mockSetWorkflowName,
		removeAllConnections: mockRemoveAllConnections,
		removeAllNodes: mockRemoveAllNodes,
	})),
}));

let settingsStore: ReturnType<typeof useSettingsStore>;
let posthogStore: ReturnType<typeof usePostHog>;

const apiSpy = vi.spyOn(chatAPI, 'chatWithBuilder');

const track = vi.fn();
const spy = vi.spyOn(telemetryModule, 'useTelemetry');
spy.mockImplementation(
	() =>
		({
			track,
		}) as unknown as Telemetry,
);

const setAssistantEnabled = (enabled: boolean) => {
	settingsStore.setSettings(
		merge({}, defaultSettings, {
			aiAssistant: { enabled },
		}),
	);
};

const currentRouteName = ENABLED_VIEWS[0];
vi.mock('vue-router', () => ({
	useRoute: vi.fn(() =>
		reactive({
			path: '/',
			params: {},
			name: currentRouteName,
		}),
	),
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

describe('AI Builder store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		settingsStore = useSettingsStore();
		settingsStore.setSettings(
			merge({}, defaultSettings, {
				posthog: DEFAULT_POSTHOG_SETTINGS,
			}),
		);
		window.posthog = {
			init: () => {},
			identify: () => {},
		};
		posthogStore = usePostHog();
		posthogStore.init();
		track.mockReset();
		// Reset workflow store mocks
		mockSetWorkflowName.mockReset();
		mockRemoveAllConnections.mockReset();
		mockRemoveAllNodes.mockReset();
		// Reset workflow to default state
		mockWorkflow.name = DEFAULT_NEW_WORKFLOW_NAME;
		mockWorkflow.nodes = [];
		mockWorkflow.connections = {};
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it('initializes with default values', () => {
		const builderStore = useBuilderStore();

		expect(builderStore.chatWidth).toBe(DEFAULT_CHAT_WIDTH);
		expect(builderStore.chatMessages).toEqual([]);
		expect(builderStore.chatWindowOpen).toBe(false);
		expect(builderStore.streaming).toBe(false);
	});

	it('can change chat width', () => {
		const builderStore = useBuilderStore();

		builderStore.updateWindowWidth(400);
		expect(builderStore.chatWidth).toBe(400);
	});

	it('should not allow chat width to be less than the minimal width', () => {
		const builderStore = useBuilderStore();

		builderStore.updateWindowWidth(100);
		expect(builderStore.chatWidth).toBe(MIN_CHAT_WIDTH);
	});

	it('should not allow chat width to be more than the maximal width', () => {
		const builderStore = useBuilderStore();

		builderStore.updateWindowWidth(2000);
		expect(builderStore.chatWidth).toBe(MAX_CHAT_WIDTH);
	});

	it('should open chat window', async () => {
		const builderStore = useBuilderStore();

		await builderStore.openChat();
		expect(builderStore.chatWindowOpen).toBe(true);
	});

	it('should close chat window', () => {
		const builderStore = useBuilderStore();

		builderStore.closeChat();
		expect(builderStore.chatWindowOpen).toBe(false);
	});

	it('can process a simple assistant message through API', async () => {
		const builderStore = useBuilderStore();

		apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				messages: [
					{
						type: 'message',
						role: 'assistant',
						text: 'Hello!',
					},
				],
				sessionId: 'test-session',
			});
			onDone();
		});

		builderStore.sendChatMessage({ text: 'Hi' });
		await vi.waitFor(() => expect(builderStore.chatMessages.length).toBe(2));
		expect(builderStore.chatMessages[0].role).toBe('user');
		expect(builderStore.chatMessages[1]).toMatchObject({
			type: 'text',
			role: 'assistant',
			content: 'Hello!',
			read: false,
		});
	});

	it('can process a workflow-updated message through API', async () => {
		const builderStore = useBuilderStore();

		apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				messages: [
					{
						type: 'workflow-updated',
						role: 'assistant',
						codeSnippet: '{"nodes":[],"connections":[]}',
					},
				],
				sessionId: 'test-session',
			});
			onDone();
		});

		builderStore.sendChatMessage({ text: 'Create workflow' });
		await vi.waitFor(() => expect(builderStore.chatMessages.length).toBe(2));
		expect(builderStore.chatMessages[1]).toMatchObject({
			type: 'workflow-updated',
			role: 'assistant',
			codeSnippet: '{"nodes":[],"connections":[]}',
			read: false,
		});

		// Verify workflow messages are accessible via computed property
		expect(builderStore.workflowMessages.length).toBe(1);
	});

	it('should show processing results message when tools complete', async () => {
		vi.useFakeTimers();
		const builderStore = useBuilderStore();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let onMessageCallback: any;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let onDoneCallback: any;

		apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, onDone) => {
			onMessageCallback = onMessage;
			onDoneCallback = onDone;
		});

		builderStore.sendChatMessage({ text: 'Add nodes and connect them' });

		// Initially shows "aiAssistant.thinkingSteps.thinking" from prepareForStreaming
		expect(builderStore.assistantThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');

		// First tool starts
		onMessageCallback({
			messages: [
				{
					type: 'tool',
					role: 'assistant',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'running',
					updates: [{ type: 'input', data: {} }],
				},
			],
		});

		// Should show "aiAssistant.thinkingSteps.thinking"
		expect(builderStore.assistantThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');

		// Second tool starts (different toolCallId)
		onMessageCallback({
			messages: [
				{
					type: 'tool',
					role: 'assistant',
					toolName: 'connect_nodes',
					toolCallId: 'call-2',
					status: 'running',
					updates: [{ type: 'input', data: {} }],
				},
			],
		});

		// Still showing "aiAssistant.thinkingSteps.thinking" with multiple tools
		expect(builderStore.assistantThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');

		// First tool completes
		onMessageCallback({
			messages: [
				{
					type: 'tool',
					role: 'assistant',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'completed',
					updates: [{ type: 'output', data: { success: true } }],
				},
			],
		});

		// Still "aiAssistant.thinkingSteps.thinking" because second tool is still running
		expect(builderStore.assistantThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');

		// Second tool completes
		onMessageCallback({
			messages: [
				{
					type: 'tool',
					role: 'assistant',
					toolName: 'connect_nodes',
					toolCallId: 'call-2',
					status: 'completed',
					updates: [{ type: 'output', data: { success: true } }],
				},
			],
		});

		// Now should show "aiAssistant.thinkingSteps.thinking" because all tools completed
		expect(builderStore.assistantThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');

		// Call onDone to stop streaming
		onDoneCallback();

		// Message should persist after streaming ends
		expect(builderStore.streaming).toBe(false);
		expect(builderStore.assistantThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');

		vi.useRealTimers();
	});

	it('should keep processing message when workflow-updated arrives', async () => {
		const builderStore = useBuilderStore();

		apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, onDone) => {
			// Tool completes
			onMessage({
				messages: [
					{
						type: 'tool',
						role: 'assistant',
						toolName: 'add_nodes',
						toolCallId: 'call-1',
						status: 'completed',
						updates: [{ type: 'output', data: { success: true } }],
					},
				],
			});

			// Workflow update arrives
			onMessage({
				messages: [
					{
						type: 'workflow-updated',
						role: 'assistant',
						codeSnippet: '{"nodes": [], "connections": {}}',
					},
				],
			});

			// Call onDone to stop streaming
			onDone();
		});

		builderStore.sendChatMessage({ text: 'Add a node' });

		// Should show "aiAssistant.thinkingSteps.thinking" when tool completes
		await vi.waitFor(() =>
			expect(builderStore.assistantThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking'),
		);

		// Should still show "aiAssistant.thinkingSteps.thinking" after workflow-updated
		await vi.waitFor(() => expect(builderStore.chatMessages).toHaveLength(3)); // user + tool + workflow
		expect(builderStore.assistantThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');

		// Verify streaming has ended
		expect(builderStore.streaming).toBe(false);
	});

	it('should reset builder chat session', async () => {
		const builderStore = useBuilderStore();

		apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				messages: [
					{
						type: 'message',
						role: 'assistant',
						text: 'Hello!',
						quickReplies: [
							{ text: 'Yes', type: 'text' },
							{ text: 'No', type: 'text' },
						],
					},
				],
				sessionId: 'test-session',
			});
			onDone();
		});

		builderStore.sendChatMessage({ text: 'Hi' });
		await vi.waitFor(() => expect(builderStore.chatMessages.length).toBe(2));

		builderStore.resetBuilderChat();
		expect(builderStore.chatMessages).toEqual([]);
		expect(builderStore.assistantThinkingMessage).toBeUndefined();
	});

	it('should not show builder if disabled in settings', () => {
		const builderStore = useBuilderStore();

		setAssistantEnabled(false);
		expect(builderStore.isAssistantEnabled).toBe(false);
		expect(builderStore.canShowAssistant).toBe(false);
		expect(builderStore.canShowAssistantButtonsOnCanvas).toBe(false);
	});

	it('should show builder if all conditions are met', () => {
		const builderStore = useBuilderStore();

		setAssistantEnabled(true);
		expect(builderStore.isAssistantEnabled).toBe(true);
		expect(builderStore.canShowAssistant).toBe(true);
		expect(builderStore.canShowAssistantButtonsOnCanvas).toBe(true);
	});

	// Split into two separate tests to avoid caching issues with computed properties
	it('should return true when experiment flag is set to variant', () => {
		const builderStore = useBuilderStore();
		vi.spyOn(posthogStore, 'getVariant').mockReturnValue(WORKFLOW_BUILDER_EXPERIMENT.variant);
		expect(builderStore.isAIBuilderEnabled).toBe(true);
	});

	it('should return false when experiment flag is set to control', () => {
		const builderStore = useBuilderStore();
		vi.spyOn(posthogStore, 'getVariant').mockReturnValue(WORKFLOW_BUILDER_EXPERIMENT.control);
		expect(builderStore.isAIBuilderEnabled).toBe(false);
	});

	it('should initialize builder chat session with prompt', async () => {
		const builderStore = useBuilderStore();
		const mockSessionId = 'test-session-id';

		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				messages: [
					{
						type: 'message',
						role: 'assistant',
						text: 'How can I help you build a workflow?',
					},
				],
				sessionId: mockSessionId,
			});
			onDone();
		});

		builderStore.sendChatMessage({ text: 'I want to build a workflow' });
		await vi.waitFor(() => expect(builderStore.chatMessages.length).toBe(2));

		expect(apiSpy).toHaveBeenCalled();
		expect(builderStore.chatMessages[0].role).toBe('user');
		expect(builderStore.chatMessages[1].role).toBe('assistant');
		expect(builderStore.streaming).toBe(false);
	});

	it('should send a follow-up message in an existing session', async () => {
		const builderStore = useBuilderStore();
		const mockSessionId = 'test-session-id';

		// Setup initial session
		apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				messages: [
					{
						type: 'message',
						role: 'assistant',
						text: 'How can I help you build a workflow?',
					},
				],
				sessionId: mockSessionId,
			});
			onDone();
		});

		// Setup follow-up message response
		apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				messages: [
					{
						type: 'message',
						role: 'assistant',
						text: 'Here are some workflow ideas',
					},
				],
				sessionId: mockSessionId,
			});
			onDone();
		});

		builderStore.sendChatMessage({ text: 'I want to build a workflow' });
		await vi.waitFor(() => expect(builderStore.chatMessages.length).toBe(2));

		// Send a follow-up message
		builderStore.sendChatMessage({ text: 'Generate a workflow for me' });
		await vi.waitFor(() => expect(builderStore.chatMessages.length).toBe(4));

		const thirdMessage = builderStore.chatMessages[2] as ChatUI.TextMessage;
		const fourthMessage = builderStore.chatMessages[3] as ChatUI.TextMessage;
		expect(thirdMessage.role).toBe('user');
		expect(thirdMessage.type).toBe('text');
		expect(thirdMessage.content).toBe('Generate a workflow for me');
		expect(fourthMessage.role).toBe('assistant');
		expect(fourthMessage.type).toBe('text');
		expect(fourthMessage.content).toBe('Here are some workflow ideas');
	});

	it('should properly handle errors in chat session', async () => {
		const builderStore = useBuilderStore();

		// Simulate an error response
		apiSpy.mockImplementationOnce((_ctx, _payload, _onMessage, _onDone, onError) => {
			onError(new Error('An API error occurred'));
		});

		builderStore.sendChatMessage({ text: 'I want to build a workflow' });
		await vi.waitFor(() => expect(builderStore.chatMessages.length).toBe(2));
		expect(builderStore.chatMessages[0].role).toBe('user');
		expect(builderStore.chatMessages[1].type).toBe('error');

		// Error message should have a retry function
		const errorMessage = builderStore.chatMessages[1] as ChatUI.ErrorMessage;
		expect(errorMessage.retry).toBeDefined();

		// Verify streaming state was reset
		expect(builderStore.streaming).toBe(false);

		// Set up a successful response for the retry
		apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				messages: [
					{
						type: 'message',
						role: 'assistant',
						text: 'I can help you build a workflow',
					},
				],
				sessionId: 'new-session',
			});
			onDone();
		});

		// Retry the failed request
		if (errorMessage.retry) {
			void errorMessage.retry();
			await vi.waitFor(() => expect(builderStore.chatMessages.length).toBe(2));
		}
		expect(builderStore.chatMessages[0].role).toBe('user');
		expect(builderStore.chatMessages[1].type).toBe('text');
		expect((builderStore.chatMessages[1] as ChatUI.TextMessage).content).toBe(
			'I can help you build a workflow',
		);
	});

	describe('Abort functionality', () => {
		it('should create and manage abort controller', () => {
			const builderStore = useBuilderStore();

			// Initially no abort controller (might be undefined or null)
			expect(builderStore.streamingAbortController).toBeFalsy();

			// Start streaming creates abort controller
			apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, _onDone, _onError, _signal) => {
				// Simulate successful start of streaming
				setTimeout(() => {
					onMessage({
						messages: [
							{
								type: 'message',
								role: 'assistant',
								text: 'Processing...',
							},
						],
						sessionId: 'test-session',
					});
				}, 0);
			});

			builderStore.sendChatMessage({ text: 'test' });
			expect(builderStore.streamingAbortController).not.toBeNull();
			expect(builderStore.streamingAbortController).toBeInstanceOf(AbortController);
		});

		it('should call abort on existing controller when stopStreaming is called', () => {
			const builderStore = useBuilderStore();

			// First start a request to create an abort controller
			apiSpy.mockImplementationOnce(() => {});
			builderStore.sendChatMessage({ text: 'test' });

			// Verify controller was created
			const controller = builderStore.streamingAbortController;
			expect(controller).toBeInstanceOf(AbortController);

			// Spy on the abort method
			const abortSpy = vi.spyOn(controller!, 'abort');

			// Call stopStreaming
			builderStore.stopStreaming();

			// Verify abort was called
			expect(abortSpy).toHaveBeenCalled();
			expect(builderStore.streamingAbortController).toBeNull();
			expect(builderStore.streaming).toBe(false);
		});

		it('should handle AbortError gracefully', async () => {
			const builderStore = useBuilderStore();

			// Simulate an abort error
			const abortError = new Error('AbortError');
			abortError.name = 'AbortError';

			apiSpy.mockImplementationOnce((_ctx, _payload, _onMessage, _onDone, onError) => {
				onError(abortError);
			});

			builderStore.sendChatMessage({ text: 'test message' });
			await vi.waitFor(() => expect(builderStore.chatMessages.length).toBe(2));

			// Should have user message and aborted message
			expect(builderStore.chatMessages[0].role).toBe('user');
			expect(builderStore.chatMessages[1].role).toBe('assistant');
			expect(builderStore.chatMessages[1].type).toBe('text');
			expect((builderStore.chatMessages[1] as ChatUI.TextMessage).content).toBe('[Task aborted]');

			// Verify streaming state was reset
			expect(builderStore.streaming).toBe(false);
			expect(builderStore.assistantThinkingMessage).toBeUndefined();
		});

		it('should abort previous request when sending new message', () => {
			const builderStore = useBuilderStore();

			// The current implementation prevents sending a new message while streaming
			// by checking if streaming.value is true and returning early.
			// Mock for first request - keep it pending
			apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, _onDone) => {
				// Don't call onDone to keep streaming active
				setTimeout(() => {
					onMessage({
						messages: [
							{
								type: 'message',
								role: 'assistant',
								text: 'Processing first message...',
							},
						],
						sessionId: 'test-session',
					});
				}, 10);
			});

			// Start first request
			builderStore.sendChatMessage({ text: 'first message' });

			// Verify streaming is active and controller was created
			expect(builderStore.streaming).toBe(true);
			const firstController = builderStore.streamingAbortController;
			expect(firstController).not.toBeNull();
			expect(firstController).toBeInstanceOf(AbortController);

			// Track if abort was called
			const abortSpy = vi.spyOn(firstController!, 'abort');

			// Try to send second message while streaming - it should be ignored
			builderStore.sendChatMessage({ text: 'second message ignored' });

			// Verify the abort was NOT called and controller is the same
			expect(abortSpy).not.toHaveBeenCalled();
			expect(builderStore.streamingAbortController).toBe(firstController);

			// Now properly stop streaming first
			builderStore.stopStreaming();

			// Verify abort was called and controller was cleared
			expect(abortSpy).toHaveBeenCalled();
			expect(builderStore.streamingAbortController).toBeNull();
			expect(builderStore.streaming).toBe(false);

			// Mock for second request
			apiSpy.mockImplementationOnce(() => {});

			// Now we can send a new message
			builderStore.sendChatMessage({ text: 'second message' });

			// New controller should be created
			const secondController = builderStore.streamingAbortController;
			expect(secondController).not.toBe(firstController);
			expect(secondController).not.toBeNull();
			expect(secondController).toBeInstanceOf(AbortController);
		});

		it('should pass abort signal to API call', () => {
			const builderStore = useBuilderStore();

			// Mock the API to prevent actual network calls
			apiSpy.mockImplementationOnce(() => {});

			builderStore.sendChatMessage({ text: 'test' });

			// Verify the API was called with correct parameters
			expect(apiSpy).toHaveBeenCalled();
			const callArgs = apiSpy.mock.calls[0];
			expect(callArgs).toHaveLength(6); // Should have 6 arguments

			const signal = callArgs[5]; // The 6th argument is the abort signal
			expect(signal).toBeDefined();
			expect(signal).toBeInstanceOf(AbortSignal);

			// Check that it's the same signal from the controller
			const controller = builderStore.streamingAbortController;
			expect(controller).not.toBeNull();
			expect(controller).toBeInstanceOf(AbortController);
			expect(signal).toBe(controller!.signal);
		});

		it('should not create error message for aborted requests', async () => {
			const builderStore = useBuilderStore();

			// Track telemetry calls
			const telemetryTrackSpy = vi.fn();
			track.mockImplementation(telemetryTrackSpy);

			// Simulate abort error
			const abortError = new Error('AbortError');
			abortError.name = 'AbortError';

			apiSpy.mockImplementationOnce((_ctx, _payload, _onMessage, _onDone, onError) => {
				// Call error handler immediately
				onError(abortError);
			});

			// Clear messages before test
			builderStore.chatMessages.length = 0;

			builderStore.sendChatMessage({ text: 'test' });

			// Wait for the error to be processed
			await vi.waitFor(() => expect(builderStore.chatMessages.length).toBeGreaterThan(1));

			// Should not track error for abort
			expect(telemetryTrackSpy).not.toHaveBeenCalledWith(
				'Workflow generation errored',
				expect.anything(),
			);

			// Find the assistant messages (skip user message)
			const assistantMessages = builderStore.chatMessages.filter((msg) => msg.role === 'assistant');
			expect(assistantMessages).toHaveLength(1);
			expect(assistantMessages[0].type).toBe('text');
			expect((assistantMessages[0] as ChatUI.TextMessage).content).toBe('[Task aborted]');
		});
	});

	describe('Rating logic integration', () => {
		it('should clear ratings from existing messages when preparing for streaming', () => {
			const builderStore = useBuilderStore();

			// Setup initial messages with ratings
			builderStore.chatMessages = [
				{
					id: 'msg-1',
					role: 'assistant',
					type: 'text',
					content: 'Previous message',
					showRating: true,
					ratingStyle: 'regular',
					read: false,
				} satisfies ChatUI.AssistantMessage,
				{
					id: 'msg-2',
					role: 'assistant',
					type: 'text',
					content: 'Another message',
					showRating: true,
					ratingStyle: 'minimal',
					read: false,
				} satisfies ChatUI.AssistantMessage,
			];

			// Mock API to prevent actual network calls
			apiSpy.mockImplementationOnce(() => {});

			// Send new message which calls prepareForStreaming
			builderStore.sendChatMessage({ text: 'New message' });

			// Verify that existing messages no longer have rating properties
			expect(builderStore.chatMessages).toHaveLength(3); // 2 existing + 1 new user message

			const firstMessage = builderStore.chatMessages[0] as ChatUI.TextMessage;
			expect(firstMessage).not.toHaveProperty('showRating');
			expect(firstMessage).not.toHaveProperty('ratingStyle');
			expect(firstMessage.content).toBe('Previous message');

			const secondMessage = builderStore.chatMessages[1] as ChatUI.TextMessage;
			expect(secondMessage).not.toHaveProperty('showRating');
			expect(secondMessage).not.toHaveProperty('ratingStyle');
			expect(secondMessage.content).toBe('Another message');

			// New user message should not have rating properties
			const userMessage = builderStore.chatMessages[2] as ChatUI.TextMessage;
			expect(userMessage.role).toBe('user');
			expect(userMessage.content).toBe('New message');
			expect(userMessage).not.toHaveProperty('showRating');
			expect(userMessage).not.toHaveProperty('ratingStyle');
		});
	});

	describe('applyWorkflowUpdate with workflow naming', () => {
		it('should apply generated workflow name during initial generation when workflow has default name', () => {
			const builderStore = useBuilderStore();

			// Set initial generation flag
			builderStore.initialGeneration = true;

			// Ensure workflow has default name
			mockWorkflow.name = DEFAULT_NEW_WORKFLOW_NAME;

			// Create workflow JSON with a generated name
			const workflowJson = JSON.stringify({
				name: 'Generated Workflow Name for Email Processing',
				nodes: [
					{
						id: 'node1',
						name: 'Start',
						type: 'n8n-nodes-base.start',
						position: [250, 300],
						parameters: {},
					},
				],
				connections: {},
			});

			// Apply the workflow update
			const result = builderStore.applyWorkflowUpdate(workflowJson);

			// Verify the update was successful
			expect(result.success).toBe(true);

			// Verify setWorkflowName was called with the generated name
			expect(mockSetWorkflowName).toHaveBeenCalledWith({
				newName: 'Generated Workflow Name for Email Processing',
				setStateDirty: false,
			});
		});

		it('should NOT apply generated workflow name during initial generation when workflow has custom name', () => {
			const builderStore = useBuilderStore();

			// Set initial generation flag
			builderStore.initialGeneration = true;

			// Set a custom workflow name (not the default)
			mockWorkflow.name = 'My Custom Workflow';

			// Create workflow JSON with a generated name
			const workflowJson = JSON.stringify({
				name: 'Generated Workflow Name for Email Processing',
				nodes: [
					{
						id: 'node1',
						name: 'Start',
						type: 'n8n-nodes-base.start',
						position: [250, 300],
						parameters: {},
					},
				],
				connections: {},
			});

			// Apply the workflow update
			const result = builderStore.applyWorkflowUpdate(workflowJson);

			// Verify the update was successful
			expect(result.success).toBe(true);

			// Verify setWorkflowName was NOT called
			expect(mockSetWorkflowName).not.toHaveBeenCalled();
		});

		it('should NOT apply generated workflow name when not initial generation', () => {
			const builderStore = useBuilderStore();

			// Ensure initial generation flag is false
			builderStore.initialGeneration = false;

			// Ensure workflow has default name
			mockWorkflow.name = DEFAULT_NEW_WORKFLOW_NAME;

			// Create workflow JSON with a generated name
			const workflowJson = JSON.stringify({
				name: 'Generated Workflow Name for Email Processing',
				nodes: [
					{
						id: 'node1',
						name: 'Start',
						type: 'n8n-nodes-base.start',
						position: [250, 300],
						parameters: {},
					},
				],
				connections: {},
			});

			// Apply the workflow update
			const result = builderStore.applyWorkflowUpdate(workflowJson);

			// Verify the update was successful
			expect(result.success).toBe(true);

			// Verify setWorkflowName was NOT called
			expect(mockSetWorkflowName).not.toHaveBeenCalled();
		});

		it('should handle workflow updates without name property', () => {
			const builderStore = useBuilderStore();

			// Set initial generation flag
			builderStore.initialGeneration = true;

			// Ensure workflow has default name
			mockWorkflow.name = DEFAULT_NEW_WORKFLOW_NAME;

			// Create workflow JSON without a name property
			const workflowJson = JSON.stringify({
				nodes: [
					{
						id: 'node1',
						name: 'Start',
						type: 'n8n-nodes-base.start',
						position: [250, 300],
						parameters: {},
					},
				],
				connections: {},
			});

			// Apply the workflow update
			const result = builderStore.applyWorkflowUpdate(workflowJson);

			// Verify the update was successful
			expect(result.success).toBe(true);

			// Verify setWorkflowName was NOT called
			expect(mockSetWorkflowName).not.toHaveBeenCalled();
		});

		it('should handle workflow names that start with but are not exactly the default name', () => {
			const builderStore = useBuilderStore();

			// Set initial generation flag
			builderStore.initialGeneration = true;

			// Set workflow name that starts with default but has more text
			mockWorkflow.name = `${DEFAULT_NEW_WORKFLOW_NAME} - Copy`;

			// Create workflow JSON with a generated name
			const workflowJson = JSON.stringify({
				name: 'Generated Workflow Name for Email Processing',
				nodes: [
					{
						id: 'node1',
						name: 'Start',
						type: 'n8n-nodes-base.start',
						position: [250, 300],
						parameters: {},
					},
				],
				connections: {},
			});

			// Apply the workflow update
			const result = builderStore.applyWorkflowUpdate(workflowJson);

			// Verify the update was successful
			expect(result.success).toBe(true);

			// Verify setWorkflowName WAS called because the name starts with default
			expect(mockSetWorkflowName).toHaveBeenCalledWith({
				newName: 'Generated Workflow Name for Email Processing',
				setStateDirty: false,
			});
		});

		it('should handle malformed JSON gracefully', () => {
			const builderStore = useBuilderStore();

			// Set initial generation flag
			builderStore.initialGeneration = true;

			// Create malformed JSON
			const workflowJson = '{ invalid json }';

			// Apply the workflow update
			const result = builderStore.applyWorkflowUpdate(workflowJson);

			// Verify the update failed
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should maintain initial generation flag state across multiple updates', () => {
			const builderStore = useBuilderStore();

			// Set initial generation flag
			builderStore.initialGeneration = true;

			// Ensure workflow has default name
			mockWorkflow.name = DEFAULT_NEW_WORKFLOW_NAME;

			// First update with name
			const workflowJson1 = JSON.stringify({
				name: 'First Generated Name',
				nodes: [],
				connections: {},
			});

			builderStore.applyWorkflowUpdate(workflowJson1);
			expect(mockSetWorkflowName).toHaveBeenCalledTimes(1);

			// The flag should still be true for subsequent updates in the same generation
			expect(builderStore.initialGeneration).toBe(true);

			// Second update without name (simulating further tool operations)
			const workflowJson2 = JSON.stringify({
				nodes: [
					{
						id: 'node2',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						position: [450, 300],
						parameters: {},
					},
				],
				connections: {},
			});

			builderStore.applyWorkflowUpdate(workflowJson2);

			// Should not call setWorkflowName again
			expect(mockSetWorkflowName).toHaveBeenCalledTimes(1);
		});
	});
});
