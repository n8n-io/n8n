import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig, InstanceSettingsLoaderConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { GLOBAL_MEMBER_ROLE, type AuthenticatedRequest, type User } from '@n8n/db';
import { type Request, type Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { OIDC_NONCE_COOKIE_NAME, OIDC_STATE_COOKIE_NAME } from '@/constants';
import type { AuthlessRequest } from '@/requests';
import type { UrlService } from '@/services/url.service';

import { OidcController } from '../oidc.controller.ee';
import type { OidcService } from '../oidc.service.ee';

const authService = mock<AuthService>();
const oidcService = mock<OidcService>();
const urlService = mock<UrlService>();
const globalConfig = mock<GlobalConfig>();
const logger = mock<Logger>();
const instanceSettingsLoaderConfig = mock<InstanceSettingsLoaderConfig>({
	ssoManagedByEnv: false,
});
const controller = new OidcController(
	oidcService,
	authService,
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
		jest.clearAllMocks();

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
			oidcService.loginUser.mockResolvedValueOnce(user);

			await controller.callbackHandler(req, res);

			// Verify that loginUser was called with the correct callback URL
			expect(oidcService.loginUser).toHaveBeenCalledWith(
				expectedCallbackUrl,
				'state_value',
				'nonce_value',
			);

			// Verify that issueCookie was called with MFA flag set to true
			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, req.browserId);

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

			oidcService.loginUser.mockResolvedValueOnce(user);

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

			oidcService.loginUser.mockResolvedValueOnce(user);

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

		test('Should render success page in test mode without creating session', async () => {
			const req = mock<AuthlessRequest>({
				originalUrl: '/sso/oidc/callback?code=auth_code&state=state_value',
				cookies: {
					[OIDC_STATE_COOKIE_NAME]: 'state_value',
					[OIDC_NONCE_COOKIE_NAME]: 'nonce_value',
				},
			});
			const res = mock<Response>({ send: jest.fn().mockReturnThis() });

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
			const res = mock<Response>({ send: jest.fn().mockReturnThis() });

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
});
