import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import SsoRedirectLoginToggle from './SsoRedirectLoginToggle.vue';
import { useSSOStore } from '../sso.store';

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

	it('emits update:modelValue when toggled (does not persist directly)', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { modelValue: true } });

		await userEvent.click(getByTestId('sso-redirect-login-switch'));

		expect(emitted('update:modelValue')).toEqual([[false]]);
	});

	it('is disabled when SSO is managed by env', () => {
		ssoStore.ssoManagedByEnv = true;

		const { getByTestId } = renderComponent({ props: { modelValue: true } });

		expect(getByTestId('sso-redirect-login-switch')).toBeDisabled();
	});
});
