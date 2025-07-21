import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ENABLED_VIEWS, useBuilderStore } from '@/stores/builder.store';
import { usePostHog } from './posthog.store';
import { useSettingsStore } from '@/stores/settings.store';
import { defaultSettings } from '../__tests__/defaults';
import merge from 'lodash/merge';
import { DEFAULT_POSTHOG_SETTINGS } from './posthog.test';
import { WORKFLOW_BUILDER_EXPERIMENT } from '@/constants';
import { reactive } from 'vue';
import * as chatAPI from '@/api/ai';
import * as telemetryModule from '@/composables/useTelemetry';
import type { Telemetry } from '@/plugins/telemetry';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import { DEFAULT_CHAT_WIDTH, MAX_CHAT_WIDTH, MIN_CHAT_WIDTH } from './assistant.store';

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

		// Initially shows "Thinking..." from prepareForStreaming
		expect(builderStore.assistantThinkingMessage).toBe('Thinking...');

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

		// Should show "Running tools..."
		expect(builderStore.assistantThinkingMessage).toBe('Running tools...');

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

		// Still showing "Running tools..." with multiple tools
		expect(builderStore.assistantThinkingMessage).toBe('Running tools...');

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

		// Still "Running tools..." because second tool is still running
		expect(builderStore.assistantThinkingMessage).toBe('Running tools...');

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

		// Now should show "Processing results..." because all tools completed
		expect(builderStore.assistantThinkingMessage).toBe('Processing results...');

		// Call onDone to stop streaming
		onDoneCallback();

		// Message should persist after streaming ends
		expect(builderStore.streaming).toBe(false);
		expect(builderStore.assistantThinkingMessage).toBe('Processing results...');

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

		// Should show "Processing results..." when tool completes
		await vi.waitFor(() =>
			expect(builderStore.assistantThinkingMessage).toBe('Processing results...'),
		);

		// Should still show "Processing results..." after workflow-updated
		await vi.waitFor(() => expect(builderStore.chatMessages).toHaveLength(3)); // user + tool + workflow
		expect(builderStore.assistantThinkingMessage).toBe('Processing results...');

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
});
