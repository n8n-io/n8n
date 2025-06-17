import { createPinia, setActivePinia } from 'pinia';
import { useSSOStore } from '@/stores/sso.store';
import type { UserManagementAuthenticationMethod } from '@/Interface';

let ssoStore: ReturnType<typeof useSSOStore>;

describe('SSO store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		ssoStore = useSSOStore();
	});

	test.each([
		['saml', true, true, true],
		['saml', false, true, false],
		['saml', false, false, false],
		['saml', true, false, false],
		['email', true, true, false],
	])(
		'should check SSO login button availability when authenticationMethod is %s and enterprise feature is %s and sso login is set to %s',
		(authenticationMethod, saml, loginEnabled, expectation) => {
			ssoStore.initialize({
				authenticationMethod: authenticationMethod as UserManagementAuthenticationMethod,
				config: {
					saml: {
						loginEnabled,
					},
				},
				features: {
					saml,
					ldap: false,
					oidc: false,
				},
			});

			expect(ssoStore.showSsoLoginButton).toBe(expectation);
		},
	);
});
