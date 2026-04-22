import type { OidcConfigDto } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';
import { useSSOStore, SupportedProtocols } from '@/features/settings/sso/sso.store';
import type { UserManagementAuthenticationMethod } from '@/Interface';
import * as ssoApi from '@n8n/rest-api-client/api/sso';

vi.mock('@n8n/rest-api-client/api/sso');

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

	describe('OIDC callbackUrl after re-initialization', () => {
		it('should populate callbackUrl when re-initialized with authenticated settings', () => {
			// Simulate public settings (before login) — no callbackUrl
			ssoStore.initialize({
				authenticationMethod: 'oidc' as UserManagementAuthenticationMethod,
				config: {
					oidc: { loginEnabled: false, loginUrl: 'http://localhost:5678/rest/sso/oidc/login' },
				},
				features: { saml: false, ldap: false, oidc: true },
			});

			expect(ssoStore.oidc.callbackUrl).toBe('');

			// Simulate authenticated settings (after login) — includes callbackUrl
			ssoStore.initialize({
				authenticationMethod: 'oidc' as UserManagementAuthenticationMethod,
				config: {
					oidc: {
						loginEnabled: false,
						loginUrl: 'http://localhost:5678/rest/sso/oidc/login',
						callbackUrl: 'http://localhost:5678/rest/sso/oidc/callback',
					},
				},
				features: { saml: false, ldap: false, oidc: true },
			});

			expect(ssoStore.oidc.callbackUrl).toBe('http://localhost:5678/rest/sso/oidc/callback');
		});
	});

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

	describe('getOidcConfig', () => {
		it('should sync oidc.loginEnabled when fetching config', async () => {
			const oidcConfig: OidcConfigDto = {
				clientId: 'test-id',
				clientSecret: 'test-secret',
				discoveryEndpoint: 'https://example.com/.well-known/openid-configuration',
				loginEnabled: true,
				prompt: 'select_account',
				authenticationContextClassReference: [],
			};

			vi.mocked(ssoApi.getOidcConfig).mockResolvedValue(oidcConfig);

			// loginEnabled starts as false (default)
			expect(ssoStore.isOidcLoginEnabled).toBe(false);

			await ssoStore.getOidcConfig();

			// After fetching config, loginEnabled should be synced
			expect(ssoStore.isOidcLoginEnabled).toBe(true);
			expect(ssoStore.oidcConfig).toEqual(oidcConfig);
		});

		it('should reset oidc.loginEnabled to false when server config has it disabled', async () => {
			// Start with loginEnabled = true via initialize
			ssoStore.initialize({
				authenticationMethod: 'oidc' as UserManagementAuthenticationMethod,
				config: { oidc: { loginEnabled: true } },
				features: { saml: false, ldap: false, oidc: true },
			});
			expect(ssoStore.isOidcLoginEnabled).toBe(true);

			// Server returns config with loginEnabled = false
			vi.mocked(ssoApi.getOidcConfig).mockResolvedValue({
				clientId: 'test-id',
				clientSecret: 'test-secret',
				discoveryEndpoint: 'https://example.com/.well-known/openid-configuration',
				loginEnabled: false,
				prompt: 'select_account',
				authenticationContextClassReference: [],
			});

			await ssoStore.getOidcConfig();

			// loginEnabled should now be false, matching server state
			expect(ssoStore.isOidcLoginEnabled).toBe(false);
		});
	});
});
