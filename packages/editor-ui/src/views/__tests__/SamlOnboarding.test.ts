import { PiniaVuePlugin } from 'pinia';
import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import { faker } from '@faker-js/faker';
import SamlOnboarding from '@/views/SamlOnboarding.vue';
import { useSSOStore } from '@/stores/sso';
import { STORES } from '@/constants';
import { SETTINGS_STORE_DEFAULT_STATE, waitAllPromises } from '@/utils/testUtils';
import { i18nInstance } from '@/plugins/i18n';

let pinia: ReturnType<typeof createTestingPinia>;
let ssoStore: ReturnType<typeof useSSOStore>;

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) =>
	render(
		SamlOnboarding,
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

describe('SamlOnboarding', () => {
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

	it('should render', () => {
		const { container } = renderComponent();

		expect(container).not.toBeEmptyDOMElement();
	});
});
