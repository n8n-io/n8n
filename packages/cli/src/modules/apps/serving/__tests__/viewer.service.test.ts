import type { User, UserRepository } from '@n8n/db';
import type { Request } from 'express';
import { mock } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { AUTH_COOKIE_NAME } from '@/constants';

import type { AppTokenService } from '../app-token.service';
import { ViewerService } from '../viewer.service';

const user = mock<User>({ id: 'user-1', email: 'ada@example.com', firstName: 'Ada' });

const payload = { appId: 'app-1', viewerId: 'user-1', mode: 'published' as const };

const request = (overrides: { authorization?: string; cookie?: string } = {}) =>
	mock<Request>({
		headers: { authorization: overrides.authorization },
		cookies: overrides.cookie ? { [AUTH_COOKIE_NAME]: overrides.cookie } : {},
	});

describe('ViewerService', () => {
	const userRepository = mock<UserRepository>();
	const authService = mock<AuthService>();
	const appTokenService = mock<AppTokenService>();
	const service = new ViewerService(userRepository, authService, appTokenService);

	beforeEach(() => {
		userRepository.findOneBy.mockReset();
		authService.authenticateUserByCookie.mockReset();
		appTokenService.verifyAccess.mockReset();
		userRepository.findOneBy.mockResolvedValue(user);
		authService.getCookieToken.mockImplementation((req) => {
			const cookie: unknown = req.cookies?.[AUTH_COOKIE_NAME];
			return typeof cookie === 'string' ? cookie : undefined;
		});
	});

	describe('fromToken', () => {
		test('resolves the user the token names to id and email only', async () => {
			await expect(service.fromToken(payload)).resolves.toEqual({
				id: 'user-1',
				email: 'ada@example.com',
			});
			expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: 'user-1' });
		});

		test('resolves null for an anonymous token without a lookup', async () => {
			await expect(service.fromToken({ ...payload, viewerId: null })).resolves.toBeNull();
			expect(userRepository.findOneBy).not.toHaveBeenCalled();
		});

		test('resolves null when the named user no longer exists', async () => {
			userRepository.findOneBy.mockResolvedValue(null);

			await expect(service.fromToken(payload)).resolves.toBeNull();
		});
	});

	describe('fromRequest', () => {
		test('resolves the viewer of a valid access token for this app', async () => {
			appTokenService.verifyAccess.mockReturnValue(payload);

			await expect(
				service.fromRequest(request({ authorization: 'Bearer t' }), 'app-1'),
			).resolves.toEqual({ id: 'user-1', email: 'ada@example.com' });
			expect(appTokenService.verifyAccess).toHaveBeenCalledWith('t');
			expect(authService.authenticateUserByCookie).not.toHaveBeenCalled();
		});

		test('resolves null for an access token of another app', async () => {
			appTokenService.verifyAccess.mockReturnValue({ ...payload, appId: 'other' });

			await expect(
				service.fromRequest(request({ authorization: 'Bearer t' }), 'app-1'),
			).resolves.toBeNull();
		});

		test('resolves null for an invalid access token', async () => {
			appTokenService.verifyAccess.mockReturnValue(null);

			await expect(
				service.fromRequest(request({ authorization: 'Bearer t' }), 'app-1'),
			).resolves.toBeNull();
		});

		test('does not read the cookie when a bearer token is present', async () => {
			appTokenService.verifyAccess.mockReturnValue({ ...payload, viewerId: null });

			await expect(
				service.fromRequest(request({ authorization: 'Bearer t', cookie: 'c' }), 'app-1'),
			).resolves.toBeNull();
			expect(authService.authenticateUserByCookie).not.toHaveBeenCalled();
		});

		test('resolves the viewer of a valid n8n session cookie', async () => {
			authService.authenticateUserByCookie.mockResolvedValue(user);

			await expect(service.fromRequest(request({ cookie: 'c' }), 'app-1')).resolves.toEqual({
				id: 'user-1',
				email: 'ada@example.com',
			});
			expect(authService.authenticateUserByCookie).toHaveBeenCalledWith('c');
		});

		test('resolves null for an invalid session cookie', async () => {
			authService.authenticateUserByCookie.mockRejectedValue(new Error('Unauthorized'));

			await expect(service.fromRequest(request({ cookie: 'c' }), 'app-1')).resolves.toBeNull();
		});

		test('resolves null when the request carries no credential', async () => {
			await expect(service.fromRequest(request(), 'app-1')).resolves.toBeNull();
			expect(authService.authenticateUserByCookie).not.toHaveBeenCalled();
		});
	});
});
