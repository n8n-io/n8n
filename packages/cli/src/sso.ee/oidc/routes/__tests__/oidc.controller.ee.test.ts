import type { User } from '@n8n/db';
import { type Request, type Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { OidcService } from '../../oidc.service.ee';
import { OidcController } from '../oidc.controller.ee';

import type { AuthService } from '@/auth/auth.service';
import type { AuthlessRequest } from '@/requests';
import type { UrlService } from '@/services/url.service';

const authService = mock<AuthService>();
const oidcService = mock<OidcService>();
const urlService = mock<UrlService>();
const controller = new OidcController(oidcService, authService, urlService);

const user = mock<User>({
	id: '456',
	email: 'oidc-user@example.com',
	firstName: 'OIDC',
	lastName: 'User',
	password: 'password',
	authIdentities: [],
	role: 'global:member',
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
			});
			const res = mock<Response>();

			const expectedCallbackUrl = new URL(
				'http://localhost:5678/sso/oidc/callback?code=auth_code&state=state_value',
			);

			// Mock successful OIDC login
			oidcService.loginUser.mockResolvedValueOnce(user);

			await controller.callbackHandler(req, res);

			// Verify that loginUser was called with the correct callback URL
			expect(oidcService.loginUser).toHaveBeenCalledWith(expectedCallbackUrl);

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
			});
			const res = mock<Response>();

			const expectedCallbackUrl = new URL(
				'http://localhost:5678/sso/oidc/callback?code=different_code&state=different_state&session_state=session123',
			);

			oidcService.loginUser.mockResolvedValueOnce(user);

			await controller.callbackHandler(req, res);

			expect(oidcService.loginUser).toHaveBeenCalledWith(expectedCallbackUrl);
			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, req.browserId);
			expect(res.redirect).toHaveBeenCalledWith('/');
		});

		test('Should handle callback URL with no query parameters', async () => {
			const req = mock<AuthlessRequest>({
				originalUrl: '/sso/oidc/callback',
				browserId: undefined,
			});
			const res = mock<Response>();

			const expectedCallbackUrl = new URL('http://localhost:5678/sso/oidc/callback');

			oidcService.loginUser.mockResolvedValueOnce(user);

			await controller.callbackHandler(req, res);

			expect(oidcService.loginUser).toHaveBeenCalledWith(expectedCallbackUrl);
			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, undefined);
			expect(res.redirect).toHaveBeenCalledWith('/');
		});

		test('Should propagate errors from OIDC service', async () => {
			const req = mock<Request>({
				originalUrl: '/sso/oidc/callback?code=auth_code&state=state_value',
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

			const mockAuthUrl = new URL(
				'https://provider.com/auth?client_id=123&redirect_uri=http://localhost:5678/callback',
			);
			oidcService.generateLoginUrl.mockResolvedValueOnce(mockAuthUrl);

			await controller.redirectToAuthProvider(req, res);

			expect(oidcService.generateLoginUrl).toHaveBeenCalled();
			expect(res.redirect).toHaveBeenCalledWith(
				'https://provider.com/auth?client_id=123&redirect_uri=http://localhost:5678/callback',
			);
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
