import { computed, reactive, ref } from 'vue';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { defaultSettings } from '@/__tests__/defaults';
import { useSettingsStore } from '@/app/stores/settings.store';
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

	it('hides the command bar when canvas-only mode arrives after mount', async () => {
		const { queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('command-bar-stub')).toBeInTheDocument();

		settingsStore.settings = { ...defaultSettings, canvasOnly: true };

		await waitFor(() => {
			expect(queryByTestId('command-bar-stub')).not.toBeInTheDocument();
		});
	});
});
