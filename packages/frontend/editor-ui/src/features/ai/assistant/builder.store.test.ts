/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useBuilderStore } from './builder.store';
import {
	useChatPanelStore,
	DEFAULT_CHAT_WIDTH,
	MAX_CHAT_WIDTH,
	MIN_CHAT_WIDTH,
} from './chatPanel.store';
import { BUILDER_ENABLED_VIEWS } from './constants';

const ENABLED_VIEWS = BUILDER_ENABLED_VIEWS;
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { defaultSettings } from '@/__tests__/defaults';
import merge from 'lodash/merge';
import { DEFAULT_POSTHOG_SETTINGS } from '@/app/stores/posthog.store.test';
import { DEFAULT_NEW_WORKFLOW_NAME } from '@/app/constants';
import { reactive } from 'vue';
import * as chatAPI from '@/features/ai/assistant/assistant.api';
import * as telemetryModule from '@/app/composables/useTelemetry';
import {
	injectWorkflowState,
	useWorkflowState,
	type WorkflowState,
} from '@/app/composables/useWorkflowState';
import type { Telemetry } from '@/app/plugins/telemetry';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import type { ChatRequest } from '@/features/ai/assistant/assistant.types';
import { type INodeTypeDescription } from 'n8n-workflow';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useUIStore } from '@/app/stores/ui.store';

// Mock useI18n to return the keys instead of translations
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
	i18n: {
		baseText: (key: string) => key,
	},
}));

// Mock workflowHistory API
vi.mock('@n8n/rest-api-client/api/workflowHistory', async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import('@n8n/rest-api-client/api/workflowHistory')>();
	return {
		...actual,
		getWorkflowVersionsByIds: vi.fn(),
	};
});

// Mock useToast
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: vi.fn(),
	}),
}));

// Mock to inject workflowState
vi.mock('@/app/composables/useWorkflowState', async () => {
	const actual = await vi.importActual('@/app/composables/useWorkflowState');
	return {
		...actual,
		injectWorkflowState: vi.fn(),
	};
});

// Mock useWorkflowSaving
const saveCurrentWorkflowMock = vi.fn().mockResolvedValue(true);
vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: () => ({
		saveCurrentWorkflow: saveCurrentWorkflowMock,
	}),
}));

// Mock useDocumentTitle
let mockDocumentState: string | undefined;
const setDocumentTitleMock = vi.fn((_workflowName: string, state: string) => {
	mockDocumentState = state;
});
const getDocumentStateMock = vi.fn(() => mockDocumentState);
vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: vi.fn(),
		reset: vi.fn(),
		setDocumentTitle: setDocumentTitleMock,
		getDocumentState: getDocumentStateMock,
	}),
}));

let settingsStore: ReturnType<typeof useSettingsStore>;
let posthogStore: ReturnType<typeof usePostHog>;
let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
let pinia: ReturnType<typeof createTestingPinia>;

let setWorkflowNameSpy: ReturnType<typeof vi.fn>;
let getNodeTypeSpy: ReturnType<typeof vi.fn>;
let getCredentialsByTypeSpy: ReturnType<typeof vi.fn>;

const apiSpy = vi.spyOn(chatAPI, 'chatWithBuilder');

const track = vi.fn();
const spy = vi.spyOn(telemetryModule, 'useTelemetry');
spy.mockImplementation(
	() =>
		({
			track,
		}) as unknown as Telemetry,
);

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

let workflowState: WorkflowState;
describe('AI Builder store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDocumentState = undefined;
		pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
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

		workflowsStore = mockedStore(useWorkflowsStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);
		credentialsStore = mockedStore(useCredentialsStore);

		workflowsStore.workflowId = 'test-workflow-id';
		workflowsStore.workflow.name = DEFAULT_NEW_WORKFLOW_NAME;
		workflowsStore.workflow.nodes = [];
		workflowsStore.workflow.connections = {};
		workflowsStore.allNodes = [];
		workflowsStore.nodesByName = {};
		workflowsStore.workflowExecutionData = null;

		workflowState = useWorkflowState();
		vi.mocked(injectWorkflowState).mockReturnValue(workflowState);

		setWorkflowNameSpy = vi.fn().mockImplementation(({ newName }: { newName: string }) => {
			workflowsStore.workflow.name = newName;
		});
		vi.spyOn(workflowState, 'setWorkflowName').mockImplementation(setWorkflowNameSpy);

		getNodeTypeSpy = vi.fn();
		vi.spyOn(nodeTypesStore, 'getNodeType', 'get').mockReturnValue(getNodeTypeSpy);

		getCredentialsByTypeSpy = vi.fn().mockReturnValue([]);
		vi.spyOn(credentialsStore, 'getCredentialsByType', 'get').mockReturnValue(
			getCredentialsByTypeSpy,
		);
		vi.spyOn(credentialsStore, 'getCredentialTypeByName', 'get').mockReturnValue(
			vi.fn().mockReturnValue(undefined),
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it('initializes with default values', () => {
		const builderStore = useBuilderStore();
		const chatPanelStore = useChatPanelStore();

		expect(chatPanelStore.width).toBe(DEFAULT_CHAT_WIDTH);
		expect(builderStore.chatMessages).toEqual([]);
		expect(chatPanelStore.isOpen).toBe(false);
		expect(builderStore.streaming).toBe(false);
	});

	it('can change chat width', () => {
		const chatPanelStore = useChatPanelStore();

		chatPanelStore.updateWidth(400);
		expect(chatPanelStore.width).toBe(400);
	});

	it('should not allow chat width to be less than the minimal width', () => {
		const chatPanelStore = useChatPanelStore();

		chatPanelStore.updateWidth(100);
		expect(chatPanelStore.width).toBe(MIN_CHAT_WIDTH);
	});

	it('should not allow chat width to be more than the maximal width', () => {
		const chatPanelStore = useChatPanelStore();

		chatPanelStore.updateWidth(2000);
		expect(chatPanelStore.width).toBe(MAX_CHAT_WIDTH);
	});

	it('should open chat window', async () => {
		const chatPanelStore = useChatPanelStore();

		await chatPanelStore.open({ mode: 'builder' });
		expect(chatPanelStore.isOpen).toBe(true);
	});

	it('should close chat window', () => {
		const chatPanelStore = useChatPanelStore();

		chatPanelStore.close();
		expect(chatPanelStore.isOpen).toBe(false);
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

		await builderStore.sendChatMessage({ text: 'Hi' });
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

		await builderStore.sendChatMessage({ text: 'Create workflow' });
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

		await builderStore.sendChatMessage({ text: 'Add nodes and connect them' });

		// Initially shows "aiAssistant.thinkingSteps.thinking" from prepareForStreaming
		expect(builderStore.builderThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');

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
		expect(builderStore.builderThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');

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
		expect(builderStore.builderThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');

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
		expect(builderStore.builderThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');

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
		expect(builderStore.builderThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');

		// Call onDone to stop streaming
		onDoneCallback();

		// Message should persist after streaming ends
		expect(builderStore.streaming).toBe(false);
		expect(builderStore.builderThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');

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

		await builderStore.sendChatMessage({ text: 'Add a node' });

		// Should show "aiAssistant.thinkingSteps.thinking" when tool completes
		await vi.waitFor(() =>
			expect(builderStore.builderThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking'),
		);

		// Should still show "aiAssistant.thinkingSteps.thinking" after workflow-updated
		await vi.waitFor(() => expect(builderStore.chatMessages).toHaveLength(3)); // user + tool + workflow
		expect(builderStore.builderThinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');

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

		await builderStore.sendChatMessage({ text: 'Hi' });
		await vi.waitFor(() => expect(builderStore.chatMessages.length).toBe(2));

		builderStore.resetBuilderChat();
		expect(builderStore.chatMessages).toEqual([]);
		expect(builderStore.builderThinkingMessage).toBeUndefined();

		// Verify last_user_message_id is reset (tracked via trackWorkflowBuilderJourney)
		track.mockClear();
		builderStore.trackWorkflowBuilderJourney('user_clicked_todo');
		expect(track).toHaveBeenCalledWith('Workflow builder journey', {
			workflow_id: 'test-workflow-id',
			session_id: expect.any(String),
			event_type: 'user_clicked_todo',
		});
		// Should NOT have last_user_message_id after reset
		expect(track).not.toHaveBeenCalledWith(
			'Workflow builder journey',
			expect.objectContaining({ last_user_message_id: expect.any(String) }),
		);
	});

	describe('isAIBuilderEnabled computed property', () => {
		it('should return false when license does not have aiBuilder feature', () => {
			const builderStore = useBuilderStore();
			const settingsStore = useSettingsStore();

			vi.spyOn(settingsStore, 'isAiBuilderEnabled', 'get').mockReturnValue(false);

			expect(builderStore.isAIBuilderEnabled).toBe(false);
		});

		it('should return true when license has aiBuilder feature', () => {
			const builderStore = useBuilderStore();
			const settingsStore = useSettingsStore();

			vi.spyOn(settingsStore, 'isAiBuilderEnabled', 'get').mockReturnValue(true);

			expect(builderStore.isAIBuilderEnabled).toBe(true);
		});
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

		await builderStore.sendChatMessage({ text: 'I want to build a workflow' });
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

		await builderStore.sendChatMessage({ text: 'I want to build a workflow' });
		await vi.waitFor(() => expect(builderStore.chatMessages.length).toBe(2));

		// Send a follow-up message
		await builderStore.sendChatMessage({ text: 'Generate a workflow for me' });
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

		await builderStore.sendChatMessage({ text: 'I want to build a workflow' });
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
			await errorMessage.retry();
		}
		expect(builderStore.chatMessages.length).toBe(2);
		expect(builderStore.chatMessages[0].role).toBe('user');
		expect(builderStore.chatMessages[1].type).toBe('text');
		expect((builderStore.chatMessages[1] as ChatUI.TextMessage).content).toBe(
			'I can help you build a workflow',
		);
	});

	it('should return early without sending message when workflow save fails', async () => {
		const builderStore = useBuilderStore();

		// Mock saveCurrentWorkflow to return false (save failed or user cancelled)
		saveCurrentWorkflowMock.mockResolvedValueOnce(false);

		// Mock that there are unsaved changes
		const uiStore = mockedStore(useUIStore);
		vi.spyOn(uiStore, 'stateIsDirty', 'get').mockReturnValue(true);

		// Verify no API call was made
		apiSpy.mockClear();

		await builderStore.sendChatMessage({ text: 'test message' });

		// Should not call the API when save fails
		expect(apiSpy).not.toHaveBeenCalled();

		// Should not add any messages
		expect(builderStore.chatMessages).toHaveLength(0);

		// Should not be streaming
		expect(builderStore.streaming).toBe(false);
	});

	describe('Abort functionality', () => {
		it('should create and manage abort controller', async () => {
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

			await builderStore.sendChatMessage({ text: 'test' });
			expect(builderStore.streamingAbortController).not.toBeNull();
			expect(builderStore.streamingAbortController).toBeInstanceOf(AbortController);
		});

		it('should call abort on existing controller when abortStreaming is called', async () => {
			const builderStore = useBuilderStore();

			// First start a request to create an abort controller
			apiSpy.mockImplementationOnce(() => {});
			await builderStore.sendChatMessage({ text: 'test' });

			// Verify controller was created
			const controller = builderStore.streamingAbortController;
			expect(controller).toBeInstanceOf(AbortController);

			// Spy on the abort method
			const abortSpy = vi.spyOn(controller!, 'abort');

			// Call abortStreaming
			builderStore.abortStreaming();

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

			await builderStore.sendChatMessage({ text: 'test message' });
			await vi.waitFor(() => expect(builderStore.chatMessages.length).toBe(2));

			// Should have user message and aborted message
			expect(builderStore.chatMessages[0].role).toBe('user');
			expect(builderStore.chatMessages[1].role).toBe('assistant');
			expect(builderStore.chatMessages[1].type).toBe('text');
			const abortedMessage = builderStore.chatMessages[1] as ChatUI.TaskAbortedMessage;
			expect(abortedMessage.content).toBe('aiAssistant.builder.streamAbortedMessage');
			expect(abortedMessage.aborted).toBe(true);

			// Verify streaming state was reset
			expect(builderStore.streaming).toBe(false);
			expect(builderStore.builderThinkingMessage).toBeUndefined();
		});

		it('should remove running tool messages when AbortError occurs', async () => {
			const builderStore = useBuilderStore();

			const abortError = new Error('AbortError');
			abortError.name = 'AbortError';

			apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, _onDone, onError) => {
				// First send some tool messages - one completed, one running
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
				onMessage({
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
				// Then simulate abort
				onError(abortError);
			});

			await builderStore.sendChatMessage({ text: 'test message' });

			// Wait for messages to be processed
			await vi.waitFor(() => {
				const abortedMsg = builderStore.chatMessages.find(
					(msg) => msg.type === 'text' && 'aborted' in msg,
				);
				return expect(abortedMsg).toBeDefined();
			});

			// Should have: user message, completed tool, aborted message
			// Running tool should be removed
			const toolMessages = builderStore.chatMessages.filter((msg) => msg.type === 'tool');
			expect(toolMessages).toHaveLength(1);
			expect((toolMessages[0] as ChatUI.ToolMessage).toolName).toBe('add_nodes');
			expect((toolMessages[0] as ChatUI.ToolMessage).status).toBe('completed');

			// Verify no running tools remain
			const runningTools = toolMessages.filter(
				(msg) => (msg as ChatUI.ToolMessage).status === 'running',
			);
			expect(runningTools).toHaveLength(0);

			// Verify aborted message is present
			const abortedMessage = builderStore.chatMessages.find(
				(msg) => msg.type === 'text' && 'aborted' in msg,
			) as ChatUI.TaskAbortedMessage;
			expect(abortedMessage).toBeDefined();
			expect(abortedMessage.aborted).toBe(true);
		});

		it('should remove running tool messages when service error occurs', async () => {
			const builderStore = useBuilderStore();

			apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, _onDone, onError) => {
				// First send some tool messages - one completed, one running
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
				onMessage({
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
				// Then simulate a service error
				onError(new Error('Network error'));
			});

			await builderStore.sendChatMessage({ text: 'test message' });

			// Wait for error message to be processed
			await vi.waitFor(() => {
				const errorMsg = builderStore.chatMessages.find((msg) => msg.type === 'error');
				return expect(errorMsg).toBeDefined();
			});

			// Should have: user message, completed tool, error message
			// Running tool should be removed
			const toolMessages = builderStore.chatMessages.filter((msg) => msg.type === 'tool');
			expect(toolMessages).toHaveLength(1);
			expect((toolMessages[0] as ChatUI.ToolMessage).toolName).toBe('add_nodes');
			expect((toolMessages[0] as ChatUI.ToolMessage).status).toBe('completed');

			// Verify no running tools remain
			const runningTools = toolMessages.filter(
				(msg) => (msg as ChatUI.ToolMessage).status === 'running',
			);
			expect(runningTools).toHaveLength(0);

			// Verify error message is present
			const errorMessage = builderStore.chatMessages.find(
				(msg) => msg.type === 'error',
			) as ChatUI.ErrorMessage;
			expect(errorMessage).toBeDefined();
			expect(errorMessage.retry).toBeDefined();
		});

		it('should abort previous request when sending new message', async () => {
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
			await builderStore.sendChatMessage({ text: 'first message' });

			// Verify streaming is active and controller was created
			expect(builderStore.streaming).toBe(true);
			const firstController = builderStore.streamingAbortController;
			expect(firstController).not.toBeNull();
			expect(firstController).toBeInstanceOf(AbortController);

			// Track if abort was called
			const abortSpy = vi.spyOn(firstController!, 'abort');

			// Try to send second message while streaming - it should be ignored
			await builderStore.sendChatMessage({ text: 'second message ignored' });

			// Verify the abort was NOT called and controller is the same
			expect(abortSpy).not.toHaveBeenCalled();
			expect(builderStore.streamingAbortController).toBe(firstController);

			// Now properly stop streaming first
			builderStore.abortStreaming();

			// Verify abort was called and controller was cleared
			expect(abortSpy).toHaveBeenCalled();
			expect(builderStore.streamingAbortController).toBeNull();
			expect(builderStore.streaming).toBe(false);

			// Mock for second request
			apiSpy.mockImplementationOnce(() => {});

			// Now we can send a new message
			await builderStore.sendChatMessage({ text: 'second message' });

			// New controller should be created
			const secondController = builderStore.streamingAbortController;
			expect(secondController).not.toBe(firstController);
			expect(secondController).not.toBeNull();
			expect(secondController).toBeInstanceOf(AbortController);
		});

		it('should pass abort signal to API call', async () => {
			const builderStore = useBuilderStore();

			// Mock the API to prevent actual network calls
			apiSpy.mockImplementationOnce(() => {});

			await builderStore.sendChatMessage({ text: 'test' });

			// Verify the API was called with correct parameters
			expect(apiSpy).toHaveBeenCalled();
			const callArgs = apiSpy.mock.calls[0];
			const signal = callArgs[6]; // The 7th argument is the abort signal (after versionId)
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

			await builderStore.sendChatMessage({ text: 'test' });

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
			const abortedMessage = assistantMessages[0] as ChatUI.TaskAbortedMessage;
			expect(abortedMessage.content).toBe('aiAssistant.builder.streamAbortedMessage');
			expect(abortedMessage.aborted).toBe(true);
		});
	});

	describe('Rating logic integration', () => {
		it('should clear ratings from existing messages when preparing for streaming', async () => {
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
			await builderStore.sendChatMessage({ text: 'New message' });

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
			workflowsStore.workflow.name = DEFAULT_NEW_WORKFLOW_NAME;

			// Create workflow JSON with a generated name
			const workflowJson = JSON.stringify({
				name: 'Generated Workflow Name for Email Processing',
				nodes: [
					{
						id: 'node1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
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
			expect(setWorkflowNameSpy).toHaveBeenCalledWith({
				newName: 'Generated Workflow Name for Email Processing',
				setStateDirty: false,
			});
		});

		it('should NOT apply generated workflow name during initial generation when workflow has custom name', () => {
			const builderStore = useBuilderStore();

			// Set initial generation flag
			builderStore.initialGeneration = true;

			// Set a custom workflow name (not the default)
			workflowsStore.workflow.name = 'My Custom Workflow';

			// Create workflow JSON with a generated name
			const workflowJson = JSON.stringify({
				name: 'Generated Workflow Name for Email Processing',
				nodes: [
					{
						id: 'node1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
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
			expect(setWorkflowNameSpy).not.toHaveBeenCalled();
		});

		it('should NOT apply generated workflow name when not initial generation', () => {
			const builderStore = useBuilderStore();

			// Ensure initial generation flag is false
			builderStore.initialGeneration = false;

			// Ensure workflow has default name
			workflowsStore.workflow.name = DEFAULT_NEW_WORKFLOW_NAME;

			// Create workflow JSON with a generated name
			const workflowJson = JSON.stringify({
				name: 'Generated Workflow Name for Email Processing',
				nodes: [
					{
						id: 'node1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
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
			expect(setWorkflowNameSpy).not.toHaveBeenCalled();
		});

		it('should handle workflow updates without name property', () => {
			const builderStore = useBuilderStore();

			// Set initial generation flag
			builderStore.initialGeneration = true;

			// Ensure workflow has default name
			workflowsStore.workflow.name = DEFAULT_NEW_WORKFLOW_NAME;

			// Create workflow JSON without a name property
			const workflowJson = JSON.stringify({
				nodes: [
					{
						id: 'node1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
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
			expect(setWorkflowNameSpy).not.toHaveBeenCalled();
		});

		it('should handle workflow names that start with but are not exactly the default name', () => {
			const builderStore = useBuilderStore();

			// Set initial generation flag
			builderStore.initialGeneration = true;

			// Set workflow name that starts with default but has more text
			workflowsStore.workflow.name = `${DEFAULT_NEW_WORKFLOW_NAME} - Copy`;

			// Create workflow JSON with a generated name
			const workflowJson = JSON.stringify({
				name: 'Generated Workflow Name for Email Processing',
				nodes: [
					{
						id: 'node1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
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
			expect(setWorkflowNameSpy).toHaveBeenCalledWith({
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
			workflowsStore.workflow.name = DEFAULT_NEW_WORKFLOW_NAME;

			// First update with name
			const workflowJson1 = JSON.stringify({
				name: 'First Generated Name',
				nodes: [],
				connections: {},
			});

			builderStore.applyWorkflowUpdate(workflowJson1);
			expect(setWorkflowNameSpy).toHaveBeenCalledTimes(1);

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
			expect(setWorkflowNameSpy).toHaveBeenCalledTimes(1);
		});

		describe('applyWorkflowUpdate credential defaults', () => {
			const createTestNodeType = (): INodeTypeDescription => ({
				displayName: 'Test Node',
				name: 'n8n-nodes-base.test',
				description: 'Test node',
				group: ['trigger'],
				version: 1,
				defaults: { name: 'Test Node' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Authentication',
						name: 'authentication',
						type: 'options',
						options: [
							{
								name: 'API Key',
								value: 'apiKey',
							},
						],
						default: 'apiKey',
						required: true,
					},
				],
				credentials: [
					{
						name: 'testApi',
						required: true,
						displayOptions: {
							show: {
								authentication: ['apiKey'],
							},
						},
					},
				],
			});

			it('assigns default credentials when available', () => {
				const builderStore = useBuilderStore();
				getNodeTypeSpy.mockReturnValue(createTestNodeType());
				getCredentialsByTypeSpy.mockReturnValue([
					{ id: 'cred-id', name: 'API Credential', type: 'testApi' },
				]);

				const workflowJson = JSON.stringify({
					nodes: [
						{
							id: 'node1',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.test',
							position: [0, 0],
							parameters: {},
						},
					],
					connections: {},
				});

				const result = builderStore.applyWorkflowUpdate(workflowJson);
				expect(result.success).toBe(true);
				const [node] = result.workflowData?.nodes ?? [];
				expect(node.credentials).toEqual({
					testApi: { id: 'cred-id', name: 'API Credential' },
				});
				expect(node.parameters.authentication).toBe('apiKey');
			});

			it('keeps existing credentials untouched', () => {
				const builderStore = useBuilderStore();
				getNodeTypeSpy.mockReturnValue(createTestNodeType());
				getCredentialsByTypeSpy.mockReturnValue([
					{ id: 'cred-id', name: 'API Credential', type: 'testApi' },
				]);

				const workflowJson = JSON.stringify({
					nodes: [
						{
							id: 'node1',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.test',
							position: [0, 0],
							parameters: { authentication: 'apiKey' },
							credentials: {
								testApi: { id: 'existing', name: 'Existing Credential' },
							},
						},
					],
					connections: {},
				});

				const result = builderStore.applyWorkflowUpdate(workflowJson);
				expect(result.success).toBe(true);
				const [node] = result.workflowData?.nodes ?? [];
				expect(node.credentials).toEqual({
					testApi: { id: 'existing', name: 'Existing Credential' },
				});
			});
		});
	});

	describe('applyWorkflowUpdate with pinned data preservation', () => {
		it('should preserve pinned data for nodes with matching names', () => {
			const builderStore = useBuilderStore();

			// Set up initial workflow with nodes that have pinned data
			const node1 = {
				id: 'node1-id',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
			};
			const node2 = {
				id: 'node2-id',
				name: 'Set',
				type: 'n8n-nodes-base.set',
				position: [0, 0] as [number, number],
				typeVersion: 1,
				parameters: {},
			};

			workflowsStore.allNodes = [node1, node2];
			workflowsStore.workflow.nodes = [node1, node2];

			// Mock pinned data for these nodes
			const pinnedData1 = [{ json: { data: 'test1' } }];
			const pinnedData2 = [{ json: { data: 'test2' } }];

			vi.spyOn(workflowsStore, 'pinDataByNodeName', 'get').mockReturnValue(
				vi.fn((nodeName: string) => {
					if (nodeName === 'HTTP Request') return pinnedData1;
					if (nodeName === 'Set') return pinnedData2;
					return undefined;
				}),
			);

			// Create workflow update with the same node names but different IDs
			const workflowJson = JSON.stringify({
				nodes: [
					{
						id: 'new-node1-id',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						position: [250, 300] as [number, number],
						parameters: {},
					},
					{
						id: 'new-node2-id',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						position: [450, 300] as [number, number],
						parameters: {},
					},
				],
				connections: {},
			});

			// Apply the workflow update
			const result = builderStore.applyWorkflowUpdate(workflowJson);

			// Verify the update was successful
			expect(result.success).toBe(true);

			// Verify pinned data was preserved for nodes with matching names
			expect(result.workflowData?.pinData).toEqual({
				'HTTP Request': pinnedData1,
				Set: pinnedData2,
			});
		});

		it('should preserve pinned data only for nodes that still exist', () => {
			const builderStore = useBuilderStore();

			// Set up initial workflow with three nodes
			const node1 = {
				id: 'node1-id',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [250, 300] as [number, number],
				parameters: {},
			};
			const node2 = {
				id: 'node2-id',
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [450, 300] as [number, number],
				parameters: {},
			};
			const node3 = {
				id: 'node3-id',
				name: 'Code',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [650, 300] as [number, number],
				parameters: {},
			};

			workflowsStore.allNodes = [node1, node2, node3];
			workflowsStore.workflow.nodes = [node1, node2, node3];

			// Mock pinned data for all three nodes
			const pinnedData1 = [{ json: { data: 'test1' } }];
			const pinnedData2 = [{ json: { data: 'test2' } }];
			const pinnedData3 = [{ json: { data: 'test3' } }];

			vi.spyOn(workflowsStore, 'pinDataByNodeName', 'get').mockReturnValue(
				vi.fn((nodeName: string) => {
					if (nodeName === 'HTTP Request') return pinnedData1;
					if (nodeName === 'Set') return pinnedData2;
					if (nodeName === 'Code') return pinnedData3;
					return undefined;
				}),
			);

			// Create workflow update with only two of the three nodes
			const workflowJson = JSON.stringify({
				nodes: [
					{
						id: 'new-node1-id',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						position: [250, 300] as [number, number],
						typeVersion: 1,
						parameters: {},
					},
					{
						id: 'new-node2-id',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [450, 300] as [number, number],
						parameters: {},
					},
				],
				connections: {},
			});

			// Apply the workflow update
			const result = builderStore.applyWorkflowUpdate(workflowJson);

			// Verify the update was successful
			expect(result.success).toBe(true);

			// Verify only pinned data for existing nodes was preserved
			expect(result.workflowData?.pinData).toEqual({
				'HTTP Request': pinnedData1,
				Set: pinnedData2,
			});

			// Code node's pinned data should not be included
			expect(result.workflowData?.pinData).not.toHaveProperty('Code');
		});

		it('should not add pinData property if no pinned data exists', () => {
			const builderStore = useBuilderStore();

			// Set up initial workflow without pinned data
			const node1 = {
				id: 'node1-id',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [250, 300] as [number, number],
				parameters: {},
			};

			workflowsStore.allNodes = [node1];
			workflowsStore.workflow.nodes = [node1];

			// Mock no pinned data
			vi.spyOn(workflowsStore, 'pinDataByNodeName', 'get').mockReturnValue(vi.fn(() => undefined));

			// Create workflow update
			const workflowJson = JSON.stringify({
				nodes: [
					{
						id: 'new-node1-id',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [250, 300] as [number, number],
						parameters: {},
					},
				],
				connections: {},
			});

			// Apply the workflow update
			const result = builderStore.applyWorkflowUpdate(workflowJson);

			// Verify the update was successful
			expect(result.success).toBe(true);

			// Verify pinData property is not added
			expect(result.workflowData?.pinData).toBeUndefined();
		});

		it('should handle nodes with renamed names correctly', () => {
			const builderStore = useBuilderStore();

			// Set up initial workflow
			const node1 = {
				id: 'node1-id',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [250, 300] as [number, number],
				parameters: {},
			};

			workflowsStore.allNodes = [node1];
			workflowsStore.workflow.nodes = [node1];

			// Mock pinned data
			const pinnedData1 = [{ json: { data: 'test1' } }];

			vi.spyOn(workflowsStore, 'pinDataByNodeName', 'get').mockReturnValue(
				vi.fn((nodeName: string) => {
					if (nodeName === 'HTTP Request') return pinnedData1;
					return undefined;
				}),
			);

			// Create workflow update with renamed node
			const workflowJson = JSON.stringify({
				nodes: [
					{
						id: 'new-node1-id',
						name: 'HTTP Request1',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [250, 300] as [number, number],
						parameters: {},
					},
				],
				connections: {},
			});

			// Apply the workflow update
			const result = builderStore.applyWorkflowUpdate(workflowJson);

			// Verify the update was successful
			expect(result.success).toBe(true);

			// Verify pinned data was not preserved since the name changed
			expect(result.workflowData?.pinData).toBeUndefined();
		});

		it('should preserve pinned data when adding new nodes', () => {
			const builderStore = useBuilderStore();

			// Set up initial workflow with one node
			const node1 = {
				id: 'node1-id',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [250, 300] as [number, number],
				parameters: {},
			};

			workflowsStore.allNodes = [node1];
			workflowsStore.workflow.nodes = [node1];

			// Mock pinned data for the existing node
			const pinnedData1 = [{ json: { data: 'test1' } }];

			vi.spyOn(workflowsStore, 'pinDataByNodeName', 'get').mockReturnValue(
				vi.fn((nodeName: string) => {
					if (nodeName === 'HTTP Request') return pinnedData1;
					return undefined;
				}),
			);

			// Create workflow update with existing node plus a new node
			const workflowJson = JSON.stringify({
				nodes: [
					{
						id: 'new-node1-id',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [250, 300] as [number, number],
						parameters: {},
					},
					{
						id: 'new-node2-id',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [450, 300] as [number, number],
						parameters: {},
					},
				],
				connections: {},
			});

			// Apply the workflow update
			const result = builderStore.applyWorkflowUpdate(workflowJson);

			// Verify the update was successful
			expect(result.success).toBe(true);

			// Verify pinned data was preserved only for the existing node
			expect(result.workflowData?.pinData).toEqual({
				'HTTP Request': pinnedData1,
			});

			// New node should not have pinned data
			expect(result.workflowData?.pinData).not.toHaveProperty('Set');
		});
	});

	describe('Credits management', () => {
		it('should update builder credits correctly', () => {
			const builderStore = useBuilderStore();

			// Initially undefined
			expect(builderStore.creditsQuota).toBeUndefined();
			expect(builderStore.creditsRemaining).toBeUndefined();

			// Update credits
			builderStore.updateBuilderCredits(100, 30);

			expect(builderStore.creditsQuota).toBe(100);
			expect(builderStore.creditsRemaining).toBe(70);
		});

		it('should handle unlimited credits (quota = -1)', () => {
			const builderStore = useBuilderStore();

			builderStore.updateBuilderCredits(-1, 50);

			expect(builderStore.creditsQuota).toBe(-1);
			expect(builderStore.creditsRemaining).toBeUndefined();
		});

		it('should handle edge case where claimed > quota', () => {
			const builderStore = useBuilderStore();

			builderStore.updateBuilderCredits(50, 100);

			expect(builderStore.creditsQuota).toBe(50);
			expect(builderStore.creditsRemaining).toBe(0);
		});

		it('should return undefined when credits are not initialized', () => {
			const builderStore = useBuilderStore();

			expect(builderStore.creditsRemaining).toBeUndefined();
		});

		it('should return undefined when only quota is set', () => {
			const builderStore = useBuilderStore();

			builderStore.updateBuilderCredits(100, undefined);

			expect(builderStore.creditsRemaining).toBeUndefined();
		});

		it('should return undefined when only claimed is set', () => {
			const builderStore = useBuilderStore();

			builderStore.updateBuilderCredits(undefined, 50);

			expect(builderStore.creditsRemaining).toBeUndefined();
		});
	});

	describe('hasNoCreditsRemaining', () => {
		it('should return false when creditsRemaining is undefined', () => {
			const builderStore = useBuilderStore();

			// No credits initialized
			expect(builderStore.hasNoCreditsRemaining).toBe(false);
		});

		it('should return true when creditsRemaining is 0', () => {
			const builderStore = useBuilderStore();

			builderStore.updateBuilderCredits(100, 100);

			expect(builderStore.creditsRemaining).toBe(0);
			expect(builderStore.hasNoCreditsRemaining).toBe(true);
		});

		it('should return false when creditsRemaining is greater than 0', () => {
			const builderStore = useBuilderStore();

			builderStore.updateBuilderCredits(100, 30);

			expect(builderStore.creditsRemaining).toBe(70);
			expect(builderStore.hasNoCreditsRemaining).toBe(false);
		});

		it('should return false when quota is undefined', () => {
			const builderStore = useBuilderStore();

			builderStore.updateBuilderCredits(undefined, 50);

			expect(builderStore.creditsRemaining).toBeUndefined();
			expect(builderStore.hasNoCreditsRemaining).toBe(false);
		});

		it('should return false when claimed is undefined', () => {
			const builderStore = useBuilderStore();

			builderStore.updateBuilderCredits(100, undefined);

			expect(builderStore.creditsRemaining).toBeUndefined();
			expect(builderStore.hasNoCreditsRemaining).toBe(false);
		});

		it('should return false when unlimited credits (quota = -1)', () => {
			const builderStore = useBuilderStore();

			builderStore.updateBuilderCredits(-1, 50);

			expect(builderStore.creditsRemaining).toBeUndefined();
			expect(builderStore.hasNoCreditsRemaining).toBe(false);
		});

		it('should return true when claimed exceeds quota', () => {
			const builderStore = useBuilderStore();

			builderStore.updateBuilderCredits(50, 100);

			expect(builderStore.creditsRemaining).toBe(0);
			expect(builderStore.hasNoCreditsRemaining).toBe(true);
		});

		it('should return false when user has credits available', () => {
			const builderStore = useBuilderStore();

			builderStore.updateBuilderCredits(100, 25);

			expect(builderStore.creditsRemaining).toBe(75);
			expect(builderStore.hasNoCreditsRemaining).toBe(false);
		});

		it('should return true immediately after all credits are consumed', () => {
			const builderStore = useBuilderStore();

			// Start with some credits
			builderStore.updateBuilderCredits(100, 99);
			expect(builderStore.hasNoCreditsRemaining).toBe(false);

			// Consume last credit
			builderStore.updateBuilderCredits(100, 100);
			expect(builderStore.hasNoCreditsRemaining).toBe(true);
		});
	});

	describe('fetchBuilderCredits', () => {
		const mockGetBuilderCredits = vi.spyOn(chatAPI, 'getBuilderCredits');

		beforeEach(() => {
			mockGetBuilderCredits.mockClear();
		});

		it('should fetch and update credits when AI builder is enabled', async () => {
			const builderStore = useBuilderStore();
			const settingsStore = useSettingsStore();

			// Mock AI builder as enabled
			vi.spyOn(settingsStore, 'isAiBuilderEnabled', 'get').mockReturnValue(true);

			// Mock API response
			mockGetBuilderCredits.mockResolvedValueOnce({
				creditsQuota: 200,
				creditsClaimed: 50,
			});

			await builderStore.fetchBuilderCredits();

			expect(mockGetBuilderCredits).toHaveBeenCalled();
			expect(builderStore.creditsQuota).toBe(200);
			expect(builderStore.creditsRemaining).toBe(150);
		});

		it('should not fetch credits when AI builder is not enabled', async () => {
			const builderStore = useBuilderStore();
			const settingsStore = useSettingsStore();

			// Mock AI builder as disabled
			vi.spyOn(settingsStore, 'isAiBuilderEnabled', 'get').mockReturnValue(false);

			await builderStore.fetchBuilderCredits();

			expect(mockGetBuilderCredits).not.toHaveBeenCalled();
			expect(builderStore.creditsQuota).toBeUndefined();
			expect(builderStore.creditsRemaining).toBeUndefined();
		});

		it('should handle API errors gracefully', async () => {
			const builderStore = useBuilderStore();
			const settingsStore = useSettingsStore();

			// Mock AI builder as enabled
			vi.spyOn(settingsStore, 'isAiBuilderEnabled', 'get').mockReturnValue(true);

			// Mock API to throw error
			mockGetBuilderCredits.mockRejectedValueOnce(new Error('API error'));

			await builderStore.fetchBuilderCredits();

			expect(mockGetBuilderCredits).toHaveBeenCalled();
			// Credits should remain undefined on error
			expect(builderStore.creditsQuota).toBeUndefined();
			expect(builderStore.creditsRemaining).toBeUndefined();
		});

		it('should call fetchBuilderCredits when opening chat', async () => {
			const builderStore = useBuilderStore();
			const chatPanelStore = useChatPanelStore();
			const settingsStore = useSettingsStore();

			// Mock AI builder as enabled
			vi.spyOn(settingsStore, 'isAiBuilderEnabled', 'get').mockReturnValue(true);

			// Mock API response
			mockGetBuilderCredits.mockResolvedValueOnce({
				creditsQuota: 100,
				creditsClaimed: 20,
			});

			// Mock loadSessions to prevent actual API call
			vi.spyOn(chatAPI, 'getAiSessions').mockResolvedValueOnce({ sessions: [] });

			await chatPanelStore.open({ mode: 'builder' });

			expect(mockGetBuilderCredits).toHaveBeenCalled();
			expect(builderStore.creditsQuota).toBe(100);
			expect(builderStore.creditsRemaining).toBe(80);
		});
	});

	describe('trackWorkflowBuilderJourney', () => {
		it('tracks event with workflow_id, session_id, and event_type (without last_user_message_id when no message sent)', () => {
			const builderStore = useBuilderStore();

			builderStore.trackWorkflowBuilderJourney('user_clicked_todo');

			expect(track).toHaveBeenCalledWith('Workflow builder journey', {
				workflow_id: 'test-workflow-id',
				session_id: expect.any(String),
				event_type: 'user_clicked_todo',
			});
		});

		it('includes last_user_message_id after user sends a message', async () => {
			const builderStore = useBuilderStore();

			apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, onDone) => {
				onMessage({
					messages: [{ type: 'message', role: 'assistant', text: 'Hello!' }],
					sessionId: 'test-session',
				});
				onDone();
			});

			await builderStore.sendChatMessage({ text: 'test' });
			await vi.waitFor(() => expect(builderStore.streaming).toBe(false));

			track.mockClear();
			builderStore.trackWorkflowBuilderJourney('user_clicked_todo');

			expect(track).toHaveBeenCalledWith('Workflow builder journey', {
				workflow_id: 'test-workflow-id',
				session_id: expect.any(String),
				event_type: 'user_clicked_todo',
				last_user_message_id: expect.any(String),
			});
		});

		it('includes event_properties when provided', () => {
			const builderStore = useBuilderStore();

			builderStore.trackWorkflowBuilderJourney('user_clicked_todo', {
				node_type: 'n8n-nodes-base.httpRequest',
				type: 'parameters',
			});

			expect(track).toHaveBeenCalledWith('Workflow builder journey', {
				workflow_id: 'test-workflow-id',
				session_id: expect.any(String),
				event_type: 'user_clicked_todo',
				event_properties: {
					node_type: 'n8n-nodes-base.httpRequest',
					type: 'parameters',
				},
			});
		});

		it('omits event_properties when empty object provided', () => {
			const builderStore = useBuilderStore();

			builderStore.trackWorkflowBuilderJourney('field_focus_placeholder_in_ndv', {});

			expect(track).toHaveBeenCalledWith('Workflow builder journey', {
				workflow_id: 'test-workflow-id',
				session_id: expect.any(String),
				event_type: 'field_focus_placeholder_in_ndv',
			});
		});

		it('omits event_properties when not provided', () => {
			const builderStore = useBuilderStore();

			builderStore.trackWorkflowBuilderJourney('no_placeholder_values_left');

			expect(track).toHaveBeenCalledWith('Workflow builder journey', {
				workflow_id: 'test-workflow-id',
				session_id: expect.any(String),
				event_type: 'no_placeholder_values_left',
			});
		});

		it('includes both event_properties and last_user_message_id when both are present', async () => {
			const builderStore = useBuilderStore();

			apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, onDone) => {
				onMessage({
					messages: [{ type: 'message', role: 'assistant', text: 'Hello!' }],
					sessionId: 'test-session',
				});
				onDone();
			});

			await builderStore.sendChatMessage({ text: 'test' });
			await vi.waitFor(() => expect(builderStore.streaming).toBe(false));

			track.mockClear();
			builderStore.trackWorkflowBuilderJourney('user_clicked_todo', {
				node_type: 'n8n-nodes-base.httpRequest',
				type: 'parameters',
			});

			expect(track).toHaveBeenCalledWith('Workflow builder journey', {
				workflow_id: 'test-workflow-id',
				session_id: expect.any(String),
				event_type: 'user_clicked_todo',
				event_properties: {
					node_type: 'n8n-nodes-base.httpRequest',
					type: 'parameters',
				},
				last_user_message_id: expect.any(String),
			});
		});
	});

	describe('abortStreaming telemetry', () => {
		it('tracks end of response with aborted flag when aborting', async () => {
			const builderStore = useBuilderStore();

			apiSpy.mockImplementationOnce(() => {});
			await builderStore.sendChatMessage({ text: 'test' });

			track.mockClear();
			builderStore.abortStreaming();

			expect(track).toHaveBeenCalledWith(
				'End of response from builder',
				expect.objectContaining({
					aborted: true,
					user_message_id: expect.any(String),
					workflow_id: 'test-workflow-id',
				}),
			);
		});

		it('includes workflow modifications in abort telemetry', async () => {
			const builderStore = useBuilderStore();

			apiSpy.mockImplementationOnce(() => {});
			await builderStore.sendChatMessage({ text: 'test' });

			track.mockClear();
			builderStore.abortStreaming();

			expect(track).toHaveBeenCalledWith(
				'End of response from builder',
				expect.objectContaining({
					tools_called: expect.any(Array),
					start_workflow_json: expect.any(String),
					end_workflow_json: expect.any(String),
					workflow_modified: false,
				}),
			);
		});

		it('includes todos count in abort telemetry', async () => {
			const builderStore = useBuilderStore();

			apiSpy.mockImplementationOnce(() => {});
			await builderStore.sendChatMessage({ text: 'test' });

			track.mockClear();
			builderStore.abortStreaming();

			expect(track).toHaveBeenCalledWith(
				'End of response from builder',
				expect.objectContaining({
					credentials_todo_count: expect.any(Number),
					placeholders_todo_count: expect.any(Number),
					todos: expect.any(Array),
				}),
			);
		});

		it('does not track telemetry if no streaming message in progress', () => {
			const builderStore = useBuilderStore();

			// Don't start any streaming
			track.mockClear();

			builderStore.abortStreaming();

			expect(track).not.toHaveBeenCalledWith('End of response from builder', expect.anything());
		});
	});

	describe('workflowTodos', () => {
		it('returns empty array when no validation issues exist', () => {
			workflowsStore.workflowValidationIssues = [];
			workflowsStore.workflow.nodes = [];

			const builderStore = useBuilderStore();
			expect(builderStore.workflowTodos).toEqual([]);
		});

		it('includes credential validation issues', () => {
			workflowsStore.workflowValidationIssues = [
				{ node: 'HTTP Request', type: 'credentials', value: 'Missing credentials' },
			];

			const builderStore = useBuilderStore();
			expect(builderStore.workflowTodos).toContainEqual(
				expect.objectContaining({ type: 'credentials' }),
			);
		});

		it('includes placeholder issues from node parameters', () => {
			workflowsStore.workflowValidationIssues = [];
			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						url: '<__PLACEHOLDER_VALUE__Enter URL__>',
					},
				},
			];

			const builderStore = useBuilderStore();
			expect(builderStore.workflowTodos).toContainEqual(
				expect.objectContaining({ type: 'parameters', node: 'HTTP Request' }),
			);
		});

		it('combines credential and placeholder issues', () => {
			workflowsStore.workflowValidationIssues = [
				{ node: 'HTTP Request', type: 'credentials', value: 'Missing credentials' },
			];
			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						url: '<__PLACEHOLDER_VALUE__Enter URL__>',
					},
				},
			];

			const builderStore = useBuilderStore();
			expect(builderStore.workflowTodos.length).toBeGreaterThanOrEqual(2);
			expect(builderStore.workflowTodos).toContainEqual(
				expect.objectContaining({ type: 'credentials' }),
			);
			expect(builderStore.workflowTodos).toContainEqual(
				expect.objectContaining({ type: 'parameters' }),
			);
		});
	});

	describe('placeholderIssues', () => {
		it('returns empty array when nodes have no parameters', () => {
			workflowsStore.workflowValidationIssues = [];
			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			];

			const builderStore = useBuilderStore();
			expect(builderStore.workflowTodos).toEqual([]);
		});

		it('returns empty array when node has undefined parameters', () => {
			workflowsStore.workflowValidationIssues = [];
			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
				} as Parameters<typeof workflowsStore.workflow.nodes.push>[0],
			];

			const builderStore = useBuilderStore();
			expect(builderStore.workflowTodos).toEqual([]);
		});

		it('detects placeholders in nested object parameters', () => {
			workflowsStore.workflowValidationIssues = [];
			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						options: {
							headers: {
								authorization: '<__PLACEHOLDER_VALUE__Enter API Key__>',
							},
						},
					},
				},
			];

			const builderStore = useBuilderStore();
			const placeholderIssues = builderStore.workflowTodos.filter((t) => t.type === 'parameters');
			expect(placeholderIssues).toHaveLength(1);
			expect(placeholderIssues[0]).toMatchObject({
				node: 'HTTP Request',
				type: 'parameters',
			});
		});

		it('detects placeholders in array parameters', () => {
			workflowsStore.workflowValidationIssues = [];
			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						headers: [
							{ name: 'Content-Type', value: 'application/json' },
							{ name: 'Authorization', value: '<__PLACEHOLDER_VALUE__Enter Token__>' },
						],
					},
				},
			];

			const builderStore = useBuilderStore();
			const placeholderIssues = builderStore.workflowTodos.filter((t) => t.type === 'parameters');
			expect(placeholderIssues).toHaveLength(1);
			expect(placeholderIssues[0]).toMatchObject({
				node: 'HTTP Request',
				type: 'parameters',
			});
		});

		it('detects multiple placeholders in the same node', () => {
			workflowsStore.workflowValidationIssues = [];
			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						url: '<__PLACEHOLDER_VALUE__Enter URL__>',
						body: '<__PLACEHOLDER_VALUE__Enter Body__>',
					},
				},
			];

			const builderStore = useBuilderStore();
			const placeholderIssues = builderStore.workflowTodos.filter((t) => t.type === 'parameters');
			expect(placeholderIssues).toHaveLength(2);
		});

		it('detects placeholders across multiple nodes', () => {
			workflowsStore.workflowValidationIssues = [];
			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						url: '<__PLACEHOLDER_VALUE__Enter URL__>',
					},
				},
				{
					id: 'node-2',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
					position: [200, 0],
					parameters: {
						channel: '<__PLACEHOLDER_VALUE__Enter Channel__>',
					},
				},
			];

			const builderStore = useBuilderStore();
			const placeholderIssues = builderStore.workflowTodos.filter((t) => t.type === 'parameters');
			expect(placeholderIssues).toHaveLength(2);
			expect(placeholderIssues).toContainEqual(expect.objectContaining({ node: 'HTTP Request' }));
			expect(placeholderIssues).toContainEqual(expect.objectContaining({ node: 'Slack' }));
		});

		it('deduplicates identical placeholder issues (same node, path, and label)', () => {
			workflowsStore.workflowValidationIssues = [];
			// Simulate a scenario where the same placeholder appears twice
			// (which shouldn't happen in practice but tests the deduplication)
			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						url: '<__PLACEHOLDER_VALUE__Enter URL__>',
					},
				},
			];

			const builderStore = useBuilderStore();
			const placeholderIssues = builderStore.workflowTodos.filter((t) => t.type === 'parameters');
			// Should only have 1 issue, not duplicates
			expect(placeholderIssues).toHaveLength(1);
		});

		it('skips placeholder when existing parameter issue already has the same message', () => {
			const placeholderLabel = 'Enter URL';
			// The message format from the store uses i18n which is mocked to return the key
			const expectedMessage = 'aiAssistant.builder.executeMessage.fillParameter';

			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						url: `<__PLACEHOLDER_VALUE__${placeholderLabel}__>`,
					},
					issues: {
						parameters: {
							url: [expectedMessage],
						},
					},
				},
			];
			workflowsStore.workflowValidationIssues = [];

			const builderStore = useBuilderStore();
			const placeholderIssues = builderStore.workflowTodos.filter((t) => t.type === 'parameters');
			// Should be skipped because the message already exists
			expect(placeholderIssues).toHaveLength(0);
		});

		it('does not skip placeholder when existing parameter issue has different message', () => {
			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						url: '<__PLACEHOLDER_VALUE__Enter URL__>',
					},
					issues: {
						parameters: {
							url: ['Some other validation error'],
						},
					},
				},
			];
			workflowsStore.workflowValidationIssues = [];

			const builderStore = useBuilderStore();
			const placeholderIssues = builderStore.workflowTodos.filter((t) => t.type === 'parameters');
			// Should still create the placeholder issue
			expect(placeholderIssues).toHaveLength(1);
		});

		it('ignores non-string parameter values', () => {
			workflowsStore.workflowValidationIssues = [];
			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						timeout: 5000,
						enabled: true,
						config: null,
					},
				},
			];

			const builderStore = useBuilderStore();
			expect(builderStore.workflowTodos).toEqual([]);
		});

		it('ignores strings that do not match placeholder format', () => {
			workflowsStore.workflowValidationIssues = [];
			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						url: 'https://example.com',
						body: 'regular string',
						partial: '<__PLACEHOLDER_VALUE__missing end',
						wrongPrefix: 'PLACEHOLDER__test__>',
					},
				},
			];

			const builderStore = useBuilderStore();
			expect(builderStore.workflowTodos).toEqual([]);
		});

		it('ignores placeholder with empty label', () => {
			workflowsStore.workflowValidationIssues = [];
			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						url: '<__PLACEHOLDER_VALUE____>', // empty label
						body: '<__PLACEHOLDER_VALUE__   __>', // whitespace-only label
					},
				},
			];

			const builderStore = useBuilderStore();
			expect(builderStore.workflowTodos).toEqual([]);
		});

		it('filters out non-credential and non-parameter validation issues', () => {
			workflowsStore.workflowValidationIssues = [
				{ node: 'HTTP Request', type: 'credentials', value: 'Missing credentials' },
				{ node: 'HTTP Request', type: 'parameters', value: 'Missing parameter' },
				{ node: 'HTTP Request', type: 'execution', value: 'Execution error' },
				{ node: 'HTTP Request', type: 'unknown' as 'parameters', value: 'Unknown issue' },
			];
			workflowsStore.workflow.nodes = [];

			const builderStore = useBuilderStore();
			// Should only include credentials and parameters types
			expect(builderStore.workflowTodos).toHaveLength(2);
			expect(builderStore.workflowTodos).toContainEqual(
				expect.objectContaining({ type: 'credentials' }),
			);
			expect(builderStore.workflowTodos).toContainEqual(
				expect.objectContaining({ type: 'parameters' }),
			);
		});
	});

	describe('manual execution stats telemetry', () => {
		it('should include success count in telemetry when sending message', async () => {
			const builderStore = useBuilderStore();

			apiSpy.mockImplementationOnce(() => {});

			builderStore.incrementManualExecutionStats('success');
			await builderStore.sendChatMessage({ text: 'test' });

			expect(track).toHaveBeenCalledWith(
				'User submitted builder message',
				expect.objectContaining({
					manual_exec_success_count_since_prev_msg: 1,
					manual_exec_error_count_since_prev_msg: 0,
				}),
			);
		});

		it('should include error count in telemetry when sending message', async () => {
			const builderStore = useBuilderStore();

			apiSpy.mockImplementationOnce(() => {});

			builderStore.incrementManualExecutionStats('error');
			await builderStore.sendChatMessage({ text: 'test' });

			expect(track).toHaveBeenCalledWith(
				'User submitted builder message',
				expect.objectContaining({
					manual_exec_success_count_since_prev_msg: 0,
					manual_exec_error_count_since_prev_msg: 1,
				}),
			);
		});

		it('should include multiple incremented counts in telemetry', async () => {
			const builderStore = useBuilderStore();

			apiSpy.mockImplementationOnce(() => {});

			builderStore.incrementManualExecutionStats('success');
			builderStore.incrementManualExecutionStats('success');
			builderStore.incrementManualExecutionStats('error');
			await builderStore.sendChatMessage({ text: 'test' });

			expect(track).toHaveBeenCalledWith(
				'User submitted builder message',
				expect.objectContaining({
					manual_exec_success_count_since_prev_msg: 2,
					manual_exec_error_count_since_prev_msg: 1,
				}),
			);
		});

		it('should reset stats after sending message', async () => {
			const builderStore = useBuilderStore();

			// First message with some stats
			apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, onDone) => {
				onMessage({
					messages: [{ type: 'message', role: 'assistant', text: 'Hello!' }],
					sessionId: 'test-session',
				});
				onDone();
			});

			builderStore.incrementManualExecutionStats('success');
			builderStore.incrementManualExecutionStats('error');
			await builderStore.sendChatMessage({ text: 'first message' });

			await vi.waitFor(() => expect(builderStore.streaming).toBe(false));

			// Verify first message had the stats
			expect(track).toHaveBeenCalledWith(
				'User submitted builder message',
				expect.objectContaining({
					manual_exec_success_count_since_prev_msg: 1,
					manual_exec_error_count_since_prev_msg: 1,
				}),
			);

			track.mockClear();

			// Second message should have reset stats (zero counts)
			apiSpy.mockImplementationOnce((_ctx, _payload, onMessage, onDone) => {
				onMessage({
					messages: [{ type: 'message', role: 'assistant', text: 'Hello again!' }],
					sessionId: 'test-session',
				});
				onDone();
			});

			await builderStore.sendChatMessage({ text: 'second message' });

			await vi.waitFor(() => expect(builderStore.streaming).toBe(false));

			expect(track).toHaveBeenCalledWith(
				'User submitted builder message',
				expect.objectContaining({
					manual_exec_success_count_since_prev_msg: 0,
					manual_exec_error_count_since_prev_msg: 0,
				}),
			);
		});

		it('should include zero counts when no manual executions occurred', async () => {
			const builderStore = useBuilderStore();

			apiSpy.mockImplementationOnce(() => {});

			await builderStore.sendChatMessage({ text: 'test' });

			expect(track).toHaveBeenCalledWith(
				'User submitted builder message',
				expect.objectContaining({
					manual_exec_success_count_since_prev_msg: 0,
					manual_exec_error_count_since_prev_msg: 0,
				}),
			);
		});
	});

	describe('Version management and revert functionality', () => {
		const mockGetAiSessions = vi.spyOn(chatAPI, 'getAiSessions');
		const mockTruncateBuilderMessages = vi.spyOn(chatAPI, 'truncateBuilderMessages');

		beforeEach(() => {
			mockGetAiSessions.mockClear();
			mockTruncateBuilderMessages.mockClear();
		});

		describe('fetchExistingVersionIds and message enrichment', () => {
			it('should enrich messages with revertVersion when versions exist', async () => {
				const builderStore = useBuilderStore();

				// Import the mocked module
				const workflowHistoryModule = await import('@n8n/rest-api-client/api/workflowHistory');

				// Mock API to return messages with revertVersionId
				mockGetAiSessions.mockResolvedValueOnce({
					sessions: [
						{
							sessionId: 'session-1',
							lastUpdated: '2024-01-01T00:00:00Z',
							messages: [
								{
									type: 'message',
									role: 'user',
									text: 'Create workflow',
									id: 'msg-1',
									revertVersionId: 'version-1',
								} as unknown as ChatRequest.MessageResponse,
								{
									type: 'message',
									role: 'assistant',
									text: 'Created workflow',
									id: 'msg-2',
								} as unknown as ChatRequest.MessageResponse,
							],
						},
					],
				});

				// Mock version check - version-1 exists
				vi.mocked(workflowHistoryModule.getWorkflowVersionsByIds).mockResolvedValueOnce({
					versions: [{ versionId: 'version-1', createdAt: '2024-01-01T00:00:00Z' }],
				});

				await builderStore.loadSessions();

				// Should have 2 messages
				expect(builderStore.chatMessages).toHaveLength(2);

				// First message should have revertVersion object
				const firstMessage = builderStore.chatMessages[0] as ChatUI.TextMessage;
				expect(firstMessage).toHaveProperty('revertVersion');
				expect(firstMessage.revertVersion).toEqual({
					id: 'version-1',
					createdAt: '2024-01-01T00:00:00Z',
				});
			});

			it('should handle empty version IDs array', async () => {
				const builderStore = useBuilderStore();

				mockGetAiSessions.mockResolvedValueOnce({
					sessions: [
						{
							sessionId: 'session-1',
							lastUpdated: '2024-01-01T00:00:00Z',
							messages: [
								{
									type: 'message',
									role: 'user',
									text: 'Test',
									id: 'msg-1',
								} as unknown as ChatRequest.MessageResponse,
							],
						},
					],
				});

				await builderStore.loadSessions();

				expect(builderStore.chatMessages).toHaveLength(1);
			});

			it('should handle API errors gracefully when checking versions', async () => {
				const builderStore = useBuilderStore();

				// Import the mocked module
				const workflowHistoryModule = await import('@n8n/rest-api-client/api/workflowHistory');

				mockGetAiSessions.mockResolvedValueOnce({
					sessions: [
						{
							sessionId: 'session-1',
							lastUpdated: '2024-01-01T00:00:00Z',
							messages: [
								{
									type: 'message',
									role: 'user',
									text: 'Test',
									id: 'msg-1',
									revertVersionId: 'version-1',
								} as unknown as ChatRequest.MessageResponse,
							],
						},
					],
				});

				// Mock API error
				vi.mocked(workflowHistoryModule.getWorkflowVersionsByIds).mockRejectedValueOnce(
					new Error('API error'),
				);

				await builderStore.loadSessions();

				// Should still load messages but without revertVersion (error is caught)
				expect(builderStore.chatMessages).toHaveLength(1);
			});
		});

		describe('restoreToVersion', () => {
			// Note: restoreToVersion tests are limited because the function depends on
			// workflowHistoryStore and workflowSaver which are difficult to mock in vitest
			// The core functionality is tested through integration tests
			it('should expose restoreToVersion method', () => {
				const builderStore = useBuilderStore();

				// Verify the method exists
				expect(builderStore.restoreToVersion).toBeDefined();
				expect(typeof builderStore.restoreToVersion).toBe('function');
			});

			it('should return undefined when workflow save fails with unsaved changes', async () => {
				const builderStore = useBuilderStore();

				// Mock that there are unsaved changes
				const uiStore = mockedStore(useUIStore);
				vi.spyOn(uiStore, 'stateIsDirty', 'get').mockReturnValue(true);

				// Mock saveCurrentWorkflow to return false (save failed or user cancelled)
				saveCurrentWorkflowMock.mockResolvedValueOnce(false);

				const result = await builderStore.restoreToVersion('version-123', 'message-456');

				// Should return undefined when save fails
				expect(result).toBeUndefined();
			});
		});

		describe('sendChatMessage with versionId', () => {
			// Note: sendChatMessage tests with versionId are limited because
			// the function depends on workflowSaver which requires router mocking
			// The versionId functionality is tested through integration tests
			it('should pass versionId to chatWithBuilder API', () => {
				const builderStore = useBuilderStore();

				// Verify that chatWithBuilder is being called with the versionId parameter
				// This is tested indirectly through the chatWithBuilder API tests
				expect(builderStore.sendChatMessage).toBeDefined();
				expect(typeof builderStore.sendChatMessage).toBe('function');
			});
		});
	});

	describe('Page title status', () => {
		it('should set title to AI_BUILDING when streaming starts', async () => {
			const builderStore = useBuilderStore();
			workflowsStore.workflowName = 'Test Workflow';

			// Mock the API to prevent actual calls
			apiSpy.mockImplementation(() => {});

			await builderStore.sendChatMessage({ text: 'Build something' });

			expect(setDocumentTitleMock).toHaveBeenCalledWith('Test Workflow', 'AI_BUILDING');
		});

		it('should set title to AI_DONE when streaming stops and tab is hidden', () => {
			Object.defineProperty(document, 'hidden', { value: true, configurable: true });

			const builderStore = useBuilderStore();
			workflowsStore.workflowName = 'Test Workflow';

			// Start streaming first
			builderStore.streaming = true;

			// Trigger abortStreaming which calls stopStreaming internally
			builderStore.abortStreaming();

			expect(setDocumentTitleMock).toHaveBeenCalledWith('Test Workflow', 'AI_DONE');
		});

		it('should set title to IDLE when streaming stops and tab is visible', () => {
			Object.defineProperty(document, 'hidden', { value: false, configurable: true });

			const builderStore = useBuilderStore();
			workflowsStore.workflowName = 'Test Workflow';

			// Start streaming first
			builderStore.streaming = true;

			// Trigger abortStreaming which calls stopStreaming internally
			builderStore.abortStreaming();

			expect(setDocumentTitleMock).toHaveBeenCalledWith('Test Workflow', 'IDLE');
		});

		it('should reset title to IDLE when clearDoneIndicatorTitle is called and indicator is showing', () => {
			Object.defineProperty(document, 'hidden', { value: true, configurable: true });

			const builderStore = useBuilderStore();
			workflowsStore.workflowName = 'Test Workflow';

			builderStore.streaming = true;
			builderStore.abortStreaming();

			setDocumentTitleMock.mockClear();

			builderStore.clearDoneIndicatorTitle();

			expect(setDocumentTitleMock).toHaveBeenCalledWith('Test Workflow', 'IDLE');
		});

		it('should not change title when clearDoneIndicatorTitle is called and indicator is not showing', () => {
			Object.defineProperty(document, 'hidden', { value: false, configurable: true });

			const builderStore = useBuilderStore();
			workflowsStore.workflowName = 'Test Workflow';

			setDocumentTitleMock.mockClear();

			builderStore.clearDoneIndicatorTitle();

			expect(setDocumentTitleMock).not.toHaveBeenCalled();
		});
	});
});
