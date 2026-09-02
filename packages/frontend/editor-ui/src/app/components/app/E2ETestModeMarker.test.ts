import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { defaultSettings } from '@/__tests__/defaults';
import { useSettingsStore } from '@n8n/stores/settings.store';
import E2ETestModeMarker from './E2ETestModeMarker.vue';

const renderComponent = createComponentRenderer(E2ETestModeMarker);

let settingsStore: MockedStore<typeof useSettingsStore>;
let pinia: ReturnType<typeof createTestingPinia>;

describe('E2ETestModeMarker', () => {
	beforeEach(() => {
		pinia = createTestingPinia();
		settingsStore = mockedStore(useSettingsStore);
		settingsStore.settings = defaultSettings;
	});

	it('renders the marker when the instance runs in E2E test mode', () => {
		settingsStore.settings = { ...defaultSettings, inE2ETests: true };

		const { queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('e2e-test-mode-marker')).toBeInTheDocument();
	});

	it('renders nothing otherwise', () => {
		const { queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('e2e-test-mode-marker')).not.toBeInTheDocument();
	});
});
