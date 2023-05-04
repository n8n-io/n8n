import { PiniaVuePlugin } from 'pinia';
import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import { faker } from '@faker-js/faker';
import SettingsSso from '@/views/SettingsSso.vue';
import { useSSOStore } from '@/stores/sso';
import { STORES } from '@/constants';
import { SETTINGS_STORE_DEFAULT_STATE, waitAllPromises } from '@/__tests__/utils';
import { i18nInstance } from '@/plugins/i18n';
import type { SamlPreferences, SamlPreferencesExtractedData } from '@/Interface';

let pinia: ReturnType<typeof createTestingPinia>;
let ssoStore: ReturnType<typeof useSSOStore>;

const samlConfig: SamlPreferences & SamlPreferencesExtractedData = {
	metadata: '<?xml version="1.0"?>',
	entityID: faker.internet.url(),
	returnUrl: faker.internet.url(),
};

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) =>
	render(
		SettingsSso,
		merge(
			{
				pinia,
				i18n: i18nInstance,
			},
			renderOptions,
		),
		(vue) => {
			vue.use(PiniaVuePlugin);
		},
	);

describe('SettingsSso', () => {
	beforeEach(() => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});
		ssoStore = useSSOStore(pinia);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render paywall state when there is no license', () => {
		const { getByTestId, queryByTestId, queryByRole } = renderComponent();

		expect(queryByRole('checkbox')).not.toBeInTheDocument();
		expect(queryByTestId('sso-content-licensed')).not.toBeInTheDocument();
		expect(getByTestId('sso-content-unlicensed')).toBeInTheDocument();
	});

	it('should render licensed content', () => {
		vi.spyOn(ssoStore, 'isEnterpriseSamlEnabled', 'get').mockReturnValue(true);

		const { getByTestId, queryByTestId, getByRole } = renderComponent();

		expect(getByRole('checkbox')).toBeInTheDocument();
		expect(getByTestId('sso-content-licensed')).toBeInTheDocument();
		expect(queryByTestId('sso-content-unlicensed')).not.toBeInTheDocument();
	});

	it('should enable activation checkbox and test button if data is already saved', async () => {
		vi.spyOn(ssoStore, 'isEnterpriseSamlEnabled', 'get').mockReturnValue(true);
		vi.spyOn(ssoStore, 'getSamlConfig').mockResolvedValue(samlConfig);

		const { getByRole, getByTestId } = renderComponent();
		await waitAllPromises();

		expect(getByRole('checkbox')).toBeEnabled();
		expect(getByTestId('sso-test')).toBeEnabled();
	});

	it('should enable activation checkbox after data is saved', async () => {
		vi.spyOn(ssoStore, 'isEnterpriseSamlEnabled', 'get').mockReturnValue(true);

		const { getByRole, getAllByRole, getByTestId } = renderComponent();
		const checkbox = getByRole('checkbox');
		const btnSave = getByTestId('sso-save');
		const btnTest = getByTestId('sso-test');

		expect(checkbox).toBeDisabled();
		[btnSave, btnTest].forEach((el) => {
			expect(el).toBeDisabled();
		});

		await userEvent.type(
			getAllByRole('textbox').find((el) => el.getAttribute('name') === 'metadata')!,
			'<?xml version="1.0"?>',
		);

		expect(checkbox).toBeDisabled();
		expect(btnTest).toBeDisabled();
		expect(btnSave).toBeEnabled();

		const saveSpy = vi.spyOn(ssoStore, 'saveSamlConfig');
		const getSpy = vi.spyOn(ssoStore, 'getSamlConfig').mockResolvedValue(samlConfig);
		await userEvent.click(btnSave);

		expect(saveSpy).toHaveBeenCalled();
		expect(getSpy).toHaveBeenCalled();
		expect(checkbox).toBeEnabled();
		expect(btnTest).toBeEnabled();
		expect(btnSave).toBeEnabled();
	});
});
