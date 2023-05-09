import { PiniaVuePlugin } from 'pinia';
import { render } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import type { IN8nUISettings } from 'n8n-workflow';
import { STORES } from '@/constants';
import { SETTINGS_STORE_DEFAULT_STATE, waitAllPromises } from '@/__tests__/utils';
import { i18n } from '@/plugins/i18n';
import SettingsPersonalView from '@/views/SettingsPersonalView.vue';
import { useSettingsStore } from '@/stores';
import { useUsersStore } from '@/stores/users.store';

let pinia: ReturnType<typeof createTestingPinia>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let usersStore: ReturnType<typeof useUsersStore>;

const DEFAULT_SETTINGS: IN8nUISettings = SETTINGS_STORE_DEFAULT_STATE.settings;

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) =>
	render(
		SettingsPersonalView,
		merge(
			{
				pinia,
				i18n,
			},
			renderOptions,
		),
		(vue) => {
			vue.use(PiniaVuePlugin);
		},
	);

describe('SettingsPersonalView', () => {
	beforeEach(() => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: DEFAULT_SETTINGS,
				},
			},
		});
		settingsStore = useSettingsStore(pinia);
		usersStore = useUsersStore(pinia);

		vi.spyOn(usersStore, 'currentUser', 'get').mockReturnValue({
			id: '1',
			firstName: 'John',
			lastName: 'Doe',
			email: 'joh.doe@example.com',
			createdAt: Date().toString(),
			isOwner: true,
			isDefaultUser: false,
			isPendingUser: false,
			isPending: false,
		});
	});

	it('should enable email and pw change', async () => {
		const { getByTestId, getAllByRole } = renderComponent();
		await waitAllPromises();

		expect(getAllByRole('textbox').find((el) => el.getAttribute('type') === 'email')).toBeEnabled();
		expect(getByTestId('change-password-link')).toBeInTheDocument();
	});

	it('should disable email and pw change when SAML login is enabled', async () => {
		vi.spyOn(settingsStore, 'isSamlLoginEnabled', 'get').mockReturnValue(true);
		vi.spyOn(settingsStore, 'isDefaultAuthenticationSaml', 'get').mockReturnValue(true);

		const { queryByTestId, getAllByRole } = renderComponent();
		await waitAllPromises();

		expect(
			getAllByRole('textbox').find((el) => el.getAttribute('type') === 'email'),
		).toBeDisabled();
		expect(queryByTestId('change-password-link')).not.toBeInTheDocument();
	});
});
