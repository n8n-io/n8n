import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ENABLED_VIEWS, useBuilderStore } from '@/stores/builder.store';
import type { ChatRequest } from '@/types/assistant.types';
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

	it('should open chat window', () => {
		const builderStore = useBuilderStore();

		builderStore.openChat();
		expect(builderStore.chatWindowOpen).toBe(true);
	});

	it('should close chat window', () => {
		const builderStore = useBuilderStore();

		builderStore.closeChat();
		expect(builderStore.chatWindowOpen).toBe(false);
	});

	it('can add a simple assistant message', () => {
		const builderStore = useBuilderStore();

		const message: ChatRequest.MessageResponse = {
			type: 'message',
			role: 'assistant',
			text: 'Hello!',
		};
		builderStore.addAssistantMessages([message], '1');
		expect(builderStore.chatMessages.length).toBe(1);
		expect(builderStore.chatMessages[0]).toEqual({
			id: '1',
			type: 'text',
			role: 'assistant',
			content: 'Hello!',
			quickReplies: undefined,
			read: true, // Builder messages are always read
		});
	});

	it('can add a workflow step message', () => {
		const builderStore = useBuilderStore();

		const message: ChatRequest.MessageResponse = {
			type: 'workflow-step',
			role: 'assistant',
			steps: ['Step 1', 'Step 2'],
		};
		builderStore.addAssistantMessages([message], '1');
		expect(builderStore.chatMessages.length).toBe(1);
		expect(builderStore.chatMessages[0]).toEqual({
			id: '1',
			type: 'workflow-step',
			role: 'assistant',
			steps: ['Step 1', 'Step 2'],
			read: true,
		});
	});

	it('can add a workflow-generated message', () => {
		const builderStore = useBuilderStore();

		const message: ChatRequest.MessageResponse = {
			type: 'workflow-generated',
			role: 'assistant',
			codeSnippet: '{"nodes":[],"connections":[]}',
		};
		builderStore.addAssistantMessages([message], '1');
		expect(builderStore.chatMessages.length).toBe(1);
		expect(builderStore.chatMessages[0]).toEqual({
			id: '1',
			type: 'workflow-generated',
			role: 'assistant',
			codeSnippet: '{"nodes":[],"connections":[]}',
			read: true,
		});
	});

	it('can add a rate-workflow message', () => {
		const builderStore = useBuilderStore();

		const message: ChatRequest.MessageResponse = {
			type: 'rate-workflow',
			role: 'assistant',
			content: 'How was the workflow?',
		};
		builderStore.addAssistantMessages([message], '1');
		expect(builderStore.chatMessages.length).toBe(1);
		expect(builderStore.chatMessages[0]).toEqual({
			id: '1',
			type: 'rate-workflow',
			role: 'assistant',
			content: 'How was the workflow?',
			read: true,
		});
	});

	it('should reset builder chat session', () => {
		const builderStore = useBuilderStore();

		const message: ChatRequest.MessageResponse = {
			type: 'message',
			role: 'assistant',
			text: 'Hello!',
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		};
		builderStore.addAssistantMessages([message], '1');
		expect(builderStore.chatMessages.length).toBe(1);

		builderStore.resetBuilderChat();
		expect(builderStore.chatMessages).toEqual([]);
		expect(builderStore.currentSessionId).toBeUndefined();
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

		await builderStore.initBuilderChat('I want to build a workflow', 'chat');

		expect(apiSpy).toHaveBeenCalled();
		expect(builderStore.currentSessionId).toEqual(mockSessionId);
		expect(builderStore.chatMessages.length).toBe(2); // user message + assistant response
		expect(builderStore.chatMessages[0].role).toBe('user');
		expect(builderStore.chatMessages[1].role).toBe('assistant');
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

		await builderStore.initBuilderChat('I want to build a workflow', 'chat');

		// Should be 2 messages now (user question + assistant response)
		expect(builderStore.chatMessages.length).toBe(2);

		// Send a follow-up message
		await builderStore.sendMessage({ text: 'Generate a workflow for me' });

		const thirdMessage = builderStore.chatMessages[2] as ChatUI.TextMessage;
		const fourthMessage = builderStore.chatMessages[3] as ChatUI.TextMessage;
		// Should be 4 messages now (2 initial + user follow-up + assistant response)
		expect(builderStore.chatMessages.length).toBe(4);
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

		await builderStore.initBuilderChat('I want to build a workflow', 'chat');

		// Should have user message + error message
		expect(builderStore.chatMessages.length).toBe(2);
		expect(builderStore.chatMessages[0].role).toBe('user');
		expect(builderStore.chatMessages[1].type).toBe('error');

		// Error message should have a retry function
		const errorMessage = builderStore.chatMessages[1] as ChatUI.ErrorMessage;
		expect(errorMessage.retry).toBeDefined();

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
		await errorMessage.retry?.();

		// Should now have just the user message and success message
		expect(builderStore.chatMessages.length).toBe(2);
		expect(builderStore.chatMessages[0].role).toBe('user');
		expect(builderStore.chatMessages[1].type).toBe('text');
		expect((builderStore.chatMessages[1] as ChatUI.TextMessage).content).toBe(
			'I can help you build a workflow',
		);
	});
});
