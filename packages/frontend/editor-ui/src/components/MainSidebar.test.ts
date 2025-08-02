import { reactive } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { defaultSettings } from '@/__tests__/defaults';
import MainSidebar from '@/components/MainSidebar.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => reactive({}),
	RouterLink: vi.fn(),
}));

let renderComponent: ReturnType<typeof createComponentRenderer>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let uiStore: MockedStore<typeof useUIStore>;
let sourceControlStore: MockedStore<typeof useSourceControlStore>;

describe('MainSidebar', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(MainSidebar, {
			pinia: createTestingPinia(),
		});
		settingsStore = mockedStore(useSettingsStore);
		uiStore = mockedStore(useUIStore);
		sourceControlStore = mockedStore(useSourceControlStore);

		settingsStore.settings = defaultSettings;
	});

	it('renders the sidebar without error', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	test.each([
		[false, true, true],
		[true, false, false],
		[true, true, false],
		[false, false, false],
	])(
		'should render readonly tooltip when is opened %s and the environment is readonly %s',
		(sidebarMenuCollapsed, branchReadOnly, shouldRender) => {
			uiStore.sidebarMenuCollapsed = sidebarMenuCollapsed;
			sourceControlStore.preferences.branchReadOnly = branchReadOnly;

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('read-only-env-icon') !== null).toBe(shouldRender);
		},
	);
});
