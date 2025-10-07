import { createPinia, setActivePinia } from 'pinia';
import { useSSOStore, SupportedProtocols } from '@/features/sso/sso.store';
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

	describe('Protocol Selection Initialization', () => {
		beforeEach(() => {
			setActivePinia(createPinia());
			ssoStore = useSSOStore();
		});

		it('should initialize selectedAuthProtocol to OIDC when default authentication is OIDC', () => {
			// Initialize with OIDC as default authentication method
			ssoStore.initialize({
				authenticationMethod: 'oidc' as UserManagementAuthenticationMethod,
				config: {
					oidc: { loginEnabled: true },
				},
				features: {
					saml: false,
					ldap: false,
					oidc: true,
				},
			});

			// selectedAuthProtocol should be undefined initially
			expect(ssoStore.selectedAuthProtocol).toBeUndefined();

			// Call initializeSelectedProtocol
			ssoStore.initializeSelectedProtocol();

			// Should now be set to OIDC
			expect(ssoStore.selectedAuthProtocol).toBe(SupportedProtocols.OIDC);
		});

		it('should initialize selectedAuthProtocol to SAML when default authentication is SAML', () => {
			// Initialize with SAML as default authentication method
			ssoStore.initialize({
				authenticationMethod: 'saml' as UserManagementAuthenticationMethod,
				config: {
					saml: { loginEnabled: true },
				},
				features: {
					saml: true,
					ldap: false,
					oidc: false,
				},
			});

			// selectedAuthProtocol should be undefined initially
			expect(ssoStore.selectedAuthProtocol).toBeUndefined();

			// Call initializeSelectedProtocol
			ssoStore.initializeSelectedProtocol();

			// Should now be set to SAML
			expect(ssoStore.selectedAuthProtocol).toBe(SupportedProtocols.SAML);
		});

		it('should initialize selectedAuthProtocol to SAML when default authentication is email', () => {
			// Initialize with email as default authentication method
			ssoStore.initialize({
				authenticationMethod: 'email' as UserManagementAuthenticationMethod,
				config: {},
				features: {
					saml: true,
					ldap: false,
					oidc: true,
				},
			});

			// selectedAuthProtocol should be undefined initially
			expect(ssoStore.selectedAuthProtocol).toBeUndefined();

			// Call initializeSelectedProtocol
			ssoStore.initializeSelectedProtocol();

			// Should default to SAML when not OIDC
			expect(ssoStore.selectedAuthProtocol).toBe(SupportedProtocols.SAML);
		});

		it('should not reinitialize selectedAuthProtocol if already set', () => {
			// Initialize with SAML as default authentication method
			ssoStore.initialize({
				authenticationMethod: 'saml' as UserManagementAuthenticationMethod,
				config: {
					saml: { loginEnabled: true },
				},
				features: {
					saml: true,
					ldap: false,
					oidc: true,
				},
			});

			// Manually set selectedAuthProtocol to OIDC
			ssoStore.selectedAuthProtocol = SupportedProtocols.OIDC;

			// Call initializeSelectedProtocol
			ssoStore.initializeSelectedProtocol();

			// Should remain OIDC (not overwritten)
			expect(ssoStore.selectedAuthProtocol).toBe(SupportedProtocols.OIDC);
		});

		it('should handle undefined authentication method gracefully', () => {
			// Don't initialize the store (authenticationMethod remains undefined)

			// selectedAuthProtocol should be undefined initially
			expect(ssoStore.selectedAuthProtocol).toBeUndefined();

			// Call initializeSelectedProtocol
			ssoStore.initializeSelectedProtocol();

			// Should default to SAML when authentication method is undefined
			expect(ssoStore.selectedAuthProtocol).toBe(SupportedProtocols.SAML);
		});
	});
});
