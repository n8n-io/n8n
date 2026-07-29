import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig, InstanceSettingsLoaderConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { GLOBAL_MEMBER_ROLE, type AuthenticatedRequest, type User } from '@n8n/db';
import { type Request, type Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { OIDC_NONCE_COOKIE_NAME, OIDC_STATE_COOKIE_NAME } from '@/constants';
import type { EventService } from '@/events/event.service';
import type { AuthlessRequest } from '@/requests';
import type { UrlService } from '@/services/url.service';

import { isOidcCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';

import { OIDC_ID_TOKEN_COOKIE_NAME } from '../constants';
import { OidcController } from '../oidc.controller.ee';
import type { OidcService } from '../oidc.service.ee';

vi.mock('@/sso.ee/sso-helpers', () => ({
	isOidcCurrentAuthenticationMethod: vi.fn().mockReturnValue(true),
}));

const authService = mock<AuthService>({ jwtExpiration: 604800 });
const eventService = mock<EventService>();
const oidcService = mock<OidcService>();
const urlService = mock<UrlService>();
const globalConfig = mock<GlobalConfig>({
	auth: { cookie: { samesite: 'lax', secure: true } },
});
const logger = mock<Logger>();
const instanceSettingsLoaderConfig = mock<InstanceSettingsLoaderConfig>({
	ssoManagedByEnv: false,
});
const controller = new OidcController(
	oidcService,
	authService,
	eventService,
	urlService,
	globalConfig,
	logger,
	instanceSettingsLoaderConfig,
);

const user = mock<User>({
	id: '456',
	email: 'oidc-user@example.com',
	firstName: 'OIDC',
	lastName: 'User',
	password: 'password',
	authIdentities: [],
	role: GLOBAL_MEMBER_ROLE,
});

describe('OidcController', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Mock URL service
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678');
	});

	describe('callbackHandler', () => {
		beforeEach(() => {
			// Default: non-test mode for regular login tests
			oidcService.verifyState.mockReturnValue({ state: 'n8n_state:uuid' });
		});

		test('Should issue cookie with MFA flag set to true on successful OIDC login', async () => {
			const req = mock<AuthlessRequest>({
				originalUrl: '/sso/oidc/callback?code=auth_code&state=state_value',
				browserId: 'browser-id-123',
				cookies: {
					[OIDC_STATE_COOKIE_NAME]: 'state_value',
					[OIDC_NONCE_COOKIE_NAME]: 'nonce_value',
				},
			});
			const res = mock<Response>();

			const expectedCallbackUrl = new URL(
				'http://localhost:5678/sso/oidc/callback?code=auth_code&state=state_value',
			);

			// Mock successful OIDC login
			oidcService.loginUser.mockResolvedValueOnce({ user });

			await controller.callbackHandler(req, res);

			// Verify that loginUser was called with the correct callback URL
			expect(oidcService.loginUser).toHaveBeenCalledWith(
				expectedCallbackUrl,
				'state_value',
				'nonce_value',
			);

			// Verify that issueCookie was called with MFA flag set to true
			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, req.browserId);
			expect(eventService.emit).toHaveBeenCalledWith('user-logged-in', {
				user,
				authenticationMethod: 'oidc',
			});

			// Verify redirect to home page
			expect(res.redirect).toHaveBeenCalledWith('/');
		});

		test('Should handle callback URL with different query parameters', async () => {
			const req = mock<AuthlessRequest>({
				originalUrl:
					'/sso/oidc/callback?code=different_code&state=different_state&session_state=session123',
				browserId: 'browser-id-123',
				cookies: {
					[OIDC_STATE_COOKIE_NAME]: 'state_value',
					[OIDC_NONCE_COOKIE_NAME]: 'nonce_value',
				},
			});
			const res = mock<Response>();

			const expectedCallbackUrl = new URL(
				'http://localhost:5678/sso/oidc/callback?code=different_code&state=different_state&session_state=session123',
			);

			oidcService.loginUser.mockResolvedValueOnce({ user });

			await controller.callbackHandler(req, res);

			expect(oidcService.loginUser).toHaveBeenCalledWith(
				expectedCallbackUrl,
				'state_value',
				'nonce_value',
			);
			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, req.browserId);
			expect(res.redirect).toHaveBeenCalledWith('/');
		});

		test('Should handle callback URL with no query parameters', async () => {
			const req = mock<AuthlessRequest>({
				originalUrl: '/sso/oidc/callback',
				browserId: undefined,
				cookies: {
					[OIDC_STATE_COOKIE_NAME]: 'state_value',
					[OIDC_NONCE_COOKIE_NAME]: 'nonce_value',
				},
			});
			const res = mock<Response>();

			const expectedCallbackUrl = new URL('http://localhost:5678/sso/oidc/callback');

			oidcService.loginUser.mockResolvedValueOnce({ user });

			await controller.callbackHandler(req, res);

			expect(oidcService.loginUser).toHaveBeenCalledWith(
				expectedCallbackUrl,
				'state_value',
				'nonce_value',
			);
			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, undefined);
			expect(res.redirect).toHaveBeenCalledWith('/');
		});

		test('Should propagate errors from OIDC service', async () => {
			const req = mock<Request>({
				originalUrl: '/sso/oidc/callback?code=auth_code&state=state_value',
				cookies: {
					[OIDC_STATE_COOKIE_NAME]: 'state_value',
					[OIDC_NONCE_COOKIE_NAME]: 'nonce_value',
				},
			});
			const res = mock<Response>();

			const loginError = new Error('OIDC login failed');
			oidcService.loginUser.mockRejectedValueOnce(loginError);

			await expect(controller.callbackHandler(req, res)).rejects.toThrow('OIDC login failed');

			// Verify that issueCookie was not called when login fails
			expect(authService.issueCookie).not.toHaveBeenCalled();
			expect(res.redirect).not.toHaveBeenCalled();
		});

		test('Should store the encrypted ID token in a cookie for RP-initiated logout', async () => {
			const req = mock<AuthlessRequest>({
				originalUrl: '/sso/oidc/callback?code=auth_code&state=state_value',
				browserId: 'browser-id-123',
				cookies: {
					[OIDC_STATE_COOKIE_NAME]: 'state_value',
					[OIDC_NONCE_COOKIE_NAME]: 'nonce_value',
				},
			});
			const res = mock<Response>();

			oidcService.loginUser.mockResolvedValueOnce({ user, idToken: 'raw-id-token' });
			oidcService.encryptIdToken.mockResolvedValueOnce('encrypted-id-token');

			await controller.callbackHandler(req, res);

			expect(oidcService.encryptIdToken).toHaveBeenCalledWith('raw-id-token');
			expect(res.cookie).toHaveBeenCalledWith(
				OIDC_ID_TOKEN_COOKIE_NAME,
				'encrypted-id-token',
				expect.objectContaining({
					maxAge: 604800 * Time.seconds.toMilliseconds,
					httpOnly: true,
					sameSite: 'lax',
					secure: true,
				}),
			);
		});

		test('Should not store an oversized ID token in a cookie', async () => {
			const req = mock<AuthlessRequest>({
				originalUrl: '/sso/oidc/callback?code=auth_code&state=state_value',
				browserId: 'browser-id-123',
				cookies: {
					[OIDC_STATE_COOKIE_NAME]: 'state_value',
					[OIDC_NONCE_COOKIE_NAME]: 'nonce_value',
				},
			});
			const res = mock<Response>();

			oidcService.loginUser.mockResolvedValueOnce({ user, idToken: 'raw-id-token' });
			oidcService.encryptIdToken.mockResolvedValueOnce('x'.repeat(5000));

			await controller.callbackHandler(req, res);

			expect(res.cookie).not.toHaveBeenCalledWith(
				OIDC_ID_TOKEN_COOKIE_NAME,
				expect.any(String),
				expect.any(Object),
			);
			expect(logger.warn).toHaveBeenCalled();
			// Login itself must still succeed
			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, req.browserId);
			expect(res.redirect).toHaveBeenCalledWith('/');
		});

		test('Should render success page in test mode without creating session', async () => {
			const req = mock<AuthlessRequest>({
				originalUrl: '/sso/oidc/callback?code=auth_code&state=state_value',
				cookies: {
					[OIDC_STATE_COOKIE_NAME]: 'state_value',
					[OIDC_NONCE_COOKIE_NAME]: 'nonce_value',
				},
			});
			const res = mock<Response>({ send: vi.fn().mockReturnThis() });

			oidcService.verifyState.mockReturnValueOnce({
				state: 'n8n_state:uuid',
				testMode: true,
			});
			oidcService.processTestCallback.mockResolvedValueOnce({
				claims: { sub: 'test-sub', email: 'test@example.com' },
				userInfo: {
					sub: 'test-sub',
					email: 'test@example.com',
					given_name: 'Test',
					family_name: 'User',
				},
			});

			await controller.callbackHandler(req, res);

			expect(oidcService.processTestCallback).toHaveBeenCalledWith(
				expect.any(URL),
				'state_value',
				'nonce_value',
			);
			expect(res.send).toHaveBeenCalledWith(
				expect.stringContaining('OIDC Connection Test was successful'),
			);
			expect(res.send).toHaveBeenCalledWith(expect.stringContaining('test@example.com'));
			expect(authService.issueCookie).not.toHaveBeenCalled();
			expect(res.redirect).not.toHaveBeenCalled();
		});

		test('Should render failure page in test mode when processTestCallback throws', async () => {
			const req = mock<AuthlessRequest>({
				originalUrl: '/sso/oidc/callback?code=auth_code&state=state_value',
				cookies: {
					[OIDC_STATE_COOKIE_NAME]: 'state_value',
					[OIDC_NONCE_COOKIE_NAME]: 'nonce_value',
				},
			});
			const res = mock<Response>({ send: vi.fn().mockReturnThis() });

			oidcService.verifyState.mockReturnValueOnce({
				state: 'n8n_state:uuid',
				testMode: true,
			});
			oidcService.processTestCallback.mockRejectedValueOnce(
				new Error('Invalid authorization code'),
			);

			await controller.callbackHandler(req, res);

			expect(res.send).toHaveBeenCalledWith(expect.stringContaining('OIDC Connection Test failed'));
			expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Invalid authorization code'));
			expect(authService.issueCookie).not.toHaveBeenCalled();
		});
	});

	describe('testConnection', () => {
		test('Should return URL and set cookies', async () => {
			const req = mock<AuthenticatedRequest>();
			const res = mock<Response>();
			globalConfig.auth.cookie = { samesite: 'lax', secure: true };

			const mockAuthUrl = new URL('https://provider.com/auth?client_id=123');
			oidcService.generateTestLoginUrl.mockResolvedValueOnce({
				url: mockAuthUrl,
				state: 'test_state',
				nonce: 'test_nonce',
			});

			const result = await controller.testConnection(req, res);

			expect(result).toEqual({ url: 'https://provider.com/auth?client_id=123' });
			expect(res.cookie).toHaveBeenCalledWith(OIDC_STATE_COOKIE_NAME, 'test_state', {
				httpOnly: true,
				sameSite: 'lax',
				secure: true,
				maxAge: 15 * Time.minutes.toMilliseconds,
			});
			expect(res.cookie).toHaveBeenCalledWith(OIDC_NONCE_COOKIE_NAME, 'test_nonce', {
				httpOnly: true,
				sameSite: 'lax',
				secure: true,
				maxAge: 15 * Time.minutes.toMilliseconds,
			});
		});
	});

	describe('OIDC env-managed write protection', () => {
		const envManagedConfig = mock<InstanceSettingsLoaderConfig>({ ssoManagedByEnv: true });
		const envManagedController = new OidcController(
			oidcService,
			authService,
			eventService,
			urlService,
			globalConfig,
			logger,
			envManagedConfig,
		);

		test('saveConfiguration should reject writes when managed by env', async () => {
			const req = mock<AuthenticatedRequest>();
			const res = mock<Response>();

			await expect(
				envManagedController.saveConfiguration(req, res, {
					clientId: 'id',
					clientSecret: 'secret',
					discoveryEndpoint: 'https://example.com',
				} as any),
			).rejects.toThrow('cannot be modified through the API');
		});
	});

	describe('redirectToAuthProvider', () => {
		test('Should redirect to generated authorization URL', async () => {
			const req = mock<Request>();
			const res = mock<Response>();
			globalConfig.auth.cookie = { samesite: 'lax', secure: true };

			const mockAuthUrl = new URL(
				'https://provider.com/auth?client_id=123&redirect_uri=http://localhost:5678/callback',
			);
			oidcService.generateLoginUrl.mockResolvedValueOnce({
				url: mockAuthUrl,
				state: 'state_value',
				nonce: 'nonce_value',
			});

			await controller.redirectToAuthProvider(req, res);

			expect(oidcService.generateLoginUrl).toHaveBeenCalled();
			expect(res.redirect).toHaveBeenCalledWith(
				'https://provider.com/auth?client_id=123&redirect_uri=http://localhost:5678/callback',
			);
			expect(res.cookie).toHaveBeenCalledWith(OIDC_STATE_COOKIE_NAME, 'state_value', {
				httpOnly: true,
				sameSite: 'lax',
				secure: true,
				maxAge: 15 * Time.minutes.toMilliseconds,
			});
			expect(res.cookie).toHaveBeenCalledWith(OIDC_NONCE_COOKIE_NAME, 'nonce_value', {
				httpOnly: true,
				sameSite: 'lax',
				secure: true,
				maxAge: 15 * Time.minutes.toMilliseconds,
			});
		});

		test('Should propagate errors from OIDC service during URL generation', async () => {
			const req = mock<Request>();
			const res = mock<Response>();

			const urlGenerationError = new Error('Failed to generate authorization URL');
			oidcService.generateLoginUrl.mockRejectedValueOnce(urlGenerationError);

			await expect(controller.redirectToAuthProvider(req, res)).rejects.toThrow(
				'Failed to generate authorization URL',
			);

			expect(res.redirect).not.toHaveBeenCalled();
		});
	});

	describe('logout', () => {
		const makeLogoutReq = (cookies: Record<string, string>) =>
			mock<AuthenticatedRequest>({ cookies });

		beforeEach(() => {
			vi.mocked(isOidcCurrentAuthenticationMethod).mockReturnValue(true);
		});

		test('Should always invalidate the n8n session and clear the auth and ID token cookies', async () => {
			const req = makeLogoutReq({ [OIDC_ID_TOKEN_COOKIE_NAME]: 'encrypted-id-token' });
			const res = mock<Response>();
			oidcService.decryptIdToken.mockResolvedValueOnce('raw-id-token');
			oidcService.generateEndSessionUrl.mockResolvedValueOnce(
				new URL('https://idp.example.com/logout?id_token_hint=raw-id-token'),
			);

			await controller.logout(req, res);

			expect(authService.invalidateToken).toHaveBeenCalledWith(req);
			expect(authService.clearCookie).toHaveBeenCalledWith(res);
			expect(res.clearCookie).toHaveBeenCalledWith(OIDC_ID_TOKEN_COOKIE_NAME);
		});

		test('Should return the RP-initiated logout URL for an OIDC-established session', async () => {
			const req = makeLogoutReq({ [OIDC_ID_TOKEN_COOKIE_NAME]: 'encrypted-id-token' });
			const res = mock<Response>();
			oidcService.decryptIdToken.mockResolvedValueOnce('raw-id-token');
			oidcService.generateEndSessionUrl.mockResolvedValueOnce(
				new URL('https://idp.example.com/logout?id_token_hint=raw-id-token'),
			);

			const result = await controller.logout(req, res);

			expect(oidcService.decryptIdToken).toHaveBeenCalledWith('encrypted-id-token');
			expect(oidcService.generateEndSessionUrl).toHaveBeenCalledWith('raw-id-token');
			expect(result).toEqual({
				redirectUrl: 'https://idp.example.com/logout?id_token_hint=raw-id-token',
			});
		});

		test('Should return a null redirect URL when the session was not established through OIDC', async () => {
			const req = makeLogoutReq({});
			const res = mock<Response>();

			const result = await controller.logout(req, res);

			expect(result).toEqual({ redirectUrl: null });
			expect(oidcService.generateEndSessionUrl).not.toHaveBeenCalled();
			// The n8n session is still terminated
			expect(authService.invalidateToken).toHaveBeenCalledWith(req);
			expect(authService.clearCookie).toHaveBeenCalledWith(res);
		});

		test('Should return a null redirect URL when OIDC is no longer the authentication method', async () => {
			vi.mocked(isOidcCurrentAuthenticationMethod).mockReturnValue(false);
			const req = makeLogoutReq({ [OIDC_ID_TOKEN_COOKIE_NAME]: 'encrypted-id-token' });
			const res = mock<Response>();

			const result = await controller.logout(req, res);

			expect(result).toEqual({ redirectUrl: null });
			expect(oidcService.generateEndSessionUrl).not.toHaveBeenCalled();
		});

		test('Should return a null redirect URL when the ID token cannot be decrypted', async () => {
			const req = makeLogoutReq({ [OIDC_ID_TOKEN_COOKIE_NAME]: 'tampered' });
			const res = mock<Response>();
			oidcService.decryptIdToken.mockResolvedValueOnce(undefined);

			const result = await controller.logout(req, res);

			expect(result).toEqual({ redirectUrl: null });
			expect(oidcService.generateEndSessionUrl).not.toHaveBeenCalled();
		});

		test('Should return a null redirect URL when the provider has no end_session_endpoint', async () => {
			const req = makeLogoutReq({ [OIDC_ID_TOKEN_COOKIE_NAME]: 'encrypted-id-token' });
			const res = mock<Response>();
			oidcService.decryptIdToken.mockResolvedValueOnce('raw-id-token');
			oidcService.generateEndSessionUrl.mockResolvedValueOnce(undefined);

			const result = await controller.logout(req, res);

			expect(result).toEqual({ redirectUrl: null });
		});

		test('Should not fail the sign-out when building the logout URL throws', async () => {
			const req = makeLogoutReq({ [OIDC_ID_TOKEN_COOKIE_NAME]: 'encrypted-id-token' });
			const res = mock<Response>();
			oidcService.decryptIdToken.mockResolvedValueOnce('raw-id-token');
			oidcService.generateEndSessionUrl.mockRejectedValueOnce(new Error('discovery unavailable'));

			const result = await controller.logout(req, res);

			expect(result).toEqual({ redirectUrl: null });
			expect(authService.invalidateToken).toHaveBeenCalledWith(req);
			expect(authService.clearCookie).toHaveBeenCalledWith(res);
			expect(logger.warn).toHaveBeenCalled();
		});
	});
});
