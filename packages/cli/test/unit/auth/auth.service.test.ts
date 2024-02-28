import jwt from 'jsonwebtoken';
import { mock } from 'jest-mock-extended';
import { type NextFunction, type Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { AUTH_COOKIE_NAME, Time } from '@/constants';
import type { User } from '@db/entities/User';
import type { UserRepository } from '@db/repositories/user.repository';
import { JwtService } from '@/services/jwt.service';
import type { UrlService } from '@/services/url.service';
import type { AuthenticatedRequest } from '@/requests';

describe('AuthService', () => {
	config.set('userManagement.jwtSecret', 'random-secret');

	const userData = {
		id: '123',
		email: 'test@example.com',
		password: 'passwordHash',
		disabled: false,
		mfaEnabled: false,
	};
	const validToken =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInBhc3N3b3JkIjoiMzE1MTNjNWE5ZTNjNWFmZTVjMDZkNTY3NWFjZTc0ZThiYzNmYWRkOTc0NGFiNWQ4OWMzMTFmMmE2MmNjYmQzOSIsImlhdCI6MTcwNjc1MDYyNSwiZXhwIjoxNzA3MzU1NDI1fQ.mtXKUwQDHOhiHn0YNuCeybmxevtNG6LXTAv_sQL63Zc';

	const user = mock<User>(userData);
	const jwtService = new JwtService(mock());
	const urlService = mock<UrlService>();
	const userRepository = mock<UserRepository>();
	const authService = new AuthService(mock(), mock(), jwtService, urlService, userRepository);

	jest.useFakeTimers();
	const now = new Date('2024-02-01T01:23:45.678Z');
	beforeEach(() => {
		jest.clearAllMocks();
		jest.setSystemTime(now);
		config.set('userManagement.jwtSessionDurationHours', 168);
		config.set('userManagement.jwtRefreshTimeoutHours', 0);
	});

	describe('authMiddleware', () => {
		const req = mock<AuthenticatedRequest>({ cookies: {}, user: undefined });
		const res = mock<Response>();
		const next = jest.fn() as NextFunction;

		beforeEach(() => {
			res.status.mockReturnThis();
		});

		it('should 401 if no cookie is set', async () => {
			req.cookies[AUTH_COOKIE_NAME] = undefined;
			await authService.authMiddleware(req, res, next);
			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(401);
		});

		it('should 401 and clear the cookie if the JWT is expired', async () => {
			req.cookies[AUTH_COOKIE_NAME] = validToken;
			jest.advanceTimersByTime(365 * Time.days.toMilliseconds);

			await authService.authMiddleware(req, res, next);
			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.clearCookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME);
		});

		it('should refresh the cookie before it expires', async () => {
			req.cookies[AUTH_COOKIE_NAME] = validToken;
			jest.advanceTimersByTime(6 * Time.days.toMilliseconds);
			userRepository.findOne.mockResolvedValue(user);

			await authService.authMiddleware(req, res, next);
			expect(next).toHaveBeenCalled();
			expect(res.cookie).toHaveBeenCalledWith('n8n-auth', expect.any(String), {
				httpOnly: true,
				maxAge: 604800000,
				sameSite: 'lax',
			});
		});
	});

	describe('issueJWT', () => {
		describe('when not setting userManagement.jwtSessionDuration', () => {
			it('should default to expire in 7 days', () => {
				const defaultInSeconds = 7 * Time.days.toSeconds;
				const token = authService.issueJWT(user);

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
				config.set('userManagement.jwtSessionDurationHours', testDurationHours);
				const token = authService.issueJWT(user);

				const decodedToken = jwtService.verify(token);
				if (decodedToken.exp === undefined || decodedToken.iat === undefined) {
					fail('Expected exp and iat to be defined on decodedToken');
				}
				expect(decodedToken.exp - decodedToken.iat).toBe(testDurationSeconds);
			});
		});
	});

	describe('resolveJwt', () => {
		const res = mock<Response>();

		it('should throw on invalid tokens', async () => {
			await expect(authService.resolveJwt('random-string', res)).rejects.toThrow('jwt malformed');
			expect(res.cookie).not.toHaveBeenCalled();
		});

		it('should throw on expired tokens', async () => {
			jest.advanceTimersByTime(365 * Time.days.toMilliseconds);

			await expect(authService.resolveJwt(validToken, res)).rejects.toThrow('jwt expired');
			expect(res.cookie).not.toHaveBeenCalled();
		});

		it('should throw on tampered tokens', async () => {
			const [header, payload, signature] = validToken.split('.');
			const tamperedToken = [header, payload, signature + '123'].join('.');
			await expect(authService.resolveJwt(tamperedToken, res)).rejects.toThrow('invalid signature');
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
		])('should throw if %s', async (_, data) => {
			userRepository.findOne.mockResolvedValueOnce(data && mock<User>(data));
			await expect(authService.resolveJwt(validToken, res)).rejects.toThrow('Unauthorized');
			expect(res.cookie).not.toHaveBeenCalled();
		});

		it('should refresh the cookie before it expires', async () => {
			userRepository.findOne.mockResolvedValue(user);
			expect(await authService.resolveJwt(validToken, res)).toEqual(user);
			expect(res.cookie).not.toHaveBeenCalled();

			jest.advanceTimersByTime(6 * Time.days.toMilliseconds); // 6 Days
			expect(await authService.resolveJwt(validToken, res)).toEqual(user);
			expect(res.cookie).toHaveBeenCalledWith('n8n-auth', expect.any(String), {
				httpOnly: true,
				maxAge: 604800000,
				sameSite: 'lax',
			});
		});

		it('should refresh the cookie only if less than 1/4th of time is left', async () => {
			userRepository.findOne.mockResolvedValue(user);
			expect(await authService.resolveJwt(validToken, res)).toEqual(user);
			expect(res.cookie).not.toHaveBeenCalled();

			jest.advanceTimersByTime(5 * Time.days.toMilliseconds);
			expect(await authService.resolveJwt(validToken, res)).toEqual(user);
			expect(res.cookie).not.toHaveBeenCalled();

			jest.advanceTimersByTime(1 * Time.days.toMilliseconds);
			expect(await authService.resolveJwt(validToken, res)).toEqual(user);
			expect(res.cookie).toHaveBeenCalled();
		});

		it('should not refresh the cookie if jwtRefreshTimeoutHours is set to -1', async () => {
			config.set('userManagement.jwtRefreshTimeoutHours', -1);

			userRepository.findOne.mockResolvedValue(user);
			expect(await authService.resolveJwt(validToken, res)).toEqual(user);
			expect(res.cookie).not.toHaveBeenCalled();

			jest.advanceTimersByTime(6 * Time.days.toMilliseconds); // 6 Days
			expect(await authService.resolveJwt(validToken, res)).toEqual(user);
			expect(res.cookie).not.toHaveBeenCalled();
		});
	});

	describe('generatePasswordResetUrl', () => {
		it('should generate a valid url', () => {
			urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.instance');
			const url = authService.generatePasswordResetUrl(user);
			expect(url).toEqual(
				'https://n8n.instance/change-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJwYXNzd29yZFNoYSI6IjMxNTEzYzVhOWUzYzVhZmU1YzA2ZDU2NzVhY2U3NGU4YmMzZmFkZDk3NDRhYjVkODljMzExZjJhNjJjY2JkMzkiLCJpYXQiOjE3MDY3NTA2MjUsImV4cCI6MTcwNjc1MTgyNX0.wsdEpbK2zhFucaPwga7f8EOcwiJcv0iW23HcnvJs-s8&mfaEnabled=false',
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
			expect(decoded.passwordSha).toEqual(
				'31513c5a9e3c5afe5c06d5675ace74e8bc3fadd9744ab5d89c311f2a62ccbd39',
			);
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
});
