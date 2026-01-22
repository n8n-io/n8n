import { createTestingPinia } from '@pinia/testing';
import merge from 'lodash/merge';
import { EnterpriseEditionFeature } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import SettingsSecretsProviders from './SettingsSecretsProviders.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useSettingsStore } from '@/app/stores/settings.store';
import { setupServer } from '@/__tests__/server';
import { computed, ref } from 'vue';

const mockFetchProviders = vi.fn();
const mockFetchActiveConnections = vi.fn();
const mockIsEnterpriseEnabled = ref(false);
const mockProviders = ref([]);
const mockActiveProviders = ref([]);

vi.mock('../composables/useSecretsProviders', () => ({
	useSecretsProviders: () => ({
		providers: computed(() => mockProviders.value),
		activeProviders: computed(() => mockActiveProviders.value),
		fetchProviders: mockFetchProviders,
		fetchActiveConnections: mockFetchActiveConnections,
		isLoading: computed(() => false),
		isEnterpriseExternalSecretsEnabled: computed(() => mockIsEnterpriseEnabled.value),
		secrets: computed(() => ({})),
	}),
}));

let pinia: ReturnType<typeof createTestingPinia>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let server: ReturnType<typeof setupServer>;

const renderComponent = createComponentRenderer(SettingsSecretsProviders);

describe('SettingsSecretsProviders', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		mockFetchProviders.mockResolvedValue(undefined);
		mockFetchActiveConnections.mockResolvedValue(undefined);
		mockIsEnterpriseEnabled.value = false;
		mockProviders.value = [];
		mockActiveProviders.value = [];

		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});
		settingsStore = useSettingsStore();

		await settingsStore.getSettings();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render paywall state when there is no license', () => {
		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('secrets-provider-connections-content-licensed')).not.toBeInTheDocument();
		expect(getByTestId('secrets-provider-connections-content-unlicensed')).toBeInTheDocument();
	});

	it('should render licensed content', () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = true;
		mockIsEnterpriseEnabled.value = true;

		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(getByTestId('secrets-provider-connections-content-licensed')).toBeInTheDocument();
		expect(
			queryByTestId('secrets-provider-connections-content-unlicensed'),
		).not.toBeInTheDocument();
	});
});
