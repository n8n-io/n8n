import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { defaultSettings } from '@/__tests__/defaults';
import MainSidebar from '@/components/MainSidebar.vue';
import { useSettingsStore } from '@/stores/settings.store';

let renderComponent: ReturnType<typeof createComponentRenderer>;
let settingsStore: MockedStore<typeof useSettingsStore>;

describe('MainSidebar', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(MainSidebar, {
			pinia: createTestingPinia(),
		});
		settingsStore = mockedStore(useSettingsStore);

		settingsStore.settings = defaultSettings;
	});

	it('renders the sidebar without error', () => {
		expect(() => renderComponent()).not.toThrow();
	});
});
