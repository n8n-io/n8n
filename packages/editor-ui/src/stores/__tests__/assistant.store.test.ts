import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import {
	DEFAULT_CHAT_WIDTH,
	ENABLED_VIEWS,
	MAX_CHAT_WIDTH,
	MIN_CHAT_WIDTH,
	useAssistantStore,
} from '@/stores/assistant.store';
import type { ChatRequest } from '@/types/assistant.types';
import { usePostHog } from '../posthog.store';
import { useSettingsStore } from '@/stores/settings.store';
import { defaultSettings } from '../../__tests__/defaults';
import { merge } from 'lodash-es';
import { DEFAULT_POSTHOG_SETTINGS } from './posthog.test';
import { AI_ASSISTANT_EXPERIMENT, VIEWS } from '@/constants';
import { reactive } from 'vue';
import * as chatAPI from '@/api/assistant';
import * as telemetryModule from '@/composables/useTelemetry';
import type { Telemetry } from '@/plugins/telemetry';

let settingsStore: ReturnType<typeof useSettingsStore>;
let posthogStore: ReturnType<typeof usePostHog>;

const apiSpy = vi.spyOn(chatAPI, 'chatWithAssistant');

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

let currentRouteName = ENABLED_VIEWS[0];
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

const mockPostHogVariant = (variant: 'variant' | 'control') => {
	posthogStore.overrides = {
		[AI_ASSISTANT_EXPERIMENT.name]: variant,
	};
};

describe('AI Assistant store', () => {
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
		const assistantStore = useAssistantStore();

		expect(assistantStore.chatWidth).toBe(DEFAULT_CHAT_WIDTH);
		expect(assistantStore.chatMessages).toEqual([]);
		expect(assistantStore.chatWindowOpen).toBe(false);
		expect(assistantStore.streaming).toBeUndefined();
	});

	it('can change chat width', () => {
		const assistantStore = useAssistantStore();

		assistantStore.updateWindowWidth(400);
		expect(assistantStore.chatWidth).toBe(400);
	});

	it('should not allow chat width to be less than the minimal width', () => {
		const assistantStore = useAssistantStore();

		assistantStore.updateWindowWidth(100);
		expect(assistantStore.chatWidth).toBe(MIN_CHAT_WIDTH);
	});

	it('should not allow chat width to be more than the maximal width', () => {
		const assistantStore = useAssistantStore();

		assistantStore.updateWindowWidth(2000);
		expect(assistantStore.chatWidth).toBe(MAX_CHAT_WIDTH);
	});

	it('should open chat window', () => {
		const assistantStore = useAssistantStore();

		assistantStore.openChat();
		expect(assistantStore.chatWindowOpen).toBe(true);
	});

	it('should close chat window', () => {
		const assistantStore = useAssistantStore();

		assistantStore.closeChat();
		expect(assistantStore.chatWindowOpen).toBe(false);
	});

	it('can add a simple assistant message', () => {
		const assistantStore = useAssistantStore();

		const message: ChatRequest.MessageResponse = {
			type: 'message',
			role: 'assistant',
			text: 'Hello!',
		};
		assistantStore.addAssistantMessages([message], '1');
		expect(assistantStore.chatMessages.length).toBe(1);
		expect(assistantStore.chatMessages[0]).toEqual({
			id: '1',
			type: 'text',
			role: 'assistant',
			content: 'Hello!',
			quickReplies: undefined,
			read: false,
		});
	});

	it('can add an assistant message with quick replies', () => {
		const assistantStore = useAssistantStore();

		const message: ChatRequest.MessageResponse = {
			type: 'message',
			role: 'assistant',
			text: 'Hello!',
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		};
		assistantStore.addAssistantMessages([message], '1');
		expect(assistantStore.chatMessages.length).toBe(1);
		expect(assistantStore.chatMessages[0]).toEqual({
			id: '1',
			type: 'text',
			role: 'assistant',
			content: 'Hello!',
			read: false,
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		});
	});

	it('can add an assistant code-diff message', () => {
		const assistantStore = useAssistantStore();

		const message: ChatRequest.MessageResponse = {
			type: 'code-diff',
			role: 'assistant',
			description: 'Here is the suggested code change',
			codeDiff: 'diff --git a/file1 b/file2',
			suggestionId: '1',
			solution_count: 1,
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		};
		assistantStore.addAssistantMessages([message], '1');
		expect(assistantStore.chatMessages.length).toBe(1);
		expect(assistantStore.chatMessages[0]).toEqual({
			id: '1',
			type: 'code-diff',
			role: 'assistant',
			description: 'Here is the suggested code change',
			codeDiff: 'diff --git a/file1 b/file2',
			suggestionId: '1',
			read: false,
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		});
	});

	it('can add an assistant summary message', () => {
		const assistantStore = useAssistantStore();

		const message: ChatRequest.MessageResponse = {
			type: 'summary',
			role: 'assistant',
			title: 'Summary',
			content: 'Here is the summary',
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		};
		assistantStore.addAssistantMessages([message], '1');
		expect(assistantStore.chatMessages.length).toBe(1);
		expect(assistantStore.chatMessages[0]).toEqual({
			id: '1',
			type: 'block',
			role: 'assistant',
			title: 'Summary',
			content: 'Here is the summary',
			read: false,
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		});
	});

	it('can add an agent suggestion message', () => {
		const assistantStore = useAssistantStore();

		const message: ChatRequest.MessageResponse = {
			type: 'agent-suggestion',
			role: 'assistant',
			title: 'A Suggestion',
			text: 'Here is a suggestion',
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		};
		assistantStore.addAssistantMessages([message], '1');
		expect(assistantStore.chatMessages.length).toBe(1);
		expect(assistantStore.chatMessages[0]).toEqual({
			id: '1',
			type: 'block',
			role: 'assistant',
			title: 'A Suggestion',
			content: 'Here is a suggestion',
			read: false,
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		});
	});

	it('should reset assistant chat session', () => {
		const assistantStore = useAssistantStore();

		const message: ChatRequest.MessageResponse = {
			type: 'message',
			role: 'assistant',
			text: 'Hello!',
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		};
		assistantStore.addAssistantMessages([message], '1');
		expect(assistantStore.chatMessages.length).toBe(1);

		assistantStore.resetAssistantChat();
		expect(assistantStore.chatMessages).toEqual([]);
		expect(assistantStore.currentSessionId).toBeUndefined();
	});

	it('should not show assistant for control experiment group', () => {
		const assistantStore = useAssistantStore();

		mockPostHogVariant('control');
		setAssistantEnabled(true);
		expect(assistantStore.isAssistantEnabled).toBe(false);
		expect(assistantStore.canShowAssistant).toBe(false);
		expect(assistantStore.canShowAssistantButtonsOnCanvas).toBe(false);
	});

	it('should not show assistant if disabled in settings', () => {
		const assistantStore = useAssistantStore();

		mockPostHogVariant('variant');
		setAssistantEnabled(false);
		expect(assistantStore.isAssistantEnabled).toBe(false);
		expect(assistantStore.canShowAssistant).toBe(false);
		expect(assistantStore.canShowAssistantButtonsOnCanvas).toBe(false);
	});

	it('should show assistant if all conditions are met', () => {
		const assistantStore = useAssistantStore();

		setAssistantEnabled(true);
		mockPostHogVariant('variant');
		expect(assistantStore.isAssistantEnabled).toBe(true);
		expect(assistantStore.canShowAssistant).toBe(true);
		expect(assistantStore.canShowAssistantButtonsOnCanvas).toBe(true);
	});

	it('should not show assistant if on a settings page', () => {
		currentRouteName = VIEWS.SSO_SETTINGS;
		const assistantStore = useAssistantStore();

		setAssistantEnabled(true);
		mockPostHogVariant('variant');
		expect(assistantStore.isAssistantEnabled).toBe(true);
		expect(assistantStore.canShowAssistant).toBe(false);
		expect(assistantStore.canShowAssistantButtonsOnCanvas).toBe(false);
	});

	[VIEWS.PROJECTS_CREDENTIALS, VIEWS.TEMPLATE_SETUP, VIEWS.CREDENTIALS].forEach((view) => {
		it(`should show assistant if on ${view} page`, () => {
			currentRouteName = VIEWS.PROJECTS_CREDENTIALS;
			const assistantStore = useAssistantStore();

			setAssistantEnabled(true);
			mockPostHogVariant('variant');
			expect(assistantStore.isAssistantEnabled).toBe(true);
			expect(assistantStore.canShowAssistant).toBe(true);
			expect(assistantStore.canShowAssistantButtonsOnCanvas).toBe(false);
		});
	});

	it('should initialize assistant chat session on node error', async () => {
		const context: ChatRequest.ErrorContext = {
			error: {
				description: '',
				message: 'Hey',
				name: 'NodeOperationError',
			},
			node: {
				id: '1',
				type: 'n8n-nodes-base.stopAndError',
				typeVersion: 1,
				name: 'Stop and Error',
				position: [250, 250],
				parameters: {},
			},
		};
		const assistantStore = useAssistantStore();
		await assistantStore.initErrorHelper(context);
		expect(apiSpy).toHaveBeenCalled();
	});

	it('should call telemetry for opening assistant with error', async () => {
		const context: ChatRequest.ErrorContext = {
			error: {
				description: '',
				message: 'Hey',
				name: 'NodeOperationError',
			},
			node: {
				id: '1',
				type: 'n8n-nodes-base.stopAndError',
				typeVersion: 1,
				name: 'Stop and Error',
				position: [250, 250],
				parameters: {},
			},
		};
		const mockSessionId = 'test';

		const assistantStore = useAssistantStore();
		apiSpy.mockImplementation((_ctx, _payload, onMessage) => {
			onMessage({
				messages: [],
				sessionId: mockSessionId,
			});
		});

		await assistantStore.initErrorHelper(context);
		expect(apiSpy).toHaveBeenCalled();
		expect(assistantStore.currentSessionId).toEqual(mockSessionId);

		assistantStore.trackUserOpenedAssistant({
			task: 'error',
			source: 'error',
			has_existing_session: true,
		});
		expect(track).toHaveBeenCalledWith(
			'Assistant session started',
			{
				chat_session_id: 'test',
				node_type: 'n8n-nodes-base.stopAndError',
				task: 'error',
				credential_type: undefined,
			},
			{
				withPostHog: true,
			},
		);

		expect(track).toHaveBeenCalledWith('User opened assistant', {
			chat_session_id: 'test',
			error: {
				description: '',
				message: 'Hey',
				name: 'NodeOperationError',
			},
			has_existing_session: true,
			node_type: 'n8n-nodes-base.stopAndError',
			source: 'error',
			task: 'error',
			workflow_id: '__EMPTY__',
		});
	});
});
