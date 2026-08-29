import { computed, reactive, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { defaultSettings } from '@n8n/frontend-test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import AppCommandBar from './AppCommandBar.vue';

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn().mockReturnValue(true),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: () => reactive({ name: 'WorkflowView' }),
}));

vi.mock('@/features/shared/commandBar/composables/useCommandBar', () => ({
	useCommandBar: () => ({
		initialize: vi.fn(),
		items: computed(() => []),
		placeholder: computed(() => ''),
		context: computed(() => undefined),
		isLoading: ref(false),
		onCommandBarChange: vi.fn(),
		onCommandBarNavigateTo: vi.fn(),
	}),
}));

const renderComponent = createComponentRenderer(AppCommandBar, {
	global: {
		stubs: {
			N8nCommandBar: { template: '<div data-test-id="command-bar-stub" />' },
		},
	},
});

let settingsStore: MockedStore<typeof useSettingsStore>;
let pinia: ReturnType<typeof createTestingPinia>;

describe('AppCommandBar', () => {
	beforeEach(() => {
		pinia = createTestingPinia();
		settingsStore = mockedStore(useSettingsStore);
		settingsStore.settings = defaultSettings;
	});

	it('renders the command bar by default', () => {
		const { queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('command-bar-stub')).toBeInTheDocument();
	});

	it('does not render the command bar in canvas-only mode', () => {
		settingsStore.settings = { ...defaultSettings, canvasOnly: true };

		const { queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('command-bar-stub')).not.toBeInTheDocument();
	});
});
