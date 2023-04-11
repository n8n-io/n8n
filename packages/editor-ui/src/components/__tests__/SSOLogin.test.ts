import { PiniaVuePlugin } from 'pinia';
import { render } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import SSOLogin from '@/components/SSOLogin.vue';
import { STORES } from '@/constants';
import { useSSOStore } from '@/stores/sso';

let pinia: ReturnType<typeof createTestingPinia>;
let ssoStore: ReturnType<typeof useSSOStore>;

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) =>
	render(
		SSOLogin,
		merge(
			{
				pinia,
				stubs: {
					'n8n-button': {
						template: '<button data-testid="sso-button"></button>',
					},
				},
			},
			renderOptions,
		),
		(vue) => {
			vue.use(PiniaVuePlugin);
		},
	);

describe('SSOLogin', () => {
	beforeEach(() => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: {
						templates: {
							host: 'https://api.n8n.io/api/',
						},
						enterprise: {
							saml: true,
						},
					},
				},
			},
			stubActions: false,
		});
		ssoStore = useSSOStore(pinia);
	});

	it('should not render button if conditions are not met', () => {
		const { queryByRole } = renderComponent();
		expect(queryByRole('button')).not.toBeInTheDocument();
	});

	it('should render button if the store returns true for the conditions', () => {
		vi.spyOn(ssoStore, 'showSsoLoginButton', 'get').mockReturnValue(true);
		const { queryByRole } = renderComponent();
		expect(queryByRole('button')).toBeInTheDocument();
	});
});
