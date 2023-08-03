import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import { STORES } from '@/constants';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import SettingsExternalSecrets from '@/views/SettingsExternalSecrets.vue';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { createComponentRenderer } from '@/__tests__/render';

let pinia: ReturnType<typeof createTestingPinia>;
let externalSecretsStore: ReturnType<typeof useExternalSecretsStore>;

const renderComponent = createComponentRenderer(SettingsExternalSecrets);

describe('SettingsExternalSecrets', () => {
	beforeEach(() => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});
		externalSecretsStore = useExternalSecretsStore(pinia);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render paywall state when there is no license', () => {
		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('external-secrets-content-licensed')).not.toBeInTheDocument();
		expect(getByTestId('external-secrets-content-unlicensed')).toBeInTheDocument();
	});

	it('should render licensed content', () => {
		vi.spyOn(externalSecretsStore, 'isEnterpriseExternalSecretsEnabled', 'get').mockReturnValue(
			true,
		);

		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(getByTestId('external-secrets-content-licensed')).toBeInTheDocument();
		expect(queryByTestId('external-secrets-content-unlicensed')).not.toBeInTheDocument();
	});
});
