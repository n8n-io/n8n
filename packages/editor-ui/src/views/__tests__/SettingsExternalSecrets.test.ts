import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import { EnterpriseEditionFeature, STORES } from '@/constants';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import SettingsExternalSecrets from '@/views/SettingsExternalSecrets.vue';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { createComponentRenderer } from '@/__tests__/render';
import { useSettingsStore } from '@/stores';
import { setupServer } from '@/__tests__/server';

let pinia: ReturnType<typeof createTestingPinia>;
let externalSecretsStore: ReturnType<typeof useExternalSecretsStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let server: ReturnType<typeof setupServer>;

const renderComponent = createComponentRenderer(SettingsExternalSecrets);

describe('SettingsExternalSecrets', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});
		externalSecretsStore = useExternalSecretsStore(pinia);
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

		expect(queryByTestId('external-secrets-content-licensed')).not.toBeInTheDocument();
		expect(getByTestId('external-secrets-content-unlicensed')).toBeInTheDocument();
	});

	it('should render licensed content', () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = true;

		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(getByTestId('external-secrets-content-licensed')).toBeInTheDocument();
		expect(queryByTestId('external-secrets-content-unlicensed')).not.toBeInTheDocument();
	});
});
