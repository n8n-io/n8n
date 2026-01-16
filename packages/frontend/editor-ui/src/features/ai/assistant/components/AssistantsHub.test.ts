import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reactive } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import AssistantsHub from './AssistantsHub.vue';
import { useChatPanelStateStore } from '@/features/ai/assistant/chatPanelState.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { VIEWS } from '@/app/constants';
import { BUILDER_ENABLED_VIEWS } from '../constants';

// Mock vue-router
const mockRoute = reactive({ name: VIEWS.WORKFLOW });
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => mockRoute,
}));

// Mock useCalloutHelpers
const mockIsCalloutDismissed = vi.fn();
const mockDismissCallout = vi.fn();
vi.mock('@/app/composables/useCalloutHelpers', () => ({
	useCalloutHelpers: () => ({
		isCalloutDismissed: mockIsCalloutDismissed,
		dismissCallout: mockDismissCallout,
	}),
}));

// Mock child components to simplify testing
vi.mock('./Agent/AskAssistantBuild.vue', () => ({
	default: {
		name: 'AskAssistantBuild',
		template: '<div data-test-id="ask-assistant-build"><slot name="header" /></div>',
	},
}));

vi.mock('./Chat/AskAssistantChat.vue', () => ({
	default: {
		name: 'AskAssistantChat',
		template: '<div data-test-id="ask-assistant-chat"><slot name="header" /></div>',
	},
}));

vi.mock('./AskModeCoachmark.vue', () => ({
	default: {
		name: 'AskModeCoachmark',
		props: ['visible'],
		template: '<div data-test-id="ask-mode-coachmark" :data-visible="visible"><slot /></div>',
	},
}));

vi.mock('./HubSwitcher.vue', () => ({
	default: {
		name: 'HubSwitcher',
		template: '<div data-test-id="hub-switcher" />',
	},
}));

const renderComponent = createComponentRenderer(AssistantsHub);

describe('AssistantsHub', () => {
	let chatPanelStateStore: ReturnType<typeof useChatPanelStateStore>;
	let builderStore: ReturnType<typeof mockedStore<typeof useBuilderStore>>;
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		vi.clearAllMocks();

		pinia = createTestingPinia({
			createSpy: vi.fn,
			stubActions: false,
		});
		setActivePinia(pinia);

		chatPanelStateStore = useChatPanelStateStore();
		builderStore = mockedStore(useBuilderStore);
		settingsStore = mockedStore(useSettingsStore);

		// Default route to a builder-enabled view
		mockRoute.name = BUILDER_ENABLED_VIEWS[0];

		// Default mock implementations
		mockIsCalloutDismissed.mockReturnValue(false);
		mockDismissCallout.mockResolvedValue(undefined);

		// Default store states - both modes enabled
		settingsStore.isAiAssistantEnabled = true;
		builderStore.isAIBuilderEnabled = true;
		builderStore.chatMessages = [];

		// Mock builder store methods
		builderStore.fetchBuilderCredits = vi.fn().mockResolvedValue(undefined);
		builderStore.loadSessions = vi.fn().mockResolvedValue(undefined);
	});

	describe('rendering', () => {
		it('should render AskAssistantChat when in assistant mode', () => {
			chatPanelStateStore.isOpen = true;
			chatPanelStateStore.activeMode = 'assistant';

			const { container } = renderComponent({ pinia });

			expect(container.querySelector('[data-test-id="ask-assistant-chat"]')).toBeInTheDocument();
			expect(
				container.querySelector('[data-test-id="ask-assistant-build"]'),
			).not.toBeInTheDocument();
		});

		it('should render AskAssistantBuild when in builder mode', () => {
			chatPanelStateStore.isOpen = true;
			chatPanelStateStore.activeMode = 'builder';

			const { container } = renderComponent({ pinia });

			expect(container.querySelector('[data-test-id="ask-assistant-build"]')).toBeInTheDocument();
			expect(
				container.querySelector('[data-test-id="ask-assistant-chat"]'),
			).not.toBeInTheDocument();
		});

		it('should render HubSwitcher when both modes are available', () => {
			chatPanelStateStore.isOpen = true;
			chatPanelStateStore.activeMode = 'assistant';
			settingsStore.isAiAssistantEnabled = true;
			builderStore.isAIBuilderEnabled = true;

			const { container } = renderComponent({ pinia });

			expect(container.querySelector('[data-test-id="hub-switcher"]')).toBeInTheDocument();
		});

		it('should not render HubSwitcher when only one mode is available', () => {
			chatPanelStateStore.isOpen = true;
			chatPanelStateStore.activeMode = 'assistant';
			settingsStore.isAiAssistantEnabled = true;
			builderStore.isAIBuilderEnabled = false;

			const { container } = renderComponent({ pinia });

			expect(container.querySelector('[data-test-id="hub-switcher"]')).not.toBeInTheDocument();
		});
	});

	describe('coachmark integration', () => {
		it('should pass visible=true to coachmark when conditions are met', () => {
			chatPanelStateStore.isOpen = true;
			chatPanelStateStore.activeMode = 'assistant';
			chatPanelStateStore.openSource = 'ask_button';
			mockIsCalloutDismissed.mockReturnValue(false);

			const { container } = renderComponent({ pinia });

			const coachmark = container.querySelector('[data-test-id="ask-mode-coachmark"]');
			expect(coachmark).toBeInTheDocument();
			expect(coachmark?.getAttribute('data-visible')).toBe('true');
		});

		it('should pass visible=false to coachmark when opened via helper', () => {
			chatPanelStateStore.isOpen = true;
			chatPanelStateStore.activeMode = 'assistant';
			chatPanelStateStore.openSource = 'helper';
			mockIsCalloutDismissed.mockReturnValue(false);

			const { container } = renderComponent({ pinia });

			const coachmark = container.querySelector('[data-test-id="ask-mode-coachmark"]');
			expect(coachmark).toBeInTheDocument();
			expect(coachmark?.getAttribute('data-visible')).toBe('false');
		});
	});
});
