import { mock } from 'jest-mock-extended';

import config from '@/config';
import { AUTH_COOKIE_NAME, Time } from '@/constants';
import { License } from '@/License';
import { issueJWT } from '@/auth/jwt';
import { refreshExpiringCookie } from '@/middlewares';

import { mockInstance } from '../../shared/mocking';

import type { AuthenticatedRequest } from '@/requests';
import type { NextFunction, Response } from 'express';
import type { User } from '@/databases/entities/User';

mockInstance(License);

jest.useFakeTimers();

describe('refreshExpiringCookie', () => {
	const oldDuration = config.getEnv('userManagement.jwtSessionDurationHours');
	const oldTimeout = config.getEnv('userManagement.jwtRefreshTimeoutHours');
	let mockUser: User;

	beforeEach(() => {
		mockUser = mock<User>({ password: 'passwordHash' });
	});

	afterEach(() => {
		config.set('userManagement.jwtSessionDuration', oldDuration);
		config.set('userManagement.jwtRefreshTimeoutHours', oldTimeout);
	});

	it('does not do anything if the user is not authorized', async () => {
		const req = mock<AuthenticatedRequest>();
		const res = mock<Response>({ cookie: jest.fn() });
		const next = jest.fn();

		await refreshExpiringCookie(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(res.cookie).not.toHaveBeenCalled();
	});

	describe('with N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS=-1', () => {
		it('does not refresh the cookie, ever', async () => {
			config.set('userManagement.jwtSessionDurationHours', 1);
			config.set('userManagement.jwtRefreshTimeoutHours', -1);
			const { token } = issueJWT(mockUser);

			jest.advanceTimersByTime(1000 * 60 * 55); /* 55 minutes */

			const req = mock<AuthenticatedRequest>({
				cookies: { [AUTH_COOKIE_NAME]: token },
				user: mockUser,
			});
			const res = mock<Response>({ cookie: jest.fn() });
			const next = jest.fn();
			await refreshExpiringCookie(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(res.cookie).not.toHaveBeenCalled();
		});
	});

	describe('with N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS=0', () => {
		let token: string;
		let req: AuthenticatedRequest;
		let res: Response;
		let next: NextFunction;

		beforeEach(() => {
			// ARRANGE
			config.set('userManagement.jwtSessionDurationHours', 1);
			config.set('userManagement.jwtRefreshTimeoutHours', 0);
			token = issueJWT(mockUser).token;

			req = mock<AuthenticatedRequest>({
				cookies: { [AUTH_COOKIE_NAME]: token },
				user: mockUser,
			});
			res = mock<Response>({ cookie: jest.fn() });
			next = jest.fn();
		});

		it('does not refresh the cookie when more than 1/4th of time is left', async () => {
			// ARRANGE
			jest.advanceTimersByTime(44 * Time.minutes.toMilliseconds); /* 44 minutes */

			// ACT
			await refreshExpiringCookie(req, res, next);

			// ASSERT
			expect(next).toHaveBeenCalledTimes(1);
			expect(res.cookie).not.toHaveBeenCalled();
		});

		it('refreshes the cookie when 1/4th of time is left', async () => {
			// ARRANGE
			jest.advanceTimersByTime(46 * Time.minutes.toMilliseconds); /* 46 minutes */

			// ACT
			await refreshExpiringCookie(req, res, next);

			// ASSERT
			expect(next).toHaveBeenCalledTimes(1);
			expect(res.cookie).toHaveBeenCalledTimes(1);
		});
	});

	describe('with N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS=50', () => {
		const jwtSessionDurationHours = 51;
		let token: string;
		let req: AuthenticatedRequest;
		let res: Response;
		let next: NextFunction;

		// ARRANGE
		beforeEach(() => {
			config.set('userManagement.jwtSessionDurationHours', jwtSessionDurationHours);
			config.set('userManagement.jwtRefreshTimeoutHours', 50);

			token = issueJWT(mockUser).token;
			req = mock<AuthenticatedRequest>({
				cookies: { [AUTH_COOKIE_NAME]: token },
				user: mockUser,
			});
			res = mock<Response>({ cookie: jest.fn() });
			next = jest.fn();
		});

		it('does not do anything if the cookie is still valid', async () => {
			// ARRANGE
			// cookie has 50.5 hours to live: 51 - 0.5
			jest.advanceTimersByTime(30 * Time.minutes.toMilliseconds);

			// ACT
			await refreshExpiringCookie(req, res, next);

			// ASSERT
			expect(next).toHaveBeenCalledTimes(1);
			expect(res.cookie).not.toHaveBeenCalled();
		});

		it('refreshes the cookie if it has less than 50 hours to live', async () => {
			// ARRANGE
			// cookie has 49.5 hours to live: 51 - 1.5
			jest.advanceTimersByTime(1.5 * Time.hours.toMilliseconds);

			// ACT
			await refreshExpiringCookie(req, res, next);

			// ASSERT
			expect(next).toHaveBeenCalledTimes(1);
			expect(res.cookie).toHaveBeenCalledTimes(1);
			expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, expect.any(String), {
				httpOnly: true,
				maxAge: jwtSessionDurationHours * Time.hours.toMilliseconds,
				sameSite: 'lax',
			});
		});
	});
});
