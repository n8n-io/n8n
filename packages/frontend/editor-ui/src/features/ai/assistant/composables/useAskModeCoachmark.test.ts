import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reactive } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import { mockedStore } from '@/__tests__/utils';
import { useAskModeCoachmark, ASK_MODE_COACHMARK_KEY } from './useAskModeCoachmark';
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

describe('useAskModeCoachmark', () => {
	let chatPanelStateStore: ReturnType<typeof useChatPanelStateStore>;
	let builderStore: ReturnType<typeof mockedStore<typeof useBuilderStore>>;
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;

	beforeEach(() => {
		vi.clearAllMocks();

		setActivePinia(
			createTestingPinia({
				createSpy: vi.fn,
				stubActions: false,
			}),
		);

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
	});

	describe('shouldShowCoachmark', () => {
		it('should return true when all conditions are met', () => {
			chatPanelStateStore.isOpen = true;
			chatPanelStateStore.activeMode = 'assistant';
			chatPanelStateStore.showCoachmark = true;

			const { shouldShowCoachmark } = useAskModeCoachmark();

			expect(shouldShowCoachmark.value).toBe(true);
		});

		it('should return false when panel is closed', () => {
			chatPanelStateStore.isOpen = false;
			chatPanelStateStore.activeMode = 'assistant';
			chatPanelStateStore.showCoachmark = true;

			const { shouldShowCoachmark } = useAskModeCoachmark();

			expect(shouldShowCoachmark.value).toBe(false);
		});

		it('should return false when in Build mode', () => {
			chatPanelStateStore.isOpen = true;
			chatPanelStateStore.activeMode = 'builder';
			chatPanelStateStore.showCoachmark = true;

			const { shouldShowCoachmark } = useAskModeCoachmark();

			expect(shouldShowCoachmark.value).toBe(false);
		});

		it('should return false when showCoachmark is false (e.g. via switcher)', () => {
			chatPanelStateStore.isOpen = true;
			chatPanelStateStore.activeMode = 'assistant';
			chatPanelStateStore.showCoachmark = false;

			const { shouldShowCoachmark } = useAskModeCoachmark();

			expect(shouldShowCoachmark.value).toBe(false);
		});

		it('should return false when coachmark was already dismissed', () => {
			chatPanelStateStore.isOpen = true;
			chatPanelStateStore.activeMode = 'assistant';
			chatPanelStateStore.showCoachmark = true;
			mockIsCalloutDismissed.mockReturnValue(true);

			const { shouldShowCoachmark } = useAskModeCoachmark();

			expect(shouldShowCoachmark.value).toBe(false);
			expect(mockIsCalloutDismissed).toHaveBeenCalledWith(ASK_MODE_COACHMARK_KEY);
		});

		it('should return false when toggle modes not available', () => {
			chatPanelStateStore.isOpen = true;
			chatPanelStateStore.activeMode = 'assistant';
			chatPanelStateStore.showCoachmark = true;
			builderStore.isAIBuilderEnabled = false;

			const { shouldShowCoachmark } = useAskModeCoachmark();

			expect(shouldShowCoachmark.value).toBe(false);
		});
	});

	describe('canToggleModes', () => {
		it('should return true when both modes are enabled and on builder view', () => {
			const { canToggleModes } = useAskModeCoachmark();

			expect(canToggleModes.value).toBe(true);
		});

		it('should return false when conditions not met', () => {
			mockRoute.name = VIEWS.HOMEPAGE;

			const { canToggleModes } = useAskModeCoachmark();

			expect(canToggleModes.value).toBe(false);
		});
	});

	describe('onDismissCoachmark', () => {
		it('should call dismissCallout with the correct key', async () => {
			const { onDismissCoachmark } = useAskModeCoachmark();

			await onDismissCoachmark();

			expect(mockDismissCallout).toHaveBeenCalledWith(ASK_MODE_COACHMARK_KEY);
		});
	});
});
