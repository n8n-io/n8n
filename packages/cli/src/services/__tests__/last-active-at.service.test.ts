import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import type { UserRepository } from '@n8n/db';
import type { NextFunction, Response } from 'express';
import { mock } from 'jest-mock-extended';

import config from '@/config';
import { AUTH_COOKIE_NAME, Time } from '@/constants';
import type { AuthenticatedRequest } from '@/requests';
import { LastActiveAtService } from '@/services/last-active-at.service';

describe('LastActiveAtService', () => {
	config.set('userManagement.jwtSecret', 'random-secret');

	const browserId = 'test-browser-id';
	const userData = {
		id: '123',
		email: 'test@example.com',
		password: 'passwordHash',
		disabled: false,
		mfaEnabled: false,
	};
	const user = mock<User>(userData);
	const globalConfig = mock<GlobalConfig>({ auth: { cookie: { secure: true, samesite: 'lax' } } });
	let queryBuilderMock = {
		update: jest.fn().mockReturnThis(),
		set: jest.fn().mockReturnThis(),
		where: jest.fn().mockReturnThis(),
		execute: jest.fn(),
	};

	const userRepository = mock<UserRepository>();

	const lastActiveAtService = new LastActiveAtService(userRepository, mockLogger());

	const now = new Date('2024-02-01T01:23:45.678Z');
	jest.useFakeTimers({ now });

	const validToken =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImhhc2giOiJtSkFZeDRXYjdrIiwiYnJvd3NlcklkIjoiOFpDVXE1YU1uSFhnMFZvcURLcm9hMHNaZ0NwdWlPQ1AzLzB2UmZKUXU0MD0iLCJpYXQiOjE3MDY3NTA2MjUsImV4cCI6MTcwNzM1NTQyNX0.YE-ZGGIQRNQ4DzUe9rjXvOOFFN9ufU34WibsCxAsc4o'; // Generated using `authService.issueJWT(user, browserId)`

	beforeEach(() => {
		jest.resetAllMocks();
		jest.setSystemTime(now);
		globalConfig.auth.cookie = { secure: true, samesite: 'lax' };
		queryBuilderMock = {
			update: jest.fn().mockReturnThis(),
			set: jest.fn().mockReturnThis(),
			where: jest.fn().mockReturnThis(),
			execute: jest.fn(),
		};
		(userRepository.createQueryBuilder as jest.Mock).mockReturnValue(queryBuilderMock);
	});

	describe('middleware', () => {
		const req = mock<AuthenticatedRequest>({
			cookies: {},
			user,
			browserId,
		});
		const res = mock<Response>();
		const next = jest.fn() as NextFunction;

		beforeEach(() => {
			// reset the last active time cache (private variable)
			(lastActiveAtService as any).lastActiveCache = new Map();
			res.status.mockReturnThis();
		});

		it('should update last active time if user not in cache', async () => {
			req.cookies[AUTH_COOKIE_NAME] = validToken;

			let finishCallback: (() => Promise<void>) | undefined;
			res.on.mockImplementation((event, cb: () => Promise<void>) => {
				if (event === 'finish') finishCallback = cb;
				return res;
			});

			await lastActiveAtService.middleware(req, res, next);
			if (finishCallback) await finishCallback();

			expect(queryBuilderMock.update).toHaveBeenCalled();
			expect(queryBuilderMock.set).toHaveBeenCalledWith({ lastActiveAt: expect.any(Date) });
			expect(queryBuilderMock.where).toHaveBeenCalledWith('id = :id', { id: user.id });
			expect(queryBuilderMock.execute).toHaveBeenCalled();
		});

		it('should not update last active time if user is in cache', async () => {
			let finishCallback: (() => Promise<void>) | undefined;
			res.on.mockImplementation((event, cb: () => Promise<void>) => {
				if (event === 'finish') finishCallback = cb;
				return res;
			});

			await lastActiveAtService.middleware(req, res, next);
			if (finishCallback) await finishCallback();

			expect(queryBuilderMock.update).toHaveBeenCalled();
			expect(queryBuilderMock.set).toHaveBeenCalledWith({ lastActiveAt: expect.any(Date) });
			expect(queryBuilderMock.where).toHaveBeenCalledWith('id = :id', { id: user.id });
			expect(queryBuilderMock.execute).toHaveBeenCalled();

			// Call middleware again now that the user is in cache
			queryBuilderMock.execute.mockClear();
			await lastActiveAtService.middleware(req, res, next);
			if (finishCallback) await finishCallback();

			expect(queryBuilderMock.execute).not.toHaveBeenCalled();
		});

		it('should update last active time if user is in cache but stale', async () => {
			// Simulate the user being in the cache
			let finishCallback: (() => Promise<void>) | undefined;
			res.on.mockImplementation((event, cb: () => Promise<void>) => {
				if (event === 'finish') finishCallback = cb;
				return res;
			});

			await lastActiveAtService.middleware(req, res, next);
			if (finishCallback) await finishCallback();

			expect(queryBuilderMock.update).toHaveBeenCalled();
			expect(queryBuilderMock.set).toHaveBeenCalledWith({ lastActiveAt: expect.any(Date) });
			expect(queryBuilderMock.where).toHaveBeenCalledWith('id = :id', { id: user.id });
			expect(queryBuilderMock.execute).toHaveBeenCalled();

			queryBuilderMock.update.mockClear();
			queryBuilderMock.set.mockClear();
			queryBuilderMock.where.mockClear();
			queryBuilderMock.execute.mockClear();
			jest.advanceTimersByTime(2 * Time.hours.toMilliseconds);

			// Call middleware again now that the user is in cache with a stale last active time
			await lastActiveAtService.middleware(req, res, next);
			if (finishCallback) await finishCallback();

			expect(queryBuilderMock.update).toHaveBeenCalled();
			expect(queryBuilderMock.set).toHaveBeenCalledWith({
				lastActiveAt: new Date(now.getTime() + 2 * Time.hours.toMilliseconds),
			});
			expect(queryBuilderMock.where).toHaveBeenCalledWith('id = :id', { id: user.id });
			expect(queryBuilderMock.execute).toHaveBeenCalled();
		});
	});
});
