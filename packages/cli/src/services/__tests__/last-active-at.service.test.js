'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const constants_1 = require('@n8n/constants');
const jest_mock_extended_1 = require('jest-mock-extended');
const luxon_1 = require('luxon');
const last_active_at_service_1 = require('@/services/last-active-at.service');
describe('LastActiveAtService', () => {
	const userData = {
		id: '123',
		email: 'test@example.com',
		password: 'passwordHash',
		disabled: false,
		mfaEnabled: false,
	};
	const user = (0, jest_mock_extended_1.mock)(userData);
	const globalConfig = (0, jest_mock_extended_1.mock)({
		auth: { cookie: { secure: true, samesite: 'lax' } },
	});
	let queryBuilderMock = {
		update: jest.fn().mockReturnThis(),
		set: jest.fn().mockReturnThis(),
		where: jest.fn().mockReturnThis(),
		execute: jest.fn(),
	};
	const userRepository = (0, jest_mock_extended_1.mock)();
	const lastActiveAtService = new last_active_at_service_1.LastActiveAtService(
		userRepository,
		(0, backend_test_utils_1.mockLogger)(),
	);
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
		userRepository.createQueryBuilder.mockReturnValue(queryBuilderMock);
	});
	describe('middleware', () => {
		const req = (0, jest_mock_extended_1.mock)({
			user,
		});
		const res = (0, jest_mock_extended_1.mock)();
		const next = jest.fn();
		beforeEach(() => {
			lastActiveAtService.lastActiveCache = new Map();
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
			queryBuilderMock.execute.mockClear();
			await lastActiveAtService.middleware(req, res, next);
			expect(queryBuilderMock.execute).not.toHaveBeenCalled();
		});
		it('should update last active time if user is in cache but stale', async () => {
			await lastActiveAtService.middleware(req, res, next);
			expect(queryBuilderMock.update).toHaveBeenCalled();
			expect(queryBuilderMock.set).toHaveBeenCalledWith({ lastActiveAt: expect.any(Date) });
			expect(queryBuilderMock.where).toHaveBeenCalledWith('id = :id', { id: user.id });
			expect(queryBuilderMock.execute).toHaveBeenCalled();
			queryBuilderMock.update.mockClear();
			queryBuilderMock.set.mockClear();
			queryBuilderMock.where.mockClear();
			queryBuilderMock.execute.mockClear();
			jest.advanceTimersByTime(24 * constants_1.Time.hours.toMilliseconds);
			await lastActiveAtService.middleware(req, res, next);
			expect(queryBuilderMock.update).toHaveBeenCalled();
			expect(queryBuilderMock.set).toHaveBeenCalledWith({
				lastActiveAt: luxon_1.DateTime.fromJSDate(now).plus({ days: 1 }).startOf('day').toJSDate(),
			});
			expect(queryBuilderMock.where).toHaveBeenCalledWith('id = :id', { id: user.id });
			expect(queryBuilderMock.execute).toHaveBeenCalled();
		});
	});
});
//# sourceMappingURL=last-active-at.service.test.js.map
