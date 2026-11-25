import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useSettingsStore } from '@n8n/stores/settings.store';

import SettingsAuthenticationView from './SettingsAuthenticationView.vue';
import { useSSOStore } from '../sso.store';

const push = vi.fn();
const canUserAccessRouteByName = vi.fn<(name: string) => boolean>(() => true);

vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@/app/composables/useUserHelpers', () => ({
	useUserHelpers: () => ({ canUserAccessRouteByName }),
}));

const renderView = createComponentRenderer(SettingsAuthenticationView);

describe('SettingsAuthenticationView', () => {
	beforeEach(() => {
		createTestingPinia();
		push.mockClear();
		canUserAccessRouteByName.mockReset().mockReturnValue(true);
	});

	it('links to the docs section that covers SSO, LDAP and two-factor auth', () => {
		const { getByTestId } = renderView();

		expect(getByTestId('settings-page-header-docs')).toHaveAttribute(
			'href',
			'https://docs.n8n.io/administer/manage-users-and-access/verify-user-identity',
		);
	});

	it('lists SSO, LDAP and the two-factor requirement', () => {
		const { getByTestId } = renderView();

		expect(getByTestId('settings-authentication-sso-row')).toBeInTheDocument();
		expect(getByTestId('settings-authentication-ldap-row')).toBeInTheDocument();
		expect(getByTestId('settings-authentication-mfa-row')).toBeInTheDocument();
	});

	it('marks the active sign-in method and leaves the other on Configure', () => {
		const ssoStore = mockedStore(useSSOStore);
		ssoStore.isSamlLoginEnabled = true;
		ssoStore.isLdapLoginEnabled = false;

		const { getByTestId } = renderView();

		expect(getByTestId('settings-authentication-sso-row')).toHaveTextContent('Active');
		expect(getByTestId('settings-authentication-ldap-row')).toHaveTextContent('Configure');
	});

	it.each([
		[true, 'Enforced'],
		[false, 'Optional'],
	])('shows the two-factor policy as %s → "%s"', (enforced, expected) => {
		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.isMFAEnforced = enforced;

		const { getByTestId } = renderView();

		expect(getByTestId('settings-authentication-mfa-row')).toHaveTextContent(expected);
	});

	it('opens each page when its row is clicked', async () => {
		const { getByTestId } = renderView();

		await userEvent.click(getByTestId('settings-authentication-sso-row'));
		expect(push).toHaveBeenLastCalledWith({ name: 'SSoSettings' });

		await userEvent.click(getByTestId('settings-authentication-ldap-row'));
		expect(push).toHaveBeenLastCalledWith({ name: 'LdapSettings' });

		await userEvent.click(getByTestId('settings-authentication-mfa-row'));
		expect(push).toHaveBeenLastCalledWith({ name: 'SecuritySettings' });
	});

	it('hides rows the user cannot open', () => {
		canUserAccessRouteByName.mockImplementation((name) => name === 'SSoSettings');

		const { getByTestId, queryByTestId } = renderView();

		expect(getByTestId('settings-authentication-sso-row')).toBeInTheDocument();
		expect(queryByTestId('settings-authentication-ldap-row')).not.toBeInTheDocument();
		expect(queryByTestId('settings-authentication-requirements')).not.toBeInTheDocument();
	});
});
