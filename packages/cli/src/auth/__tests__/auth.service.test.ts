import type { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type {
	AuthenticatedRequest,
	User,
	InvalidAuthTokenRepository,
	UserRepository,
} from '@n8n/db';
import type { NextFunction, Response } from 'express';
import { mock } from 'jest-mock-extended';
import jwt from 'jsonwebtoken';

import { AuthService } from '@/auth/auth.service';
import { AUTH_COOKIE_NAME } from '@/constants';
import type { MfaService } from '@/mfa/mfa.service';
import { JwtService } from '@/services/jwt.service';
import type { UrlService } from '@/services/url.service';

describe('AuthService', () => {
	const browserId = 'test-browser-id';
	const userData = {
		id: '123',
		email: 'test@example.com',
		password: 'passwordHash',
		disabled: false,
		mfaEnabled: false,
	};
	const user = mock<User>(userData);
	const globalConfig = mock<GlobalConfig>({
		auth: { cookie: { secure: true, samesite: 'lax' } },
		userManagement: { jwtSecret: 'random-secret' },
	});
	const jwtService = new JwtService(mock(), globalConfig);
	const urlService = mock<UrlService>();
	const userRepository = mock<UserRepository>();
	const invalidAuthTokenRepository = mock<InvalidAuthTokenRepository>();
	const mfaService = mock<MfaService>();
	const authService = new AuthService(
		globalConfig,
		mock(),
		mock(),
		jwtService,
		urlService,
		userRepository,
		invalidAuthTokenRepository,
		mfaService,
	);

	const now = new Date('2024-02-01T01:23:45.678Z');
	jest.useFakeTimers({ now });

	const validToken =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImhhc2giOiJtSkFZeDRXYjdrIiwiYnJvd3NlcklkIjoiOFpDVXE1YU1uSFhnMFZvcURLcm9hMHNaZ0NwdWlPQ1AzLzB2UmZKUXU0MD0iLCJ1c2VkTWZhIjpmYWxzZSwiaWF0IjoxNzA2NzUwNjI1LCJleHAiOjE3MDczNTU0MjV9.N7JgwETmO41o4FUDVb4pA1HM3Clj4jyjDK-lE8Fa1Zw'; // Generated using `authService.issueJWT(user, false, browserId)`

	const validTokenWithMfa =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImhhc2giOiJtSkFZeDRXYjdrIiwiYnJvd3NlcklkIjoiOFpDVXE1YU1uSFhnMFZvcURLcm9hMHNaZ0NwdWlPQ1AzLzB2UmZKUXU0MD0iLCJ1c2VkTWZhIjp0cnVlLCJpYXQiOjE3MDY3NTA2MjUsImV4cCI6MTcwNzM1NTQyNX0.9kTTue-ZdBQ0CblH0IrqW9K-k0WWfxfsWTglyPB10ko'; // Generated using `authService.issueJWT(user, true, browserId)`

	beforeEach(() => {
		jest.resetAllMocks();
		jest.setSystemTime(now);
		globalConfig.userManagement.jwtSessionDurationHours = 168;
		globalConfig.userManagement.jwtRefreshTimeoutHours = 0;
		globalConfig.auth.cookie = { secure: true, samesite: 'lax' };
	});

	describe('createJWTHash', () => {
		it('should generate unique hashes', () => {
			expect(authService.createJWTHash(user)).toEqual('mJAYx4Wb7k');
			expect(
				authService.createJWTHash(
					mock<User>({ email: user.email, password: 'newPasswordHash', mfaEnabled: false }),
				),
			).toEqual('FVALtU7AE0');
			expect(
				authService.createJWTHash(
					mock<User>({ email: 'test1@example.com', password: user.password, mfaEnabled: false }),
				),
			).toEqual('y8ha6X01jd');
			expect(
				authService.createJWTHash(
					mock<User>({
						email: user.email,
						password: user.password,
						mfaEnabled: true,
						mfaSecret: 'secret',
					}),
				),
			).toEqual('WUXEVFet9W');
			expect(
				authService.createJWTHash(
					mock<User>({
						email: user.email,
						password: 'newPasswordHash',
						mfaEnabled: true,
						mfaSecret: 'secret',
					}),
				),
			).toEqual('toYQYKufH6');
		});
	});

	describe('authMiddleware', () => {
		const req = mock<AuthenticatedRequest>({
			cookies: {},
			user: undefined,
			browserId,
		});
		const res = mock<Response>();
		const next = jest.fn() as NextFunction;

		beforeEach(() => {
			res.status.mockReturnThis();
		});

		it('should 401 if no cookie is set', async () => {
			req.cookies[AUTH_COOKIE_NAME] = undefined;

			const middleware = authService.createAuthMiddleware(true);

			await middleware(req, res, next);

			expect(invalidAuthTokenRepository.existsBy).not.toHaveBeenCalled();
			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(401);
		});

		it('should 401 and clear the cookie if the JWT is expired', async () => {
			req.cookies[AUTH_COOKIE_NAME] = validToken;
			invalidAuthTokenRepository.existsBy.mockResolvedValue(false);
			jest.advanceTimersByTime(365 * Time.days.toMilliseconds);

			const middleware = authService.createAuthMiddleware(true);

			await middleware(req, res, next);

			expect(invalidAuthTokenRepository.existsBy).toHaveBeenCalled();
			expect(userRepository.findOne).not.toHaveBeenCalled();
			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.clearCookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME);
		});

		it('should 401 and clear the cookie if the JWT has been invalidated', async () => {
			req.cookies[AUTH_COOKIE_NAME] = validToken;
			invalidAuthTokenRepository.existsBy.mockResolvedValue(true);

			const middleware = authService.createAuthMiddleware(true);

			await middleware(req, res, next);

			expect(invalidAuthTokenRepository.existsBy).toHaveBeenCalled();
			expect(userRepository.findOne).not.toHaveBeenCalled();
			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.clearCookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME);
		});

		it('should 401 but not clear the cookie if 2FA is enforced and not configured for the user', async () => {
			req.cookies[AUTH_COOKIE_NAME] = validToken;
			userRepository.findOne.mockResolvedValue(user);
			invalidAuthTokenRepository.existsBy.mockResolvedValue(false);
			mfaService.isMFAEnforced.mockImplementation(() => {
				return true;
			});

			const middleware = authService.createAuthMiddleware(false);

			await middleware(req, res, next);

			expect(invalidAuthTokenRepository.existsBy).toHaveBeenCalled();
			expect(userRepository.findOne).toHaveBeenCalled();
			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.clearCookie).not.toHaveBeenCalledWith();
		});

		it('should refresh the cookie before it expires', async () => {
			req.cookies[AUTH_COOKIE_NAME] = validToken;
			jest.advanceTimersByTime(6 * Time.days.toMilliseconds);
			invalidAuthTokenRepository.existsBy.mockResolvedValue(false);
			userRepository.findOne.mockResolvedValue(user);

			const middleware = authService.createAuthMiddleware(true);

			await middleware(req, res, next);

			expect(next).toHaveBeenCalled();
			expect(res.cookie).toHaveBeenCalledWith('n8n-auth', expect.any(String), {
				httpOnly: true,
				maxAge: 604800000,
				sameSite: 'lax',
				secure: true,
			});
		});
	});

	describe('issueCookie', () => {
		const res = mock<Response>();
		it('should issue a cookie with the correct options', () => {
			authService.issueCookie(res, user, false, browserId);

			expect(res.cookie).toHaveBeenCalledWith('n8n-auth', validToken, {
				httpOnly: true,
				maxAge: 604800000,
				sameSite: 'lax',
				secure: true,
			});
		});

		it('should issue a cookie with the correct options, when 2FA was used', () => {
			authService.issueCookie(res, user, true, browserId);

			expect(res.cookie).toHaveBeenCalledWith('n8n-auth', validTokenWithMfa, {
				httpOnly: true,
				maxAge: 604800000,
				sameSite: 'lax',
				secure: true,
			});
		});

		it('should allow changing cookie options', () => {
			globalConfig.auth.cookie = { secure: false, samesite: 'none' };

			authService.issueCookie(res, user, false, browserId);

			expect(res.cookie).toHaveBeenCalledWith('n8n-auth', validToken, {
				httpOnly: true,
				maxAge: 604800000,
				sameSite: 'none',
				secure: false,
			});
		});
	});

	describe('issueJWT', () => {
		describe('when not setting userManagement.jwtSessionDuration', () => {
			it('should default to expire in 7 days', () => {
				const defaultInSeconds = 7 * Time.days.toSeconds;
				const token = authService.issueJWT(user, false, browserId);

				expect(authService.jwtExpiration).toBe(defaultInSeconds);
				const decodedToken = jwtService.verify(token);
				if (decodedToken.exp === undefined || decodedToken.iat === undefined) {
					fail('Expected exp and iat to be defined');
				}

				expect(decodedToken.exp - decodedToken.iat).toBe(defaultInSeconds);
			});
		});

		describe('when setting userManagement.jwtSessionDuration', () => {
			const testDurationHours = 1;
			const testDurationSeconds = testDurationHours * Time.hours.toSeconds;

			it('should apply it to tokens', () => {
				globalConfig.userManagement.jwtSessionDurationHours = testDurationHours;
				const token = authService.issueJWT(user, false, browserId);

				const decodedToken = jwtService.verify(token);
				if (decodedToken.exp === undefined || decodedToken.iat === undefined) {
					fail('Expected exp and iat to be defined on decodedToken');
				}
				expect(decodedToken.exp - decodedToken.iat).toBe(testDurationSeconds);
			});
		});
	});

	describe('resolveJwt', () => {
		const req = mock<AuthenticatedRequest>({
			cookies: {},
			user: undefined,
			browserId,
		});
		const res = mock<Response>();

		it('should throw on invalid tokens', async () => {
			await expect(authService.resolveJwt('random-string', req, res)).rejects.toThrow(
				'jwt malformed',
			);
			expect(res.cookie).not.toHaveBeenCalled();
		});

		it('should throw on expired tokens', async () => {
			jest.advanceTimersByTime(365 * Time.days.toMilliseconds);

			await expect(authService.resolveJwt(validToken, req, res)).rejects.toThrow('jwt expired');
			expect(res.cookie).not.toHaveBeenCalled();
		});

		it('should throw on tampered tokens', async () => {
			const [header, payload, signature] = validToken.split('.');
			const tamperedToken = [header, payload, signature + '123'].join('.');
			await expect(authService.resolveJwt(tamperedToken, req, res)).rejects.toThrow(
				'invalid signature',
			);
			expect(res.cookie).not.toHaveBeenCalled();
		});

		it('should throw on hijacked tokens', async () => {
			userRepository.findOne.mockResolvedValue(user);
			const req = mock<AuthenticatedRequest>({ browserId: 'another-browser' });
			await expect(authService.resolveJwt(validToken, req, res)).rejects.toThrow('Unauthorized');
			expect(res.cookie).not.toHaveBeenCalled();
		});

		test.each([
			['no user is found', null],
			['the user is disabled', { ...userData, disabled: true }],
			[
				'user password does not match the one on the token',
				{ ...userData, password: 'something else' },
			],
			[
				'user email does not match the one on the token',
				{ ...userData, email: 'someone@example.com' },
			],
			[
				'user mfa secret does not match the one on the token',
				{ ...userData, mfaEnabled: true, mfaSecret: '123' },
			],
		])('should throw if %s', async (_, data) => {
			userRepository.findOne.mockResolvedValueOnce(data && mock<User>(data));
			await expect(authService.resolveJwt(validToken, req, res)).rejects.toThrow('Unauthorized');
			expect(res.cookie).not.toHaveBeenCalled();
		});

		it('should refresh the cookie before it expires', async () => {
			userRepository.findOne.mockResolvedValue(user);
			expect(await authService.resolveJwt(validToken, req, res)).toEqual([
				user,
				{ usedMfa: false },
			]);
			expect(res.cookie).not.toHaveBeenCalled();

			jest.advanceTimersByTime(6 * Time.days.toMilliseconds); // 6 Days
			expect(await authService.resolveJwt(validToken, req, res)).toEqual([
				user,
				{ usedMfa: false },
			]);
			expect(res.cookie).toHaveBeenCalledWith('n8n-auth', expect.any(String), {
				httpOnly: true,
				maxAge: 604800000,
				sameSite: 'lax',
				secure: true,
			});

			const newToken = res.cookie.mock.calls[0].at(1);
			expect(newToken).not.toBe(validToken);
			expect(await authService.resolveJwt(newToken, req, res)).toEqual([user, { usedMfa: false }]);
			expect((jwt.decode(newToken) as jwt.JwtPayload).browserId).toEqual(
				(jwt.decode(validToken) as jwt.JwtPayload).browserId,
			);
		});

		it('should refresh the cookie only if less than 1/4th of time is left', async () => {
			userRepository.findOne.mockResolvedValue(user);
			expect(await authService.resolveJwt(validToken, req, res)).toEqual([
				user,
				{ usedMfa: false },
			]);
			expect(res.cookie).not.toHaveBeenCalled();

			jest.advanceTimersByTime(5 * Time.days.toMilliseconds);
			expect(await authService.resolveJwt(validToken, req, res)).toEqual([
				user,
				{ usedMfa: false },
			]);
			expect(res.cookie).not.toHaveBeenCalled();

			jest.advanceTimersByTime(1 * Time.days.toMilliseconds);
			expect(await authService.resolveJwt(validToken, req, res)).toEqual([
				user,
				{ usedMfa: false },
			]);
			expect(res.cookie).toHaveBeenCalled();
		});

		it('should not refresh the cookie if jwtRefreshTimeoutHours is set to -1', async () => {
			globalConfig.userManagement.jwtRefreshTimeoutHours = -1;

			userRepository.findOne.mockResolvedValue(user);
			expect(await authService.resolveJwt(validToken, req, res)).toEqual([
				user,
				{ usedMfa: false },
			]);
			expect(res.cookie).not.toHaveBeenCalled();

			jest.advanceTimersByTime(6 * Time.days.toMilliseconds); // 6 Days
			expect(await authService.resolveJwt(validToken, req, res)).toEqual([
				user,
				{ usedMfa: false },
			]);
			expect(res.cookie).not.toHaveBeenCalled();
		});
	});

	describe('generatePasswordResetUrl', () => {
		it('should generate a valid url', () => {
			urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.instance');
			const url = authService.generatePasswordResetUrl(user);
			expect(url).toEqual(
				'https://n8n.instance/change-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJoYXNoIjoibUpBWXg0V2I3ayIsImlhdCI6MTcwNjc1MDYyNSwiZXhwIjoxNzA2NzUxODI1fQ.rg90I7MKjc_KC77mov59XYAeRc-CoW9ka4mt1dCfrnk&mfaEnabled=false',
			);
		});
	});

	describe('generatePasswordResetToken', () => {
		it('should generate valid password-reset tokens', () => {
			const token = authService.generatePasswordResetToken(user);

			const decoded = jwt.decode(token) as jwt.JwtPayload;

			if (!decoded.exp) fail('Token does not contain expiry');
			if (!decoded.iat) fail('Token does not contain issued-at');

			expect(decoded.sub).toEqual(user.id);
			expect(decoded.exp - decoded.iat).toEqual(1200); // Expires in 20 minutes
			expect(decoded.hash).toEqual('mJAYx4Wb7k');
		});
	});

	describe('resolvePasswordResetToken', () => {
		it('should not return a user if the token in invalid', async () => {
			const resolvedUser = await authService.resolvePasswordResetToken('invalid-token');
			expect(resolvedUser).toBeUndefined();
		});

		it('should not return a user if the token in expired', async () => {
			const token = authService.generatePasswordResetToken(user, '-1h');

			const resolvedUser = await authService.resolvePasswordResetToken(token);
			expect(resolvedUser).toBeUndefined();
		});

		it('should not return a user if the user does not exist in the DB', async () => {
			userRepository.findOne.mockResolvedValueOnce(null);
			const token = authService.generatePasswordResetToken(user);

			const resolvedUser = await authService.resolvePasswordResetToken(token);
			expect(resolvedUser).toBeUndefined();
		});

		it('should not return a user if the password sha does not match', async () => {
			const token = authService.generatePasswordResetToken(user);
			const updatedUser = Object.create(user);
			updatedUser.password = 'something-else';
			userRepository.findOne.mockResolvedValueOnce(updatedUser);

			const resolvedUser = await authService.resolvePasswordResetToken(token);
			expect(resolvedUser).toBeUndefined();
		});

		it('should not return the user if all checks pass', async () => {
			const token = authService.generatePasswordResetToken(user);
			userRepository.findOne.mockResolvedValueOnce(user);

			const resolvedUser = await authService.resolvePasswordResetToken(token);
			expect(resolvedUser).toEqual(user);
		});
	});

	describe('invalidateToken', () => {
		const req = mock<AuthenticatedRequest>({
			cookies: {
				[AUTH_COOKIE_NAME]: validToken,
			},
		});

		it('should invalidate the token', async () => {
			await authService.invalidateToken(req);

			expect(invalidAuthTokenRepository.insert).toHaveBeenCalledWith({
				token: validToken,
				expiresAt: new Date('2024-02-08T01:23:45.000Z'),
			});
		});
	});
});
