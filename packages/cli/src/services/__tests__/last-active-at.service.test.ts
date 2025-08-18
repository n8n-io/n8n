import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { AuthenticatedRequest, User, UserRepository } from '@n8n/db';
import type { NextFunction, Response } from 'express';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';

import { LastActiveAtService } from '@/services/last-active-at.service';

describe('LastActiveAtService', () => {
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
			user,
		});
		const res = mock<Response>();
		const next = jest.fn() as NextFunction;

		beforeEach(() => {
			// reset the last active time cache (private variable)
			(lastActiveAtService as any).lastActiveCache = new Map();
			req.user = user;
		});

		it('should update last active time if user not in cache', async () => {
			await lastActiveAtService.middleware(req, res, next);

			expect(queryBuilderMock.update).toHaveBeenCalled();
			expect(queryBuilderMock.set).toHaveBeenCalledWith({ lastActiveAt: expect.any(Date) });
			expect(queryBuilderMock.where).toHaveBeenCalledWith('id = :id', { id: user.id });
			expect(queryBuilderMock.execute).toHaveBeenCalled();
		});

		it('should not update last active time if user is in cache', async () => {
			await lastActiveAtService.middleware(req, res, next);

			expect(queryBuilderMock.update).toHaveBeenCalled();
			expect(queryBuilderMock.set).toHaveBeenCalledWith({ lastActiveAt: expect.any(Date) });
			expect(queryBuilderMock.where).toHaveBeenCalledWith('id = :id', { id: user.id });
			expect(queryBuilderMock.execute).toHaveBeenCalled();

			// Call middleware again now that the user is in cache
			queryBuilderMock.execute.mockClear();
			await lastActiveAtService.middleware(req, res, next);

			expect(queryBuilderMock.execute).not.toHaveBeenCalled();
		});

		it('should update last active time if user is in cache but stale', async () => {
			// Call middleware once to set the initial last active time
			await lastActiveAtService.middleware(req, res, next);

			expect(queryBuilderMock.update).toHaveBeenCalled();
			expect(queryBuilderMock.set).toHaveBeenCalledWith({ lastActiveAt: expect.any(Date) });
			expect(queryBuilderMock.where).toHaveBeenCalledWith('id = :id', { id: user.id });
			expect(queryBuilderMock.execute).toHaveBeenCalled();

			queryBuilderMock.update.mockClear();
			queryBuilderMock.set.mockClear();
			queryBuilderMock.where.mockClear();
			queryBuilderMock.execute.mockClear();
			jest.advanceTimersByTime(24 * Time.hours.toMilliseconds);

			// Call middleware again now that the user is in cache with a stale last active time
			await lastActiveAtService.middleware(req, res, next);

			expect(queryBuilderMock.update).toHaveBeenCalled();
			expect(queryBuilderMock.set).toHaveBeenCalledWith({
				lastActiveAt: DateTime.fromJSDate(now).plus({ days: 1 }).startOf('day').toJSDate(),
			});
			expect(queryBuilderMock.where).toHaveBeenCalledWith('id = :id', { id: user.id });
			expect(queryBuilderMock.execute).toHaveBeenCalled();
		});
	});
});
