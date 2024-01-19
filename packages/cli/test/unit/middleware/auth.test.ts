import { v4 as uuid } from 'uuid';

import config from '@/config';
import { AUTH_COOKIE_NAME } from '@/constants';
import { License } from '@/License';
import { User } from '@/databases/entities/User';
import { issueJWT } from '@/auth/jwt';
import { refreshExpiringCookie } from '@/middlewares';

import { mockInstance } from '../../shared/mocking';

import type { AuthenticatedRequest } from '@/requests';
import type { Response } from 'express';

mockInstance(License);

describe('refreshExpiringCookie', () => {
	const oldDuration: number = config.get('userManagement.jwtSessionDurationHours');
	let mockUser: User;

	beforeEach(() => {
		mockUser = Object.assign(new User(), {
			id: uuid(),
			password: 'passwordHash',
			mfaEnabled: false,
			mfaSecret: 'test',
			mfaRecoveryCodes: ['test'],
			updatedAt: new Date(),
			authIdentities: [],
		});
	});

	afterEach(() => {
		config.set('userManagement.jwtSessionDuration', oldDuration);
	});

	it('does not do anything if the user is not authorized', async () => {
		const req = {} as AuthenticatedRequest;
		const res = { cookie: jest.fn() } as unknown as Response;
		const next = jest.fn();

		await refreshExpiringCookie(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(res.cookie).not.toHaveBeenCalled();
	});

	it('does not do anything if the cookie is still valid', async () => {
		config.set('userManagement.jwtSessionDurationHours', 73);
		const { token } = issueJWT(mockUser);

		const req = { cookies: { [AUTH_COOKIE_NAME]: token }, user: mockUser } as AuthenticatedRequest;
		const res = { cookie: jest.fn() } as unknown as Response;
		const next = jest.fn();
		await refreshExpiringCookie(req, res, next);
		expect(next).toHaveBeenCalledTimes(1);
		expect(res.cookie).not.toHaveBeenCalled();
	});

	it('refreshes the cookie if it has less than 3 days to live', async () => {
		config.set('userManagement.jwtSessionDurationHours', 71);
		const { token } = issueJWT(mockUser);
		const req = { cookies: { [AUTH_COOKIE_NAME]: token }, user: mockUser } as AuthenticatedRequest;
		const res = { cookie: jest.fn() } as unknown as Response;
		const next = jest.fn();

		await refreshExpiringCookie(req, res, next);
		expect(next).toHaveBeenCalledTimes(1);
		expect(res.cookie).toHaveBeenCalledTimes(1);
	});
});
