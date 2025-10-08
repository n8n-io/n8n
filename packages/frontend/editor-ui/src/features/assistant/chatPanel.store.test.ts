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
import { useUIStore } from '@/stores/ui.store';
import { useAssistantStore } from '@/features/assistant/assistant.store';
import { useBuilderStore } from './builder.store';
import { ASSISTANT_ENABLED_VIEWS, BUILDER_ENABLED_VIEWS } from './constants';
import { VIEWS } from '@/constants';
import { reactive } from 'vue';
import { mockedStore } from '@/__tests__/utils';
import type { ICredentialType } from 'n8n-workflow';
import type { ChatRequest } from '@/features/assistant/assistant.types';
import type { ChatUI } from '@n8n/design-system/types/assistant';

// Mock vue-router
const mockRoute = reactive({ name: VIEWS.WORKFLOW });
vi.mock('vue-router', () => ({
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
});
