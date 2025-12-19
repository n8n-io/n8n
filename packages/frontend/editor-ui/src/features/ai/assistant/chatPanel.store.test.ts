import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import {
	useChatPanelStore,
	DEFAULT_CHAT_WIDTH,
	MIN_CHAT_WIDTH,
	MAX_CHAT_WIDTH,
} from './chatPanel.store';
import { useChatPanelStateStore } from './chatPanelState.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useBuilderStore } from './builder.store';
import { ASSISTANT_ENABLED_VIEWS, BUILDER_ENABLED_VIEWS } from './constants';
import { VIEWS } from '@/app/constants';
import { reactive, nextTick } from 'vue';
import { mockedStore } from '@/__tests__/utils';
import type { ICredentialType } from 'n8n-workflow';
import type { ChatRequest } from '@/features/ai/assistant/assistant.types';
import type { ChatUI } from '@n8n/design-system/types/assistant';

// Mock vue-router
const mockRoute = reactive({ name: VIEWS.WORKFLOW });
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => mockRoute,
}));

// Mock window.innerWidth
Object.defineProperty(window, 'innerWidth', {
	writable: true,
	configurable: true,
	value: 1920,
});

describe('chatPanel.store', () => {
	let chatPanelStore: ReturnType<typeof useChatPanelStore>;
	let chatPanelStateStore: ReturnType<typeof useChatPanelStateStore>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
	let assistantStore: ReturnType<typeof mockedStore<typeof useAssistantStore>>;
	let builderStore: ReturnType<typeof mockedStore<typeof useBuilderStore>>;

	beforeEach(() => {
		vi.clearAllTimers();
		vi.useFakeTimers();

		setActivePinia(
			createTestingPinia({
				createSpy: vi.fn,
				stubActions: false, // Don't stub actions so actual store logic runs
			}),
		);

		chatPanelStateStore = useChatPanelStateStore();
		uiStore = mockedStore(useUIStore);
		assistantStore = mockedStore(useAssistantStore);
		builderStore = mockedStore(useBuilderStore);

		// Reset to default route
		mockRoute.name = VIEWS.WORKFLOW;

		// Mock store methods
		assistantStore.initCredHelp = vi.fn().mockResolvedValue(undefined);
		assistantStore.initErrorHelper = vi.fn().mockResolvedValue(undefined);
		assistantStore.resetAssistantChat = vi.fn();
		assistantStore.isSessionEnded = false;
		assistantStore.chatMessages = [];

		builderStore.fetchBuilderCredits = vi.fn().mockResolvedValue(undefined);
		builderStore.loadSessions = vi.fn().mockResolvedValue(undefined);
		builderStore.resetBuilderChat = vi.fn();
		builderStore.chatMessages = [];

		uiStore.appGridDimensions = { width: 1920, height: 1080 };

		// Initialize chatPanelStore after all mocks are set up
		chatPanelStore = useChatPanelStore();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe('initialization', () => {
		it('should initialize with correct default values', () => {
			expect(chatPanelStore.isOpen).toBe(false);
			expect(chatPanelStore.width).toBe(DEFAULT_CHAT_WIDTH);
			expect(chatPanelStore.activeMode).toBe('builder');
			expect(chatPanelStore.isAssistantModeActive).toBe(false);
			expect(chatPanelStore.isBuilderModeActive).toBe(true);
		});

		it('should expose constants', () => {
			expect(chatPanelStore.DEFAULT_CHAT_WIDTH).toBe(DEFAULT_CHAT_WIDTH);
			expect(chatPanelStore.MIN_CHAT_WIDTH).toBe(MIN_CHAT_WIDTH);
			expect(chatPanelStore.MAX_CHAT_WIDTH).toBe(MAX_CHAT_WIDTH);
		});
	});

	describe('open', () => {
		it('should open panel in builder mode', async () => {
			mockRoute.name = BUILDER_ENABLED_VIEWS[0];

			await chatPanelStore.open({ mode: 'builder' });

			expect(chatPanelStateStore.isOpen).toBe(true);
			expect(chatPanelStateStore.activeMode).toBe('builder');
			expect(builderStore.fetchBuilderCredits).toHaveBeenCalled();
			expect(builderStore.loadSessions).toHaveBeenCalled();
			expect(uiStore.appGridDimensions.width).toBe(window.innerWidth - DEFAULT_CHAT_WIDTH);
		});

		it('should open panel in assistant mode', async () => {
			mockRoute.name = ASSISTANT_ENABLED_VIEWS[0];
			assistantStore.chatMessages = [
				{
					id: '1',
					role: 'user',
					type: 'text',
					content: 'test',
					read: false,
				} as ChatUI.AssistantMessage,
			];

			await chatPanelStore.open({ mode: 'assistant' });

			expect(chatPanelStateStore.isOpen).toBe(true);
			expect(chatPanelStateStore.activeMode).toBe('assistant');
			expect(assistantStore.chatMessages[0].read).toBe(true);
		});

		it('should close panel if mode is not enabled in current view', async () => {
			mockRoute.name = VIEWS.HOMEPAGE; // Not in BUILDER_ENABLED_VIEWS

			await chatPanelStore.open({ mode: 'builder' });

			expect(chatPanelStateStore.isOpen).toBe(false);
		});

		it('should not change mode if no mode option provided', async () => {
			mockRoute.name = BUILDER_ENABLED_VIEWS[0];
			chatPanelStateStore.activeMode = 'builder';

			await chatPanelStore.open();

			expect(chatPanelStateStore.activeMode).toBe('builder');
		});

		it('should not fetch credits or load sessions when streaming is in progress', async () => {
			mockRoute.name = BUILDER_ENABLED_VIEWS[0];
			builderStore.streaming = true;

			await chatPanelStore.open({ mode: 'builder' });

			expect(chatPanelStateStore.isOpen).toBe(true);
			expect(builderStore.fetchBuilderCredits).not.toHaveBeenCalled();
			expect(builderStore.loadSessions).not.toHaveBeenCalled();
		});

		it('should not fetch credits or load sessions when messages already exist', async () => {
			mockRoute.name = BUILDER_ENABLED_VIEWS[0];
			builderStore.chatMessages = [
				{
					id: '1',
					role: 'user',
					type: 'text',
					content: 'test',
					read: true,
				} as ChatUI.AssistantMessage,
			];

			await chatPanelStore.open({ mode: 'builder' });

			expect(chatPanelStateStore.isOpen).toBe(true);
			expect(builderStore.fetchBuilderCredits).not.toHaveBeenCalled();
			expect(builderStore.loadSessions).not.toHaveBeenCalled();
		});
	});

	describe('close', () => {
		beforeEach(async () => {
			mockRoute.name = BUILDER_ENABLED_VIEWS[0];
			await chatPanelStore.open({ mode: 'builder' });
		});

		it('should close panel immediately', () => {
			chatPanelStore.close();

			expect(chatPanelStateStore.isOpen).toBe(false);
		});

		it('should reset UI grid dimensions after timeout', () => {
			chatPanelStore.close();

			vi.runAllTimers();

			expect(uiStore.appGridDimensions.width).toBe(window.innerWidth);
		});

		it('should reset builder chat after timeout', () => {
			chatPanelStore.close();

			vi.runAllTimers();

			expect(builderStore.resetBuilderChat).toHaveBeenCalled();
		});

		it('should reset assistant chat only if session ended', () => {
			assistantStore.isSessionEnded = true;

			chatPanelStore.close();
			vi.runAllTimers();

			expect(assistantStore.resetAssistantChat).toHaveBeenCalled();
		});

		it('should not reset assistant chat if session not ended', () => {
			assistantStore.isSessionEnded = false;

			chatPanelStore.close();
			vi.runAllTimers();

			expect(assistantStore.resetAssistantChat).not.toHaveBeenCalled();
		});

		it('should not reset builder chat when streaming is in progress', () => {
			builderStore.streaming = true;

			chatPanelStore.close();
			vi.runAllTimers();

			expect(builderStore.resetBuilderChat).not.toHaveBeenCalled();
		});
	});

	describe('toggle', () => {
		it('should open panel when closed', async () => {
			mockRoute.name = BUILDER_ENABLED_VIEWS[0];
			expect(chatPanelStateStore.isOpen).toBe(false);

			await chatPanelStore.toggle({ mode: 'builder' });

			expect(chatPanelStateStore.isOpen).toBe(true);
		});

		it('should close panel when open', async () => {
			mockRoute.name = BUILDER_ENABLED_VIEWS[0];
			await chatPanelStore.open({ mode: 'builder' });
			expect(chatPanelStateStore.isOpen).toBe(true);

			await chatPanelStore.toggle();

			expect(chatPanelStateStore.isOpen).toBe(false);
		});
	});

	describe('switchMode', () => {
		beforeEach(async () => {
			mockRoute.name = ASSISTANT_ENABLED_VIEWS[0]; // Supports both modes
			await chatPanelStore.open({ mode: 'builder' });
		});

		it('should switch from builder to assistant mode', () => {
			chatPanelStore.switchMode('assistant');

			expect(chatPanelStateStore.activeMode).toBe('assistant');
			expect(chatPanelStore.isAssistantModeActive).toBe(true);
			expect(chatPanelStore.isBuilderModeActive).toBe(false);
		});

		it('should switch from assistant to builder mode', () => {
			chatPanelStateStore.activeMode = 'assistant';

			chatPanelStore.switchMode('builder');

			expect(chatPanelStateStore.activeMode).toBe('builder');
			expect(chatPanelStore.isAssistantModeActive).toBe(false);
			expect(chatPanelStore.isBuilderModeActive).toBe(true);
		});

		it('should close panel if mode not enabled in current view', () => {
			mockRoute.name = VIEWS.HOMEPAGE; // Only supports assistant

			chatPanelStore.switchMode('builder');

			expect(chatPanelStateStore.isOpen).toBe(false);
		});
	});

	describe('updateWidth', () => {
		it('should update width within bounds', () => {
			chatPanelStore.updateWidth(410);

			expect(chatPanelStateStore.width).toBe(410);
		});

		it('should clamp width to MIN_CHAT_WIDTH', () => {
			chatPanelStore.updateWidth(200);

			expect(chatPanelStateStore.width).toBe(MIN_CHAT_WIDTH);
		});

		it('should clamp width to MAX_CHAT_WIDTH', () => {
			chatPanelStore.updateWidth(500);

			expect(chatPanelStateStore.width).toBe(MAX_CHAT_WIDTH);
		});

		it('should update UI grid dimensions when panel is open', async () => {
			mockRoute.name = BUILDER_ENABLED_VIEWS[0];
			await chatPanelStore.open({ mode: 'builder' });

			chatPanelStore.updateWidth(420);

			expect(uiStore.appGridDimensions.width).toBe(window.innerWidth - 420);
		});

		it('should not update UI grid dimensions when panel is closed', () => {
			const initialWidth = uiStore.appGridDimensions.width;

			chatPanelStore.updateWidth(420);

			expect(uiStore.appGridDimensions.width).toBe(initialWidth);
		});
	});

	describe('openWithCredHelp', () => {
		it('should initialize cred help and open in assistant mode', async () => {
			mockRoute.name = ASSISTANT_ENABLED_VIEWS[0];
			const credType: ICredentialType = {
				name: 'googleSheetsOAuth2Api',
				displayName: 'Google Sheets OAuth2 API',
				properties: [],
			};

			await chatPanelStore.openWithCredHelp(credType);

			expect(assistantStore.initCredHelp).toHaveBeenCalledWith(credType);
			expect(chatPanelStateStore.isOpen).toBe(true);
			expect(chatPanelStateStore.activeMode).toBe('assistant');
		});
	});

	describe('openWithErrorHelper', () => {
		it('should initialize error helper and open in assistant mode', async () => {
			mockRoute.name = ASSISTANT_ENABLED_VIEWS[0];
			const errorContext: ChatRequest.ErrorContext = {
				error: {
					name: 'TestError',
					message: 'test error',
				},
				node: {
					id: 'node-1',
					name: 'Test Node',
					type: 'n8n-nodes-base.test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			};

			await chatPanelStore.openWithErrorHelper(errorContext);

			expect(assistantStore.initErrorHelper).toHaveBeenCalledWith(errorContext);
			expect(chatPanelStateStore.isOpen).toBe(true);
			expect(chatPanelStateStore.activeMode).toBe('assistant');
		});
	});

	describe('computed properties', () => {
		it('should compute isAssistantModeActive correctly', () => {
			chatPanelStateStore.activeMode = 'assistant';
			expect(chatPanelStore.isAssistantModeActive).toBe(true);
			expect(chatPanelStore.isBuilderModeActive).toBe(false);
		});

		it('should compute isBuilderModeActive correctly', () => {
			chatPanelStateStore.activeMode = 'builder';
			expect(chatPanelStore.isBuilderModeActive).toBe(true);
			expect(chatPanelStore.isAssistantModeActive).toBe(false);
		});

		it('should expose isOpen as computed', () => {
			chatPanelStateStore.isOpen = true;
			expect(chatPanelStore.isOpen).toBe(true);

			chatPanelStateStore.isOpen = false;
			expect(chatPanelStore.isOpen).toBe(false);
		});

		it('should expose width as computed', () => {
			chatPanelStateStore.width = 420;
			expect(chatPanelStore.width).toBe(420);
		});

		it('should expose activeMode as computed', () => {
			chatPanelStateStore.activeMode = 'assistant';
			expect(chatPanelStore.activeMode).toBe('assistant');
		});
	});

	describe('route watcher - streaming state preservation', () => {
		it('should re-open panel when streaming is in progress and entering a builder-enabled view', async () => {
			// First set up initial state on a non-builder view
			mockRoute.name = VIEWS.EXECUTIONS;
			await nextTick();

			// Set up state: panel closed but streaming in progress
			chatPanelStateStore.isOpen = false;
			chatPanelStateStore.activeMode = 'builder';
			builderStore.streaming = true;

			// Simulate navigating to a builder-enabled view
			mockRoute.name = BUILDER_ENABLED_VIEWS[0];
			await nextTick();

			// Verify the panel was re-opened
			expect(chatPanelStateStore.isOpen).toBe(true);
		});

		it('should restore grid width when auto-reopening during streaming', async () => {
			// Open in builder mode to set grid width
			mockRoute.name = BUILDER_ENABLED_VIEWS[0];
			await chatPanelStore.open({ mode: 'builder' });

			// Simulate streaming and closing the panel (which resets grid width after timeout)
			builderStore.streaming = true;
			chatPanelStore.close();
			vi.runAllTimers();
			expect(uiStore.appGridDimensions.width).toBe(window.innerWidth);

			// Navigate away and back to a builder view while streaming
			mockRoute.name = VIEWS.EXECUTIONS;
			await nextTick();
			mockRoute.name = BUILDER_ENABLED_VIEWS[0];
			await nextTick();

			// Auto-reopen should restore the grid width offset for the chat
			expect(chatPanelStateStore.isOpen).toBe(true);
			expect(uiStore.appGridDimensions.width).toBe(window.innerWidth - DEFAULT_CHAT_WIDTH);
		});

		it('should not reset builder chat on route change when streaming is in progress', async () => {
			// Start with panel open in builder mode and streaming
			mockRoute.name = BUILDER_ENABLED_VIEWS[0];
			await chatPanelStore.open({ mode: 'builder' });
			builderStore.streaming = true;
			builderStore.resetBuilderChat.mockClear();

			// Navigate to executions view (not a builder view, triggers close)
			mockRoute.name = VIEWS.EXECUTIONS;
			await nextTick();

			// Run timers for the close timeout
			vi.runAllTimers();

			// Ensure resetBuilderChat was NOT called because streaming is in progress
			expect(builderStore.resetBuilderChat).not.toHaveBeenCalled();
		});

		it('should reset builder chat on route change when not streaming', async () => {
			// Start with panel open in builder mode but not streaming
			mockRoute.name = BUILDER_ENABLED_VIEWS[0];
			await chatPanelStore.open({ mode: 'builder' });
			builderStore.streaming = false;
			builderStore.resetBuilderChat.mockClear();

			// Navigate to executions view (not a builder view, triggers close)
			mockRoute.name = VIEWS.EXECUTIONS;
			await nextTick();

			// Run timers for the close timeout
			vi.runAllTimers();

			// Builder chat should be reset since we're not streaming
			expect(builderStore.resetBuilderChat).toHaveBeenCalled();
		});
	});
});
