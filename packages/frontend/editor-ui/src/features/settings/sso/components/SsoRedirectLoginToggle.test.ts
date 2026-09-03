import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import SsoRedirectLoginToggle from './SsoRedirectLoginToggle.vue';
import { useSSOStore } from '../sso.store';

const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

const renderComponent = createComponentRenderer(SsoRedirectLoginToggle);

describe('SsoRedirectLoginToggle', () => {
	let ssoStore: MockedStore<typeof useSSOStore>;

	beforeEach(() => {
		createTestingPinia();
		ssoStore = mockedStore(useSSOStore);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('persists the toggle through the store when changed', async () => {
		ssoStore.redirectLoginToSso = true;

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('sso-redirect-login-switch'));

		expect(ssoStore.toggleRedirectLoginToSso).toHaveBeenCalledWith(false);
	});

	it('is disabled when SSO is managed by env', () => {
		ssoStore.ssoManagedByEnv = true;

		const { getByTestId } = renderComponent();

		expect(getByTestId('sso-redirect-login-switch')).toBeDisabled();
	});

	it('shows an error toast when persisting the toggle fails', async () => {
		ssoStore.redirectLoginToSso = true;
		ssoStore.toggleRedirectLoginToSso.mockRejectedValueOnce(new Error('nope'));

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('sso-redirect-login-switch'));

		expect(showError).toHaveBeenCalled();
	});
});
