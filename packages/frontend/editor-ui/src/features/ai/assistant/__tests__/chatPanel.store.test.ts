import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { VIEWS } from '@/app/constants';
import { useChatPanelStore } from '../chatPanel.store';
import { useChatPanelStateStore } from '../chatPanelState.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useBuilderStore } from '../builder.store';
import { mockedStore } from '@/__tests__/utils';
import type router from 'vue-router';

// Mock vue-router with controllable route name
const mockRouteName = { value: VIEWS.WORKFLOW as string | undefined };
vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<typeof router>();
	return {
		...actual,
		useRoute: () => ({
			get name() {
				return mockRouteName.value;
			},
		}),
	};
});

// Mock i18n — both the named `i18n` export and the `useI18n` composable
vi.mock('@n8n/i18n', () => ({
	i18n: {
		baseText: (key: string) => key,
	},
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

describe('chatPanel.store', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		mockRouteName.value = VIEWS.WORKFLOW;
	});

	describe('resolveMode (tested via switchMode)', () => {
		test('redirects builder to instance-ai when instance-ai module is active', () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.isAiAssistantOrBuilderEnabled = true;
			settingsStore.isModuleActive = vi.fn((name: string) => name === 'instance-ai');

			const posthogStore = mockedStore(usePostHog);
			posthogStore.isFeatureEnabled = vi.fn().mockReturnValue(false);

			const builderStore = mockedStore(useBuilderStore);
			builderStore.isAIBuilderEnabled = true;

			const chatPanelStateStore = mockedStore(useChatPanelStateStore);
			chatPanelStateStore.isOpen = true;

			const store = useChatPanelStore();
			store.switchMode('builder');

			expect(chatPanelStateStore.activeMode).toBe('instance-ai');
		});

		test('keeps builder when instance-ai module is not active', () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.isAiAssistantOrBuilderEnabled = true;
			settingsStore.isModuleActive = vi.fn().mockReturnValue(false);

			const posthogStore = mockedStore(usePostHog);
			posthogStore.isFeatureEnabled = vi.fn().mockReturnValue(false);

			const builderStore = mockedStore(useBuilderStore);
			builderStore.isAIBuilderEnabled = false;

			const chatPanelStateStore = mockedStore(useChatPanelStateStore);
			chatPanelStateStore.isOpen = true;

			const store = useChatPanelStore();
			store.switchMode('builder');

			expect(chatPanelStateStore.activeMode).toBe('builder');
		});
	});

	describe('canShowAiButtonOnCanvas', () => {
		test('returns true when instance-ai module is active on a canvas view', () => {
			const settingsStore = mockedStore(useSettingsStore);
			// Even if assistant/builder are disabled, instance-ai alone should suffice
			settingsStore.isAiAssistantOrBuilderEnabled = false;
			settingsStore.isModuleActive = vi.fn((name: string) => name === 'instance-ai');

			const posthogStore = mockedStore(usePostHog);
			posthogStore.isFeatureEnabled = vi.fn().mockReturnValue(false);

			mockRouteName.value = VIEWS.WORKFLOW;

			const store = useChatPanelStore();

			expect(store.canShowAiButtonOnCanvas).toBe(true);
		});
	});

	describe('isInstanceAiModeActive', () => {
		test('returns true when activeMode is instance-ai', () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.isAiAssistantOrBuilderEnabled = true;
			settingsStore.isModuleActive = vi.fn((name: string) => name === 'instance-ai');

			const posthogStore = mockedStore(usePostHog);
			posthogStore.isFeatureEnabled = vi.fn().mockReturnValue(false);

			const builderStore = mockedStore(useBuilderStore);
			builderStore.isAIBuilderEnabled = true;

			const chatPanelStateStore = mockedStore(useChatPanelStateStore);
			chatPanelStateStore.isOpen = true;

			const store = useChatPanelStore();
			store.switchMode('builder');

			expect(store.isInstanceAiModeActive).toBe(true);
		});
	});
});
