import { createTestingPinia } from '@pinia/testing';
import merge from 'lodash/merge';
import { EnterpriseEditionFeature, EXTERNAL_SECRETS_PROVIDER_MODAL_KEY } from '@/app/constants';
import { isModalPrefetchEnabled } from '@/__tests__/prefetchModals';

vi.mock('@/app/composables/usePrefetchModals');
import { STORES } from '@n8n/stores';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import SettingsExternalSecrets from './SettingsExternalSecrets.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { setupServer } from '@/__tests__/server';

let pinia: ReturnType<typeof createTestingPinia>;
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

	it('prefetches the provider modal only with a license', () => {
		renderComponent({ pinia });
		expect(isModalPrefetchEnabled(EXTERNAL_SECRETS_PROVIDER_MODAL_KEY)).toBe(false);

		settingsStore.settings.enterprise[EnterpriseEditionFeature.ExternalSecrets] = true;
		expect(isModalPrefetchEnabled(EXTERNAL_SECRETS_PROVIDER_MODAL_KEY)).toBe(true);
	});
});
