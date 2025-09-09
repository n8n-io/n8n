import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { GLOBAL_MEMBER_ROLE, type User } from '@n8n/db';
import { type Request, type Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { OIDC_NONCE_COOKIE_NAME, OIDC_STATE_COOKIE_NAME } from '@/constants';
import type { AuthlessRequest } from '@/requests';
import type { UrlService } from '@/services/url.service';

import type { OidcService } from '../../oidc.service.ee';
import { OidcController } from '../oidc.controller.ee';

const authService = mock<AuthService>();
const oidcService = mock<OidcService>();
const urlService = mock<UrlService>();
const globalConfig = mock<GlobalConfig>();
const logger = mock<Logger>();
const controller = new OidcController(oidcService, authService, urlService, globalConfig, logger);

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
