import { createTestingPinia } from '@pinia/testing';
import merge from 'lodash/merge';
import SSOLogin from './SSOLogin.vue';
import { STORES } from '@n8n/stores';
import { useSSOStore } from '../sso.store';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { afterEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';

let pinia: ReturnType<typeof createTestingPinia>;
let ssoStore: ReturnType<typeof useSSOStore>;

const renderComponent = createComponentRenderer(SSOLogin, {
	global: {
		stubs: {
			N8nButton: {
				template: '<button data-test-id="sso-button"></button>',
			},
		},
	},
});

describe('SSOLogin', () => {
	beforeEach(() => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});
		ssoStore = useSSOStore();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should not render button if conditions are not met', () => {
		const { queryByRole } = renderComponent({ pinia });
		expect(queryByRole('button')).not.toBeInTheDocument();
	});

	it('should render button if the store returns true for the conditions', () => {
		vi.spyOn(ssoStore, 'showSsoLoginButton', 'get').mockReturnValue(true);
		const { queryByRole } = renderComponent({ pinia });
		expect(queryByRole('button')).toBeInTheDocument();
	});
});
